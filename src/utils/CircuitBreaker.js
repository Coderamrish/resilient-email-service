/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protects against cascading failures by monitoring error rates
 * and temporarily blocking requests when failure threshold is exceeded.
 */

export default class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5; // Number of failures before opening
    this.timeout = options.timeout || 60000; // Time to wait before attempting reset (ms)
    this.onStateChange = options.onStateChange || (() => {}); // Callback for state changes
    
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
    this.lastFailureTime = null;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @returns {Promise} - Result of function execution
   */
  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        // Time to try half-open
        this.state = 'HALF_OPEN';
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

  /**
   * Handle successful execution
   * @private
   */
  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.onStateChange(this.state);
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   * @private
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.onStateChange(this.state);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen() {
    return this.state === 'OPEN' && Date.now() < this.nextAttempt;
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed() {
    return this.state === 'CLOSED';
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen() {
    return this.state === 'HALF_OPEN';
  }

  /**
   * Get failure count
   */
  getFailureCount() {
    return this.failureCount;
  }

  /**
   * Get time until next attempt (for OPEN state)
   */
  getTimeUntilNextAttempt() {
    if (this.state !== 'OPEN') return 0;
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = null;
    this.lastFailureTime = null;
    this.onStateChange(this.state);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.threshold,
      timeout: this.timeout,
      lastFailureTime: this.lastFailureTime,
      timeUntilNextAttempt: this.getTimeUntilNextAttempt()
    };
  }
}