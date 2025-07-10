/**
 * Mock Email Provider 2
 * 
 * Simulates a backup email provider with different characteristics
 */

export default class MockEmailProvider2 {
  constructor(name = 'MockProvider2') {
    this.name = name;
    this.failureRate = 0.15; // 15% failure rate (slightly higher than Provider1)
    this.latencyMin = 200; // Higher minimum latency
    this.latencyMax = 800; // Higher maximum latency
  }

  /**
   * Send email (mock implementation)
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Result object
   */
  async sendEmail(emailData) {
    // Validate email data
    this.validateEmailData(emailData);
    
    // Simulate network latency
    const latency = Math.random() * (this.latencyMax - this.latencyMin) + this.latencyMin;
    await this.sleep(latency);
    
    // Simulate random failures
    if (Math.random() < this.failureRate) {
      const errorMessages = [
        'SMTP connection failed',
        'Quota exceeded',
        'Blacklisted recipient',
        'Internal server error',
        'DNS resolution failed',
        'SSL handshake failed'
      ];
      const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      throw new Error(`${this.name}: ${randomError}`);
    }
    
    // Simulate successful send
    const messageId = this.generateMessageId();
    
    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date().toISOString(),
      latency: Math.round(latency)
    };
  }

  /**
   * Validate email data
   * @private
   */
  validateEmailData(emailData) {
    if (!emailData) {
      throw new Error(`${this.name}: Email data is required`);
    }
    
    if (!emailData.to || !this.isValidEmail(emailData.to)) {
      throw new Error(`${this.name}: Valid recipient email is required`);
    }
    
    if (!emailData.subject || emailData.subject.trim().length === 0) {
      throw new Error(`${this.name}: Subject is required`);
    }
    
    if (!emailData.body || emailData.body.trim().length === 0) {
      throw new Error(`${this.name}: Body is required`);
    }
    
    // Provider2 has additional validation
    if (emailData.subject.length > 200) {
      throw new Error(`${this.name}: Subject too long (max 200 characters)`);
    }
    
    if (emailData.body.length > 10000) {
      throw new Error(`${this.name}: Body too long (max 10000 characters)`);
    }
  }

  /**
   * Simple email validation
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate mock message ID
   * @private
   */
  generateMessageId() {
    return `${this.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      name: this.name,
      failureRate: this.failureRate,
      latencyRange: `${this.latencyMin}-${this.latencyMax}ms`,
      healthy: true
    };
  }

  /**
   * Configure failure rate for testing
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Configure latency for testing
   */
  setLatency(min, max) {
    this.latencyMin = Math.max(0, min);
    this.latencyMax = Math.max(this.latencyMin, max);
  }
}