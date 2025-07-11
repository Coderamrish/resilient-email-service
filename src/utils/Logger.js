export default class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  static currentLevel = Logger.LOG_LEVELS.INFO;
  static logs = [];
  static maxLogs = 1000;

  static setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (Logger.LOG_LEVELS.hasOwnProperty(upperLevel)) {
      Logger.currentLevel = Logger.LOG_LEVELS[upperLevel];
    }
  }

  static error(message, ...args) {
    Logger.log("ERROR", message, ...args);
  }

  static warn(message, ...args) {
    Logger.log("WARN", message, ...args);
  }

  static info(message, ...args) {
    Logger.log("INFO", message, ...args);
  }

  static debug(message, ...args) {
    Logger.log("DEBUG", message, ...args);
  }

  static log(level, message, ...args) {
    const levelValue = Logger.LOG_LEVELS[level];

    if (levelValue <= Logger.currentLevel) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        args: args.length > 0 ? args : undefined,
      };

      Logger.logs.push(logEntry);

      if (Logger.logs.length > Logger.maxLogs) {
        Logger.logs = Logger.logs.slice(-Logger.maxLogs);
      }

      const consoleMethod = Logger.getConsoleMethod(level);
      const formattedMessage = `[${timestamp}] ${level}: ${message}`;

      if (args.length > 0) {
        consoleMethod(formattedMessage, ...args);
      } else {
        consoleMethod(formattedMessage);
      }
    }
  }

  static getConsoleMethod(level) {
    switch (level) {
      case "ERROR":
        return console.error;
      case "WARN":
        return console.warn;
      case "INFO":
        return console.info;
      case "DEBUG":
        return console.debug;
      default:
        return console.log;
    }
  }

  static getLogs() {
    return [...Logger.logs];
  }

  static getLogsByLevel(level) {
    return Logger.logs.filter((log) => log.level === level);
  }

  static getRecentLogs(count = 10) {
    return Logger.logs.slice(-count);
  }

  static clearLogs() {
    Logger.logs = [];
  }

  static getStats() {
    const stats = {
      total: Logger.logs.length,
      byLevel: {
        ERROR: 0,
        WARN: 0,
        INFO: 0,
        DEBUG: 0,
      },
      currentLevel: Object.keys(Logger.LOG_LEVELS).find(
        (key) => Logger.LOG_LEVELS[key] === Logger.currentLevel
      ),
      maxLogs: Logger.maxLogs,
    };

    Logger.logs.forEach((log) => {
      if (stats.byLevel.hasOwnProperty(log.level)) {
        stats.byLevel[log.level]++;
      }
    });

    return stats;
  }

  static setMaxLogs(max) {
    Logger.maxLogs = Math.max(1, max);

    if (Logger.logs.length > Logger.maxLogs) {
      Logger.logs = Logger.logs.slice(-Logger.maxLogs);
    }
  }
}