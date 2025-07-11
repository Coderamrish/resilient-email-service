import MockEmailProvider1 from "../providers/MockEmailProvider1.js";
import MockEmailProvider2 from "../providers/MockEmailProvider2.js";
import CircuitBreaker from "../utils/CircuitBreaker.js";
import RateLimiter from "../utils/RateLimiter.js";
import Logger from "../utils/Logger.js";
import EmailQueue from "../utils/Emailqueue.js";

export default class EmailService {
  constructor(options = {}) {
    this.providers = [
      new MockEmailProvider1("Provider1"),
      new MockEmailProvider2("Provider2"),
    ];

    this.currentProviderIndex = 0;
    this.maxRetries = options.maxRetries || 3;
    this.initialRetryDelay = options.initialRetryDelay || 1000;
    this.maxRetryDelay = options.maxRetryDelay || 30000;

    this.circuitBreakers = this.providers.map(
      (provider, index) =>
        new CircuitBreaker({
          threshold: 5,
          timeout: 60000,
          onStateChange: (state) => {
            Logger.info(
              `Circuit breaker for ${provider.name} changed to: ${state}`
            );
          },
        })
    );

    this.rateLimiter = new RateLimiter(100, 60000);

    this.sentEmails = new Set();

    this.emailStatuses = new Map();

    this.emailQueue = new EmailQueue();

    Logger.info(
      "EmailService initialized with providers:",
      this.providers.map((p) => p.name)
    );
  }

  async sendEmail(emailData) {
    const emailId = emailData.id || this.generateEmailId(emailData);

    if (this.sentEmails.has(emailId)) {
      Logger.warn(`Email ${emailId} already sent (idempotency check)`);
      return {
        success: true,
        emailId,
        status: "already_sent",
        message: "Email already sent (idempotency check)",
      };
    }

    if (!this.rateLimiter.allowRequest()) {
      const status = {
        success: false,
        emailId,
        status: "rate_limited",
        message: "Rate limit exceeded",
        timestamp: new Date().toISOString(),
      };
      this.emailStatuses.set(emailId, status);
      Logger.warn(`Email ${emailId} rate limited`);
      return status;
    }

    const initialStatus = {
      success: false,
      emailId,
      status: "processing",
      attempts: [],
      timestamp: new Date().toISOString(),
    };
    this.emailStatuses.set(emailId, initialStatus);

    Logger.info(`Starting email send process for ${emailId}`);

    try {
      const result = await this.sendWithRetryAndFallback(emailData, emailId);

      if (result.success) {
        this.sentEmails.add(emailId);
        Logger.info(`Email ${emailId} sent successfully`);
      }

      const finalStatus = {
        ...result,
        emailId,
        attempts: this.emailStatuses.get(emailId).attempts,
        timestamp: new Date().toISOString(),
      };
      this.emailStatuses.set(emailId, finalStatus);

      return finalStatus;
    } catch (error) {
      const errorStatus = {
        success: false,
        emailId,
        status: "failed",
        message: error.message,
        attempts: this.emailStatuses.get(emailId).attempts,
        timestamp: new Date().toISOString(),
      };
      this.emailStatuses.set(emailId, errorStatus);
      Logger.error(`Email ${emailId} failed:`, error.message);
      return errorStatus;
    }
  }

  async queueEmail(emailData) {
    const emailId = emailData.id || this.generateEmailId(emailData);
    await this.emailQueue.add(emailData);
    Logger.info(`Email ${emailId} added to queue`);
    return emailId;
  }

  async processQueue() {
    Logger.info("Processing email queue...");

    while (!this.emailQueue.isEmpty()) {
      const emailData = await this.emailQueue.next();
      if (emailData) {
        try {
          await this.sendEmail(emailData);
        } catch (error) {
          Logger.error("Error processing queued email:", error.message);
        }
      }
    }

    Logger.info("Email queue processing completed");
  }

