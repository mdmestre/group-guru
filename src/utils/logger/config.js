/**
 * Logger Configuration
 * Winston logger setup with multiple transports
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}` +
      (info.metadata ? ` ${JSON.stringify(info.metadata)}` : '')
  )
);

// Define transports (where logs go)
const transports = [
  // Console transport
  new winston.transports.Console(),

  // Error logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../../logs/error.log'),
    level: 'error',
    format: winston.format.uncolorize(),
  }),

  // All logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../../logs/combined.log'),
    format: winston.format.uncolorize(),
  }),
];

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/exceptions.log'),
    }),
  ],
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { metadata: { reason } });
});

export default logger;
