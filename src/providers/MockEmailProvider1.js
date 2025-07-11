export default class MockEmailProvider1 {
  constructor(name = "MockProvider1") {
    this.name = name;
    this.failureRate = 0.1;
    this.latencyMin = 100;
    this.latencyMax = 500;
  }

  async sendEmail(emailData) {
    this.validateEmailData(emailData);

    const latency =
      Math.random() * (this.latencyMax - this.latencyMin) + this.latencyMin;
    await this.sleep(latency);

    if (Math.random() < this.failureRate) {
      const errorMessages = [
        "Network timeout",
        "Authentication failed",
        "Invalid recipient",
        "Service temporarily unavailable",
        "Rate limit exceeded by provider",
      ];
      const randomError =
        errorMessages[Math.floor(Math.random() * errorMessages.length)];
      throw new Error(`${this.name}: ${randomError}`);
    }

    const messageId = this.generateMessageId();

    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date().toISOString(),
      latency: Math.round(latency),
    };
  }

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

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateMessageId() {
    return `${this.name.toLowerCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      name: this.name,
      failureRate: this.failureRate,
      latencyRange: `${this.latencyMin}-${this.latencyMax}ms`,
      healthy: true,
    };
  }

  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setLatency(min, max) {
    this.latencyMin = Math.max(0, min);
    this.latencyMax = Math.max(this.latencyMin, max);
  }
}