  async sendWithRetryAndFallback(emailData, emailId) {
    let lastError;
    let providersAttempted = 0;

    for (
      let providerIndex = 0;
      providerIndex < this.providers.length;
      providerIndex++
    ) {
      const actualProviderIndex =
        (this.currentProviderIndex + providerIndex) % this.providers.length;
      const provider = this.providers[actualProviderIndex];
      const circuitBreaker = this.circuitBreakers[actualProviderIndex];

      if (circuitBreaker.isOpen()) {
        Logger.warn(`Skipping ${provider.name} - circuit breaker is open`);

        const currentStatus = this.emailStatuses.get(emailId);
        currentStatus.attempts.push({
          provider: provider.name,
          attempt: 0,
          timestamp: new Date().toISOString(),
          status: "skipped",
          error: "Circuit breaker is open",
        });
        continue;
      }

      providersAttempted++;
      Logger.info(`Attempting to send email ${emailId} with ${provider.name}`);

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const attemptInfo = {
            provider: provider.name,
            attempt,
            timestamp: new Date().toISOString(),
          };

          const currentStatus = this.emailStatuses.get(emailId);
          currentStatus.attempts.push({ ...attemptInfo, status: "attempting" });

          const result = await circuitBreaker.call(() =>
            provider.sendEmail(emailData)
          );

          attemptInfo.status = "success";
          currentStatus.attempts[currentStatus.attempts.length - 1] =
            attemptInfo;

          this.currentProviderIndex = actualProviderIndex;

          return {
            success: true,
            status: "sent",
            provider: provider.name,
            message: `Email sent successfully via ${provider.name}`,
            messageId: result.messageId,
          };
        } catch (error) {
          lastError = error;

          const currentStatus = this.emailStatuses.get(emailId);
          currentStatus.attempts[currentStatus.attempts.length - 1].status =
            "failed";
          currentStatus.attempts[currentStatus.attempts.length - 1].error =
            error.message;

          Logger.warn(
            `Attempt ${attempt} failed for ${provider.name}:`,
            error.message
          );

          if (attempt < this.maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            Logger.info(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }

      Logger.warn(
        `All attempts failed for ${provider.name}, trying next provider...`
      );
    }

    if (providersAttempted === 0) {
      throw new Error("All providers are unavailable (circuit breakers open)");
    }

    throw new Error(
      `All providers failed. Last error: ${
        lastError?.message || "Unknown error"
      }`
    );
  }

  calculateRetryDelay(attempt) {
    const delay = this.initialRetryDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxRetryDelay);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateEmailId(emailData) {
    const content = `${emailData.to}-${emailData.subject}-${Date.now()}`;
    return btoa(content).slice(0, 16);
  }

  getEmailStatus(emailId) {
    return this.emailStatuses.get(emailId) || null;
  }

  getAllEmailStatuses() {
    return Array.from(this.emailStatuses.values());
  }

  getServiceHealth() {
    return {
      providers: this.providers.map((provider, index) => ({
        name: provider.name,
        circuitBreakerState: this.circuitBreakers[index].getState(),
        healthy: !this.circuitBreakers[index].isOpen(),
      })),
      rateLimiter: {
        requestsInWindow: this.rateLimiter.getRequestCount(),
        limit: this.rateLimiter.limit,
        windowMs: this.rateLimiter.windowMs,
      },
      queue: {
        size: this.emailQueue.size(),
        isEmpty: this.emailQueue.isEmpty(),
      },
      totalEmailsSent: this.sentEmails.size,
      totalEmailsTracked: this.emailStatuses.size,
    };
  }

  reset() {
    this.sentEmails.clear();
    this.emailStatuses.clear();
    this.circuitBreakers.forEach((cb) => cb.reset());
    this.rateLimiter.reset();
    this.emailQueue.clear();
    this.currentProviderIndex = 0;
    Logger.info("EmailService reset completed");
  }
}