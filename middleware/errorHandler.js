/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the application.
 * Provides consistent error responses and logging.
 */

/**
 * Error handler middleware
 * Should be used as the last middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  console.error('[ErrorHandler]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    userId: req.userId,
    companyId: req.companyId
  });

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message || 'An error occurred';

  // Send error response
  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create error with status code
 */
export function createError(message, statusCode = 500, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;
  if (code) error.code = code;
  return error;
}

