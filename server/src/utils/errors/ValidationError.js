const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      isOperational: true,
      details,
    });
  }
}

module.exports = ValidationError;