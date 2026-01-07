/**
 * Logger Unit Tests
 */

import logger from '../../src/utils/logger/index.js';

describe('Logger', () => {
  it('should export a logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('debug');
  });

  it('should have correct log levels', () => {
    const logFunctions = ['info', 'error', 'warn', 'debug', 'http'];
    logFunctions.forEach((level) => {
      expect(typeof (logger as any)[level]).toBe('function');
    });
  });

  it('should log without throwing', () => {
    expect(() => {
      logger.info('Test message');
      logger.error('Test error');
      logger.warn('Test warning');
      logger.debug('Test debug');
    }).not.toThrow();
  });
});
