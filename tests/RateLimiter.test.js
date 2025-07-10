/**
 * RateLimiter Unit Tests
 */

import RateLimiter from '../src/utils/RateLimiter.js';

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(5, 1000); // 5 requests per second
  });

  describe('Basic functionality', () => {
    test('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.allowRequest()).toBe(true);
      }
      expect(rateLimiter.getRequestCount()).toBe(5);
    });

    test('should deny requests exceeding limit', () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.allowRequest()).toBe(true);
      }

      // Next request should be denied
      expect(rateLimiter.allowRequest()).toBe(false);
      expect(rateLimiter.getRequestCount()).toBe(5);
    });

    test('should reset after time window', async () => {
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.allowRequest();
      }

      expect(rateLimiter.allowRequest()).toBe(false);

      // Wait for window to pass
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should allow requests again
      expect(rateLimiter.allowRequest()).toBe(true);
      expect(rateLimiter.getRequestCount()).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate remaining requests', () => {
      expect(rateLimiter.getRemainingRequests()).toBe(5);

      rateLimiter.allowRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(4);

      rateLimiter.allowRequest();
      expect(rateLimiter.getRemainingRequests()).toBe(3);
    });

    test('should indicate when limit is exceeded', () => {
      expect(rateLimiter.isLimitExceeded()).toBe(false);

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.allowRequest();
      }

      expect(rateLimiter.isLimitExceeded()).toBe(true);
    });

    test('should provide time until reset', () => {
      rateLimiter.allowRequest();
      
      const timeUntilReset = rateLimiter.getTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);
    });

    test('should return zero time until reset when no requests', () => {
      expect(rateLimiter.getTimeUntilReset()).toBe(0);
    });

    test('should provide comprehensive statistics', () => {
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();

      const stats = rateLimiter.getStats();

      expect(stats.limit).toBe(5);
      expect(stats.windowMs).toBe(1000);
      expect(stats.currentRequests).toBe(2);
      expect(stats.remainingRequests).toBe(3);
      expect(stats.isLimitExceeded).toBe(false);
      expect(stats.timeUntilReset).toBeGreaterThan(0);
      expect(stats.utilizationPercentage).toBe(40); // 2/5 * 100
    });
  });

  describe('Configuration', () => {
    test('should allow reconfiguration', () => {
      rateLimiter.configure(10, 2000); // 10 requests per 2 seconds

      // Should allow more requests
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.allowRequest()).toBe(true);
      }

      expect(rateLimiter.allowRequest()).toBe(false);

      const stats = rateLimiter.getStats();
      expect(stats.limit).toBe(10);
      expect(stats.windowMs).toBe(2000);
    });

    test('should reset state', () => {
      // Use some requests
      rateLimiter.allowRequest();
      rateLimiter.allowRequest();

      expect(rateLimiter.getRequestCount()).toBe(2);

      rateLimiter.reset();

      expect(rateLimiter.getRequestCount()).toBe(0);
      expect(rateLimiter.getRemainingRequests()).toBe(5);
    });
  });

  describe('Sliding window behavior', () => {
    test('should remove old requests from window', async () => {
      const quickLimiter = new RateLimiter(2, 100); // 2 requests per 100ms

      // Make requests at start of window
      expect(quickLimiter.allowRequest()).toBe(true);
      expect(quickLimiter.allowRequest()).toBe(true);
      expect(quickLimiter.allowRequest()).toBe(false);

      // Wait for half the window
      await new Promise(resolve => setTimeout(resolve, 60));

      // Still at limit
      expect(quickLimiter.allowRequest()).toBe(false);

      // Wait for requests to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should allow new requests
      expect(quickLimiter.allowRequest()).toBe(true);
    });

    test('should handle rapid successive requests correctly', () => {
      const requestTimes = [];
      
      // Make requests as fast as possible
      for (let i = 0; i < 10; i++) {
        const allowed = rateLimiter.allowRequest();
        requestTimes.push({ allowed, count: rateLimiter.getRequestCount() });
      }

      // First 5 should be allowed, rest denied
      for (let i = 0; i < 5; i++) {
        expect(requestTimes[i].allowed).toBe(true);
      }
      for (let i = 5; i < 10; i++) {
        expect(requestTimes[i].allowed).toBe(false);
      }
    });
  });

  describe('Edge cases', () => {
    test('should handle zero limit', () => {
      const zeroLimiter = new RateLimiter(0, 1000);
      expect(zeroLimiter.allowRequest()).toBe(false);
      expect(zeroLimiter.isLimitExceeded()).toBe(true);
    });

    test('should handle very short time windows', () => {
      const shortLimiter = new RateLimiter(1, 1); // 1 request per 1ms

      expect(shortLimiter.allowRequest()).toBe(true);
      expect(shortLimiter.allowRequest()).toBe(false);
    });

    test('should handle very large limits', () => {
      const largeLimiter = new RateLimiter(1000000, 1000);

      for (let i = 0; i < 100; i++) {
        expect(largeLimiter.allowRequest()).toBe(true);
      }

      expect(largeLimiter.getRequestCount()).toBe(100);
      expect(largeLimiter.getRemainingRequests()).toBe(999900);
    });
  });
});