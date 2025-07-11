export default class MockEmailProvider2 {
  constructor(name = "MockProvider2") {
    this.name = name;
    this.failureRate = 0.15;
    this.latencyMin = 200;
    this.latencyMax = 800;
  }

  async sendEmail(emailData) {
    this.validateEmailData(emailData);

    const latency =
      Math.random() * (this.latencyMax - this.latencyMin) + this.latencyMin;
    await this.sleep(latency);

    if (Math.random() < this.failureRate) {
      const errorMessages = [
        "SMTP connection failed",
        "Quota exceeded",
        "Blacklisted recipient",
        "Internal server error",
        "DNS resolution failed",
        "SSL handshake failed",
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

    if (emailData.subject.length > 200) {
      throw new Error(`${this.name}: Subject too long (max 200 characters)`);
    }

    if (emailData.body.length > 10000) {
      throw new Error(`${this.name}: Body too long (max 10000 characters)`);
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