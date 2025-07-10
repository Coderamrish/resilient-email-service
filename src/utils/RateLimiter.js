/**
 * Rate Limiter Implementation
 * 
 * Implements a sliding window rate limiter to control
 * the number of requests within a time window.
 */

export default class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit; // Maximum number of requests
    this.windowMs = windowMs; // Time window in milliseconds
    this.requests = []; // Array to store request timestamps
  }

  /**
   * Check if a request is allowed
   * @returns {boolean} - True if request is allowed, false otherwise
   */
  allowRequest() {
    const now = Date.now();
    
    // Remove old requests outside the current window
    this.cleanupOldRequests(now);
    
    // Check if we're within the limit
    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  /**
   * Remove requests older than the current window
   * @private
   * @param {number} now - Current timestamp
   */
  cleanupOldRequests(now) {
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);
  }

  /**
   * Get current number of requests in the window
   * @returns {number} - Number of requests in current window
   */
  getRequestCount() {
    this.cleanupOldRequests(Date.now());
    return this.requests.length;
  }

  /**
   * Get remaining requests in current window
   * @returns {number} - Number of remaining requests allowed
   */
  getRemainingRequests() {
    return Math.max(0, this.limit - this.getRequestCount());
  }

  /**
   * Get time until window reset (when oldest request expires)
   * @returns {number} - Time in milliseconds until window reset
   */
  getTimeUntilReset() {
    if (this.requests.length === 0) return 0;
    
    const now = Date.now();
    const oldestRequest = this.requests[0];
    const windowEnd = oldestRequest + this.windowMs;
    
    return Math.max(0, windowEnd - now);
  }

  /**
   * Check if rate limit is currently exceeded
   * @returns {boolean} - True if limit is exceeded
   */
  isLimitExceeded() {
    return this.getRequestCount() >= this.limit;
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.requests = [];
  }

  /**
   * Get rate limiter statistics
   * @returns {Object} - Statistics object
   */
  getStats() {
    const requestCount = this.getRequestCount();
    return {
      limit: this.limit,
      windowMs: this.windowMs,
      currentRequests: requestCount,
      remainingRequests: this.getRemainingRequests(),
      isLimitExceeded: this.isLimitExceeded(),
      timeUntilReset: this.getTimeUntilReset(),
      utilizationPercentage: Math.round((requestCount / this.limit) * 100)
    };
  }

  /**
   * Configure new limits
   * @param {number} limit - New request limit
   * @param {number} windowMs - New window size in milliseconds
   */
  configure(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    // Keep existing requests but they'll be filtered by new window
  }
}
