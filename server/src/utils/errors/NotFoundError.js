const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, {
      code: 'NOT_FOUND',
      statusCode: 404,
      isOperational: true,
    });
  }
}

module.exports = NotFoundError;