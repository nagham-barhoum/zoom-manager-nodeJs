const AppError = require('./AppError');

class ExternalServiceError extends AppError {
  constructor(message, options = {}) {
    const {
      service = 'external',
      upstreamStatus,
      upstreamCode,
      details,
      statusCode,
      cause,
    } = options;

    const normalizedStatus = statusCode
      || (upstreamStatus === 429 ? 429 : (upstreamStatus >= 500 ? 502 : upstreamStatus))
      || 502;

    super(message, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: normalizedStatus,
      isOperational: true,
      details: {
        service,
        upstreamStatus,
        upstreamCode,
        ...details && { details },
      },
      cause,
    });
  }
}

module.exports = ExternalServiceError;