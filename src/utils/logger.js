const logger = {
  info: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
  },
  request: (req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [REQUEST] ${req.method} ${req.path}`);
    next();
  },
};

module.exports = logger;
