/**
 * @file
 * This is a wrapper class to handel the system logger.
 */

// Node core modules.
var fs = require('fs');
var path = require('path');

// NPM modules.
var winston = require('winston');

function useModeConsoleJson(loggerInstance, logs, levels) {
  "use strict";

  // Levels that should be printed to standard error.
  var stdErrLevels = [
    'error'
  ];

  // The most of the instances only differ on log-level.
  var generateConsoleLoggerFor = function (level) {
    return new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.Console)({
          level: level,
          stderrLevels: stdErrLevels,
          debugStdout: false,
          colorize: false,
          showLevel: true,
          json: true,
          timestamp: true
        })
      ],
      exitOnError: false
    });
  };

  loggerInstance.infoLog = generateConsoleLoggerFor('info');
  loggerInstance.debugLog = generateConsoleLoggerFor('debugger');
  loggerInstance.errorLog = generateConsoleLoggerFor('error');
  loggerInstance.socketLog = generateConsoleLoggerFor('socket');
  loggerInstance.excepLog = new (winston.Logger)({
    levels: levels,
    transports: [
      new (winston.transports.Console)({
        handleExceptions: true,
        humanReadableUnhandledException: true,
        colorize: false,
        showLevel: true,
        json: true,
        timestamp: true
      })
    ],
    exitOnError: true
  });
}

function useModeFile(loggerInstance, logs, levels) {
  "use strict";

  if (logs.hasOwnProperty('info')) {
    loggerInstance.infoLog = new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.DailyRotateFile)({
          name: 'info-file',
          filename: path.join(__dirname, '../../' + logs.info),
          level: 'info',
          datePattern: '.dd-MM-yyTHH',
          colorize: false
        })
      ],
      exitOnError: false
    });
  }

  if (logs.hasOwnProperty('debug')) {
    loggerInstance.debugLog = new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.DailyRotateFile)({
          name: 'debug-file',
          filename: path.join(__dirname, '../../' + logs.debug),
          level: 'debug',
          datePattern: '.dd-MM-yyTHH',
          colorize: false
        })
      ],
      exitOnError: false
    });
  }

  if (logs.hasOwnProperty('error')) {
    loggerInstance.errorLog = new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.DailyRotateFile)({
          name: 'error-file',
          filename: path.join(__dirname, '../../' + logs.error),
          level: 'error',
          datePattern: '.dd-MM-yyTHH',
          colorize: false
        })
      ],
      exitOnError: false
    });
  }

  if (logs.hasOwnProperty('socket')) {
    loggerInstance.socketLog = new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.DailyRotateFile)({
          name: 'socket-file',
          filename: path.join(__dirname, '../../' + logs.socket),
          level: 'socket',
          datePattern: '.dd-MM-yyTHH',
          colorize: false
        })
      ],
      exitOnError: false
    });
  }

  if (logs.hasOwnProperty('exception')) {
    loggerInstance.excepLog = new (winston.Logger)({
      levels: levels,
      transports: [
        new (winston.transports.DailyRotateFile)({
          name: 'exceptions-file',
          filename: path.join(__dirname, '../../' + logs.exception),
          datePattern: '.dd-MM-yyTHH',
          handleExceptions: true,
          humanReadableUnhandledException: true
        })
      ],
      exitOnError: true
    });
  }
}

/**
 * Define the Base object (constructor).
 */
var Logger = function Logger(logs) {
  "use strict";

  var levels = winston.config.syslog.levels;
  levels['socket'] = 8;
  winston.setLevels(levels);

  // Determine which mode we are in, default to file.
  this.mode = logs.hasOwnProperty('mode') ? logs.mode : 'file';
  if (this.mode === 'file') {
    useModeFile(this, logs, levels);
  } else if (this.mode === 'console-json') {
    useModeConsoleJson(this, logs, levels);
  } else {
    throw new Error('Unknown logger mode ' + this.mode);
  }
};

/**
 * Log error message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.error = function error(message) {
  "use strict";

  if (this.errorLog !== undefined) {
    this.errorLog.error(message);
  }
};

/**
 * Log info message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.info = function info(message) {
  "use strict";

  if (this.infoLog !== undefined) {
    this.infoLog.info(message);
  }
};

/**
 * Log debug message.
 *
 * @param message
 *   The message to send to the logger.
 */
Logger.prototype.debug = function debug(message) {
  "use strict";

  if (this.debugLog !== undefined) {
    this.debugLog.debug(message);
  }
};

/**
 * Log socket message.
 *
 * @param message
 *   The message to send to the logger.
 *
 * @param data
 *   Data-object associated with the log-statement.
 */
Logger.prototype.socket = function socket(message, data) {
  "use strict";

  if (this.socketLog !== undefined) {
    if (data !== undefined) {
      // If we're in console-json mode the logge will handle the serialization
      // of the data on its own.
      if (this.mode === 'console-json') {
        this.socketLog.log('socket', {'message': message, 'data': data});
      } else {
        this.socketLog.log('socket', message + ' <-:-> ', JSON.stringify(data));
      }

    }
    else {
      this.socketLog.log('socket', message);
    }
  }
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  var logger = new Logger(options.logs);

  // Register the plugin with the system.
  register(null, {
    "logger": logger
  });
};
