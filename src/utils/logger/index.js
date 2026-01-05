/**
 * Logger Utility
 * Central logger export and utilities
 */

import { logger } from './config.js';

export default logger;

// Helper functions for common operations
export const logRequest = (method, path, status, duration) => {
  logger.http(`${method} ${path} - ${status} (${duration}ms)`);
};

export const logError = (message, error, context) => {
  logger.error(message, {
    metadata: {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    },
  });
};

export const logWarning = (message, context) => {
  logger.warn(message, {
    metadata: context,
  });
};
