/* eslint-disable no-console */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

const CURRENT_LEVEL = import.meta.env.PROD ? LOG_LEVELS.warn : LOG_LEVELS.debug

const logger = {
  debug(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) {
      console.debug('[HYPERFIT]', ...args)
    }
  },

  info(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) {
      console.info('[HYPERFIT]', ...args)
    }
  },

  warn(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) {
      console.warn('[HYPERFIT]', ...args)
    }
  },

  error(...args) {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) {
      console.error('[HYPERFIT]', ...args)
    }
  },
}

export default logger
