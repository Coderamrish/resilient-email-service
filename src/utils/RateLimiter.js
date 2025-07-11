export default class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.requests = [];
  }

  allowRequest() {
    const now = Date.now();

    this.cleanupOldRequests(now);

    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  cleanupOldRequests(now) {
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(
      (timestamp) => timestamp > windowStart
    );
  }

  getRequestCount() {
    this.cleanupOldRequests(Date.now());
    return this.requests.length;
  }

  getRemainingRequests() {
    return Math.max(0, this.limit - this.getRequestCount());
  }

  getTimeUntilReset() {
    if (this.requests.length === 0) return 0;

    const now = Date.now();
    const oldestRequest = this.requests[0];
    const windowEnd = oldestRequest + this.windowMs;

    return Math.max(0, windowEnd - now);
  }

  isLimitExceeded() {
    return this.getRequestCount() >= this.limit;
  }

  reset() {
    this.requests = [];
  }

  getStats() {
    const requestCount = this.getRequestCount();
    return {
      limit: this.limit,
      windowMs: this.windowMs,
      currentRequests: requestCount,
      remainingRequests: this.getRemainingRequests(),
      isLimitExceeded: this.isLimitExceeded(),
      timeUntilReset: this.getTimeUntilReset(),
      utilizationPercentage: Math.round((requestCount / this.limit) * 100),
    };
  }

  configure(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
  }
}