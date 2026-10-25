/**
 * lib/logger.js
 * Structured JSON logging for planner jobs and stages.
 */
function formatLog(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
}

const logger = {
  info: (message, meta) => {
    console.log(formatLog("info", message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatLog("warn", message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog("error", message, meta));
  },
  debug: (message, meta) => {
    if (process.env.DEBUG || process.env.NODE_ENV !== "production") {
      console.log(formatLog("debug", message, meta));
    }
  },
};

module.exports = logger;
