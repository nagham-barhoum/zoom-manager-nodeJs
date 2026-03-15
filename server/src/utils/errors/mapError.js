const AppError = require('./AppError');

function mapError(err) {
  if (err instanceof AppError) {
    return {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
    };
  }

  if (err?.response) {
    return {
      code: 'EXTERNAL_SERVICE_ERROR',
      message: 'External service error',
      statusCode: 502,
      details: err.response?.data,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
    statusCode: 500,
  };
}

module.exports = mapError;