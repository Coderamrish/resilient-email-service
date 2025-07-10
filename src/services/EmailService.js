/**
 * Resilient Email Service
 * 
 * A robust email sending service with retry logic, fallback mechanisms,
 * idempotency, rate limiting, and status tracking.
 */

import MockEmailProvider1 from '../providers/MockEmailProvider1.js';
import MockEmailProvider2 from '../providers/MockEmailProvider2.js';
import CircuitBreaker from '../utils/CircuitBreaker.js';
import RateLimiter from '../utils/RateLimiter.js';
import Logger from '../utils/Logger.js';
import EmailQueue from '../utils/Emailqueue.js';

export default class EmailService {
  constructor(options = {}) {
    this.providers = [
      new MockEmailProvider1('Provider1'),
      new MockEmailProvider2('Provider2')
    ];
    
    this.currentProviderIndex = 0;
    this.maxRetries = options.maxRetries || 3;
    this.initialRetryDelay = options.initialRetryDelay || 1000; // 1 second
    this.maxRetryDelay = options.maxRetryDelay || 30000; // 30 seconds
    
    // Circuit breakers for each provider
    this.circuitBreakers = this.providers.map((provider, index) => 
      new CircuitBreaker({
        threshold: 5,
        timeout: 60000, // 1 minute
        onStateChange: (state) => {
          Logger.info(`Circuit breaker for ${provider.name} changed to: ${state}`);
        }
      })
    );
    
    // Rate limiter (100 emails per minute)
    this.rateLimiter = new RateLimiter(100, 60000);
    
    // Idempotency tracking
    this.sentEmails = new Set();
    
    // Status tracking
    this.emailStatuses = new Map();
    
    // Email queue for async processing
    this.emailQueue = new EmailQueue();
    
    Logger.info('EmailService initialized with providers:', this.providers.map(p => p.name));
  }

  /**
   * Send an email with resilience features
   * @param {Object} emailData - Email data containing to, subject, body, and optional id
   * @returns {Promise<Object>} - Status object with success/failure information
   */
  async sendEmail(emailData) {
    const emailId = emailData.id || this.generateEmailId(emailData);
    
    // Check idempotency
    if (this.sentEmails.has(emailId)) {
      Logger.warn(`Email ${emailId} already sent (idempotency check)`);
      return {
        success: true,
        emailId,
        status: 'already_sent',
        message: 'Email already sent (idempotency check)'
      };
    }
    
    // Check rate limiting
    if (!this.rateLimiter.allowRequest()) {
      const status = {
        success: false,
        emailId,
        status: 'rate_limited',
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      };
      this.emailStatuses.set(emailId, status);
      Logger.warn(`Email ${emailId} rate limited`);
      return status;
    }
    
    // Initialize status tracking
    const initialStatus = {
      success: false,
      emailId,
      status: 'processing',
      attempts: [],
      timestamp: new Date().toISOString()
    };
    this.emailStatuses.set(emailId, initialStatus);
    
    Logger.info(`Starting email send process for ${emailId}`);
    
    try {
      const result = await this.sendWithRetryAndFallback(emailData, emailId);
      
      if (result.success) {
        this.sentEmails.add(emailId);
        Logger.info(`Email ${emailId} sent successfully`);
      }
      
      // Update final status
      const finalStatus = {
        ...result,
        emailId,
        attempts: this.emailStatuses.get(emailId).attempts,
        timestamp: new Date().toISOString()
      };
      this.emailStatuses.set(emailId, finalStatus);
      
      return finalStatus;
      
    } catch (error) {
      const errorStatus = {
        success: false,
        emailId,
        status: 'failed',
        message: error.message,
        attempts: this.emailStatuses.get(emailId).attempts,
        timestamp: new Date().toISOString()
      };
      this.emailStatuses.set(emailId, errorStatus);
      Logger.error(`Email ${emailId} failed:`, error.message);
      return errorStatus;
    }
  }

  /**
   * Add email to queue for async processing
   * @param {Object} emailData - Email data
   * @returns {Promise<string>} - Email ID
   */
  async queueEmail(emailData) {
    const emailId = emailData.id || this.generateEmailId(emailData);
    await this.emailQueue.add(emailData);
    Logger.info(`Email ${emailId} added to queue`);
    return emailId;
  }

