/**
 * CircuitBreaker Unit Tests
 */

import CircuitBreaker from '../src/utils/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker;
  let mockFn;
  let stateChanges;

  beforeEach(() => {
    stateChanges = [];
    circuitBreaker = new CircuitBreaker({
      threshold: 3,
      timeout: 100,
      onStateChange: (state) => stateChanges.push(state)
    });
    mockFn = jest.fn();
  });

  describe('CLOSED state', () => {
    test('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    test('should execute function when closed', async () => {
      mockFn.mockResolvedValue('success');

      const result = await circuitBreaker.call(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should reset failure count on success', async () => {
      mockFn
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      // First call fails
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('fail');
      expect(circuitBreaker.getFailureCount()).toBe(1);

      // Second call succeeds and resets count
      const result = await circuitBreaker.call(mockFn);
      expect(result).toBe('success');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    test('should open after threshold failures', async () => {
      mockFn.mockRejectedValue(new Error('fail'));

      // Fail threshold number of times
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(mockFn)).rejects.toThrow('fail');
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.isOpen()).toBe(true);
      expect(stateChanges).toContain('OPEN');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Force circuit breaker to OPEN state
      mockFn.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(mockFn)).rejects.toThrow();
      }
      mockFn.mockClear();
    });

    test('should reject calls immediately when open', async () => {
      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFn).not.toHaveBeenCalled();
    });

    test('should transition to HALF_OPEN after timeout', async () => {
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      mockFn.mockResolvedValue('success');
      const result = await circuitBreaker.call(mockFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(stateChanges).toContain('HALF_OPEN');
      expect(stateChanges).toContain('CLOSED');
    });

    test('should provide time until next attempt', () => {
      const timeUntilNext = circuitBreaker.getTimeUntilNextAttempt();
      expect(timeUntilNext).toBeGreaterThan(0);
      expect(timeUntilNext).toBeLessThanOrEqual(100);
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Force to OPEN state
      mockFn.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(mockFn)).rejects.toThrow();
      }
      // Wait for timeout to enable HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));
      mockFn.mockClear();
      stateChanges.length = 0; // Clear previous state changes
    });

    test('should close on successful call', async () => {
      mockFn.mockResolvedValue('success');

      const result = await circuitBreaker.call(mockFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(stateChanges).toContain('HALF_OPEN');
      expect(stateChanges).toContain('CLOSED');
    });

    test('should open again on failed call', async () => {
      mockFn.mockRejectedValue(new Error('fail again'));

      await expect(circuitBreaker.call(mockFn)).rejects.toThrow('fail again');

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(stateChanges).toContain('HALF_OPEN');
      expect(stateChanges).toContain('OPEN');
    });
  });

  describe('Manual operations', () => {
    test('should allow manual reset', async () => {
      // Force to OPEN state
      mockFn.mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.call(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Manual reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    test('should provide accurate statistics', async () => {
      mockFn.mockRejectedValue(new Error('fail'));
      
      // Fail twice
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.call(mockFn)).rejects.toThrow();
      }

      const stats = circuitBreaker.getStats();

      expect(stats.state).toBe('CLOSED');
      expect(stats.failureCount).toBe(2);
      expect(stats.threshold).toBe(3);
      expect(stats.timeout).toBe(100);
      expect(stats.lastFailureTime).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle function that throws non-Error objects', async () => {
      mockFn.mockRejectedValue('string error');

      await expect(circuitBreaker.call(mockFn)).rejects.toBe('string error');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    test('should handle synchronous functions', async () => {
      const syncFn = jest.fn(() => 'sync result');

      const result = await circuitBreaker.call(syncFn);

      expect(result).toBe('sync result');
      expect(syncFn).toHaveBeenCalledTimes(1);
    });

    test('should handle functions that throw synchronously', async () => {
      const syncErrorFn = jest.fn(() => {
        throw new Error('sync error');
      });

      await expect(circuitBreaker.call(syncErrorFn)).rejects.toThrow('sync error');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
  });
});