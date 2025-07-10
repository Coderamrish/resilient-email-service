/**
 * Logger Unit Tests
 */

import Logger from '../src/utils/Logger.js';

// Mock console methods
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

const originalConsole = { ...console };

beforeAll(() => {
  Object.assign(console, mockConsole);
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

beforeEach(() => {
  Logger.clearLogs();
  Logger.setLevel('INFO');
  Object.keys(mockConsole).forEach(key => mockConsole[key].mockClear());
});

describe('Logger', () => {
  describe('Log levels', () => {
    test('should log ERROR messages at INFO level', () => {
      Logger.error('Test error');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test error')
      );
    });

    test('should log WARN messages at INFO level', () => {
      Logger.warn('Test warning');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Test warning')
      );
    });

    test('should log INFO messages at INFO level', () => {
      Logger.info('Test info');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Test info')
      );
    });

    test('should NOT log DEBUG messages at INFO level', () => {
      Logger.debug('Test debug');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    test('should log DEBUG messages when level is DEBUG', () => {
      Logger.setLevel('DEBUG');
      Logger.debug('Test debug');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Test debug')
      );
    });

    test('should only log ERROR messages when level is ERROR', () => {
      Logger.setLevel('ERROR');

      Logger.error('Test error');
      Logger.warn('Test warning');
      Logger.info('Test info');
      Logger.debug('Test debug');

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('Log storage', () => {
    test('should store log entries', () => {
      Logger.info('Test message');

      const logs = Logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].timestamp).toBeDefined();
    });

    test('should store additional arguments', () => {
      const testObj = { key: 'value' };
      Logger.info('Test message', testObj, 'extra');

      const logs = Logger.getLogs();
      expect(logs[0].args).toEqual([testObj, 'extra']);
    });

    test('should not store args when none provided', () => {
      Logger.info('Test message');

      const logs = Logger.getLogs();
      expect(logs[0].args).toBeUndefined();
    });
  });

  describe('Log filtering', () => {
    beforeEach(() => {
      Logger.setLevel('DEBUG');
      Logger.error('Error message');
      Logger.warn('Warning message');
      Logger.info('Info message');
      Logger.debug('Debug message');
    });

    test('should filter logs by level', () => {
      const errorLogs = Logger.getLogsByLevel('ERROR');
      const warnLogs = Logger.getLogsByLevel('WARN');

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
      expect(warnLogs).toHaveLength(1);
      expect(warnLogs[0].message).toBe('Warning message');
    });

    test('should get recent logs', () => {
      const recentLogs = Logger.getRecentLogs(2);

      expect(recentLogs).toHaveLength(2);
      expect(recentLogs[0].message).toBe('Info message');
      expect(recentLogs[1].message).toBe('Debug message');
    });

    test('should handle getting more recent logs than available', () => {
      const recentLogs = Logger.getRecentLogs(10);

      expect(recentLogs).toHaveLength(4); // Only 4 logs exist
    });
  });

  describe('Log management', () => {
    test('should limit stored logs to maximum', () => {
      Logger.setMaxLogs(3);

      Logger.info('Message 1');
      Logger.info('Message 2');
      Logger.info('Message 3');
      Logger.info('Message 4');

      const logs = Logger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 2');
      expect(logs[2].message).toBe('Message 4');
    });

    test('should clear all logs', () => {
      Logger.info('Message 1');
      Logger.info('Message 2');

      expect(Logger.getLogs()).toHaveLength(2);

      Logger.clearLogs();

      expect(Logger.getLogs()).toHaveLength(0);
    });

    test('should trim logs when max is reduced', () => {
      Logger.info('Message 1');
      Logger.info('Message 2');
      Logger.info('Message 3');

      Logger.setMaxLogs(2);

      const logs = Logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Message 2');
      expect(logs[1].message).toBe('Message 3');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      Logger.setLevel('DEBUG');
      Logger.error('Error 1');
      Logger.error('Error 2');
      Logger.warn('Warning 1');
      Logger.info('Info 1');
      Logger.debug('Debug 1');
    });

    test('should provide accurate statistics', () => {
      const stats = Logger.getStats();

      expect(stats.total).toBe(5);
      expect(stats.byLevel.ERROR).toBe(2);
      expect(stats.byLevel.WARN).toBe(1);
      expect(stats.byLevel.INFO).toBe(1);
      expect(stats.byLevel.DEBUG).toBe(1);
      expect(stats.currentLevel).toBe('DEBUG');
      expect(stats.maxLogs).toBeDefined();
    });

    test('should handle unknown log levels in stats', () => {
      // This shouldn't happen in normal use, but test robustness
      const logs = Logger.getLogs();
      logs.push({ level: 'UNKNOWN', message: 'test', timestamp: new Date().toISOString() });

      const stats = Logger.getStats();
      // Should still work without throwing errors
      expect(stats.total).toBe(6);
    });
  });

  describe('Level configuration', () => {
    test('should handle case-insensitive level setting', () => {
      Logger.setLevel('debug');
      Logger.debug('Test debug');

      expect(mockConsole.debug).toHaveBeenCalled();
    });

    test('should ignore invalid log levels', () => {
      const originalLevel = Logger.currentLevel;
      Logger.setLevel('INVALID');

      expect(Logger.currentLevel).toBe(originalLevel);
    });
  });

  describe('Message formatting', () => {
    test('should include timestamp in console output', () => {
      Logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: Test message$/)
      );
    });

    test('should pass additional arguments to console', () => {
      const testObj = { key: 'value' };
      Logger.error('Error occurred', testObj, 123);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error occurred'),
        testObj,
        123
      );
    });
  });
});