class AppError extends Error {
  constructor(message, options = {}) {
    const {
      code = 'APP_ERROR',
      statusCode = 500,
      isOperational = true,
      details,
      cause,
    } = options;

    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = AppError;
