// Custom logger với timezone Việt Nam
const getTimestamp = () => {
  return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const levels = {
  info: '\x1b[32mINFO\x1b[0m',    // Green
  error: '\x1b[31mERROR\x1b[0m',  // Red
  warn: '\x1b[33mWARN\x1b[0m',    // Yellow
  debug: '\x1b[36mDEBUG\x1b[0m'   // Cyan
};

const logger = {
  log: (message) => {
    console.log(`[${getTimestamp()}] ${message}`);
  },
  info: (message) => {
    console.log(`${levels.info} [${getTimestamp()}]: ${message}`);
  },
  error: (message, error = null) => {
    console.log(`${levels.error} [${getTimestamp()}]: ${message}${error ? ' - ' + error.message : ''}`);
  },
  warn: (message) => {
    console.log(`${levels.warn} [${getTimestamp()}]: ${message}`);
  },
  debug: (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${levels.debug} [${getTimestamp()}]: ${message}`);
    }
  }
};

export default logger;
