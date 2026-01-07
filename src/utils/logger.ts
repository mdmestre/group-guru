/**
 * Lightweight logger used across the codebase.
 * 
 * This project runs in the browser (Vite/React). Some folders also contain
 * server-oriented code (Express-like services). To keep the build stable,
 * we provide a shared logger implementation that works in both contexts.
 */

export interface Logger {
  logInfo: (message: string, meta?: Record<string, unknown>) => void;
  logWarn: (message: string, meta?: Record<string, unknown>) => void;
  logError: (message: string, error?: Error, meta?: Record<string, unknown>) => void;
  logDebug: (message: string, meta?: Record<string, unknown>) => void;
}

export const logger: Logger = {
  logInfo(message, meta) {
    // eslint-disable-next-line no-console
    console.info(`[info] ${message}`, meta ?? {});
  },
  logWarn(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(`[warn] ${message}`, meta ?? {});
  },
  logError(message, error, meta) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}`, { error, ...(meta ?? {}) });
  },
  logDebug(message, meta) {
    // eslint-disable-next-line no-console
    console.debug(`[debug] ${message}`, meta ?? {});
  },
};

export default logger;
