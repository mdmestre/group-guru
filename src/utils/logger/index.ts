/**
 * Logger Utility
 * Central logger export and utilities
 */

import { logger } from './config.js';

export default logger;

// Helper functions for common operations
export const logRequest = (method: string, path: string, status: number, duration: number) => {
  logger.http(`${method} ${path} - ${status} (${duration}ms)`);
};

export const logError = (message: string, error: any, context?: Record<string, any>) => {
  logger.error(message, {
    metadata: {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    },
  });
};

export const logWarning = (message: string, context?: Record<string, any>) => {
  logger.warn(message, {
    metadata: context,
  });
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, {
    metadata: context,
  });
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, {
    metadata: context,
  });
};
