/**
 * Mock Email Provider 1
 * 
 * Simulates a reliable email provider with occasional failures
 */

export default class MockEmailProvider1 {
  constructor(name = 'MockProvider1') {
    this.name = name;
    this.failureRate = 0.1; // 10% failure rate
    this.latencyMin = 100; // Minimum latency in ms
    this.latencyMax = 500; // Maximum latency in ms
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
        'Network timeout',
        'Authentication failed',
        'Invalid recipient',
        'Service temporarily unavailable',
        'Rate limit exceeded by provider'
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