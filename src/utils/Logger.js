/**
 * Simple Logger Implementation
 * 
 * Provides basic logging functionality with different log levels
 * and structured output for debugging and monitoring.
 */

export default class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  static currentLevel = Logger.LOG_LEVELS.INFO;
  static logs = []; // Store logs for testing/debugging
  static maxLogs = 1000; // Maximum number of logs to keep

  /**
   * Set the current log level
   * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG)
   */
  static setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (Logger.LOG_LEVELS.hasOwnProperty(upperLevel)) {
      Logger.currentLevel = Logger.LOG_LEVELS[upperLevel];
    }
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {...any} args - Additional arguments
   */
  static error(message, ...args) {
    Logger.log('ERROR', message, ...args);
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   * @param {...any} args - Additional arguments
   */
  static warn(message, ...args) {
    Logger.log('WARN', message, ...args);
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {...any} args - Additional arguments
   */
  static info(message, ...args) {
    Logger.log('INFO', message, ...args);
  }

  /**
   * Log a debug message
   * @param {string} message - Debug message
   * @param {...any} args - Additional arguments
   */
  static debug(message, ...args) {
    Logger.log('DEBUG', message, ...args);
  }

  /**
   * Core logging method
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {...any} args - Additional arguments
   */
  static log(level, message, ...args) {
    const levelValue = Logger.LOG_LEVELS[level];
    
    if (levelValue <= Logger.currentLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        args: args.length > 0 ? args : undefined
      };

      // Store log entry
      Logger.logs.push(logEntry);
      
      // Keep only the most recent logs
      if (Logger.logs.length > Logger.maxLogs) {
        Logger.logs = Logger.logs.slice(-Logger.maxLogs);
      }

      // Output to console
      const consoleMethod = Logger.getConsoleMethod(level);
      const formattedMessage = `[${timestamp}] ${level}: ${message}`;
      
      if (args.length > 0) {
        consoleMethod(formattedMessage, ...args);
      } else {
        consoleMethod(formattedMessage);
      }
    }
  }

  /**
   * Get appropriate console method for log level
   * @private
   * @param {string} level - Log level
   * @returns {Function} - Console method
   */
  static getConsoleMethod(level) {
    switch (level) {
      case 'ERROR':
        return console.error;
      case 'WARN':
        return console.warn;
      case 'INFO':
        return console.info;
      case 'DEBUG':
        return console.debug;
      default:
        return console.log;
    }
  }

  /**
   * Get all stored logs
   * @returns {Array} - Array of log entries
   */
  static getLogs() {
    return [...Logger.logs];
  }

  /**
   * Get logs filtered by level
   * @param {string} level - Log level to filter by
   * @returns {Array} - Filtered log entries
   */
  static getLogsByLevel(level) {
    return Logger.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs
   * @param {number} count - Number of recent logs to return
   * @returns {Array} - Recent log entries
   */
  static getRecentLogs(count = 10) {
    return Logger.logs.slice(-count);
  }

  /**
   * Clear all stored logs
   */
  static clearLogs() {
    Logger.logs = [];
  }

  /**
   * Get logging statistics
   * @returns {Object} - Statistics about logged messages
   */
  static getStats() {
    const stats = {
      total: Logger.logs.length,
      byLevel: {
        ERROR: 0,
        WARN: 0,
        INFO: 0,
        DEBUG: 0
      },
      currentLevel: Object.keys(Logger.LOG_LEVELS).find(
        key => Logger.LOG_LEVELS[key] === Logger.currentLevel
      ),
      maxLogs: Logger.maxLogs
    };

    Logger.logs.forEach(log => {
      if (stats.byLevel.hasOwnProperty(log.level)) {
        stats.byLevel[log.level]++;
      }
    });

    return stats;
  }

  /**
   * Set maximum number of logs to keep
   * @param {number} max - Maximum number of logs
   */
  static setMaxLogs(max) {
    Logger.maxLogs = Math.max(1, max);
    
    // Trim logs if necessary
    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs = Logger.logs.slice(-Logger.maxLogs);
    }
  }
}
