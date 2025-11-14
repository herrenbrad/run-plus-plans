/**
 * Logger utility that only logs in development mode
 * In production builds, all logs are stripped to protect proprietary algorithms
 */

const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },
  warn: (...args) => {
    // Keep warnings in production for debugging real issues
    console.warn(...args);
  },
  error: (...args) => {
    // Keep errors in production for debugging real issues
    console.error(...args);
  }
};

export default logger;