  /**
   * Process queued emails
   */
  async processQueue() {
    Logger.info('Processing email queue...');
    
    while (!this.emailQueue.isEmpty()) {
      const emailData = await this.emailQueue.next();
      if (emailData) {
        try {
          await this.sendEmail(emailData);
        } catch (error) {
          Logger.error('Error processing queued email:', error.message);
        }
      }
    }
    
    Logger.info('Email queue processing completed');
  }

  /**
   * Send email with retry logic and provider fallback
   * @private
   */
  async sendWithRetryAndFallback(emailData, emailId) {
    let lastError;
    
    // Try each provider
    for (let providerIndex = 0; providerIndex < this.providers.length; providerIndex++) {
      const actualProviderIndex = (this.currentProviderIndex + providerIndex) % this.providers.length;
      const provider = this.providers[actualProviderIndex];
      const circuitBreaker = this.circuitBreakers[actualProviderIndex];
      
      // Skip if circuit breaker is open
      if (circuitBreaker.isOpen()) {
        Logger.warn(`Skipping ${provider.name} - circuit breaker is open`);
        continue;
      }
      
      Logger.info(`Attempting to send email ${emailId} with ${provider.name}`);
      
      // Retry logic for current provider
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const attemptInfo = {
            provider: provider.name,
            attempt,
            timestamp: new Date().toISOString()
          };
          
          // Record attempt
          const currentStatus = this.emailStatuses.get(emailId);
          currentStatus.attempts.push({ ...attemptInfo, status: 'attempting' });
          
          // Try to send with circuit breaker protection
          const result = await circuitBreaker.call(() => provider.sendEmail(emailData));
          
          // Success!
          attemptInfo.status = 'success';
          currentStatus.attempts[currentStatus.attempts.length - 1] = attemptInfo;
          
          // Update primary provider for next email
          this.currentProviderIndex = actualProviderIndex;
          
          return {
            success: true,
            status: 'sent',
            provider: provider.name,
            message: `Email sent successfully via ${provider.name}`,
            messageId: result.messageId
          };
          
        } catch (error) {
          lastError = error;
          
          // Record failed attempt
          const currentStatus = this.emailStatuses.get(emailId);
          currentStatus.attempts[currentStatus.attempts.length - 1].status = 'failed';
          currentStatus.attempts[currentStatus.attempts.length - 1].error = error.message;
          
          Logger.warn(`Attempt ${attempt} failed for ${provider.name}:`, error.message);
          
          // If not the last attempt, wait before retrying
          if (attempt < this.maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            Logger.info(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }
      
      Logger.warn(`All attempts failed for ${provider.name}, trying next provider...`);
    }
    
    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Calculate exponential backoff delay
   * @private
   */
  calculateRetryDelay(attempt) {
    const delay = this.initialRetryDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxRetryDelay);
  }

  /**
   * Sleep utility
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique email ID
   * @private
   */
  generateEmailId(emailData) {
    const content = `${emailData.to}-${emailData.subject}-${Date.now()}`;
    return btoa(content).slice(0, 16);
  }

  /**
   * Get email status by ID
   */
  getEmailStatus(emailId) {
    return this.emailStatuses.get(emailId) || null;
  }

  /**
   * Get all email statuses
   */
  getAllEmailStatuses() {
    return Array.from(this.emailStatuses.values());
  }

  /**
   * Get service health status
   */
  getServiceHealth() {
    return {
      providers: this.providers.map((provider, index) => ({
        name: provider.name,
        circuitBreakerState: this.circuitBreakers[index].getState(),
        healthy: !this.circuitBreakers[index].isOpen()
      })),
      rateLimiter: {
        requestsInWindow: this.rateLimiter.getRequestCount(),
        limit: this.rateLimiter.limit,
        windowMs: this.rateLimiter.windowMs
      },
      queue: {
        size: this.emailQueue.size(),
        isEmpty: this.emailQueue.isEmpty()
      },
      totalEmailsSent: this.sentEmails.size,
      totalEmailsTracked: this.emailStatuses.size
    };
  }

  /**
   * Reset service state (useful for testing)
   */
  reset() {
    this.sentEmails.clear();
    this.emailStatuses.clear();
    this.circuitBreakers.forEach(cb => cb.reset());
    this.rateLimiter.reset();
    this.emailQueue.clear();
    this.currentProviderIndex = 0;
    Logger.info('EmailService reset completed');
  }
}