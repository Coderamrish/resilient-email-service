export default class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.onStateChange = options.onStateChange || (() => {});

    this.failureCount = 0;
    this.state = "CLOSED";
    this.nextAttempt = null;
    this.lastFailureTime = null;
  }

  async call(fn) {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        throw new Error("Circuit breaker is OPEN");
      } else {
        this.state = "HALF_OPEN";
        this.onStateChange(this.state);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      this.failureCount = 0;
      this.onStateChange(this.state);
    } else if (this.state === "CLOSED") {
      this.failureCount = 0;
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.timeout;
      this.onStateChange(this.state);
    }
  }

  getState() {
    return this.state;
  }

  isOpen() {
    return this.state === "OPEN" && Date.now() < this.nextAttempt;
  }

  isClosed() {
    return this.state === "CLOSED";
  }

  isHalfOpen() {
    return this.state === "HALF_OPEN";
  }

  getFailureCount() {
    return this.failureCount;
  }

  getTimeUntilNextAttempt() {
    if (this.state !== "OPEN") return 0;
    return Math.max(0, this.nextAttempt - Date.now());
  }

  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.nextAttempt = null;
    this.lastFailureTime = null;
    this.onStateChange(this.state);
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.threshold,
      timeout: this.timeout,
      lastFailureTime: this.lastFailureTime,
      timeUntilNextAttempt: this.getTimeUntilNextAttempt(),
    };
  }
}