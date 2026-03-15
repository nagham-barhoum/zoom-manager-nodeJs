/**
 * errorHandler — ??? middleware ???????
 */

const { AppError, mapError } = require('../../utils/errors');
const logger = require('../../utils/logger');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const mapped = mapError(err);
  const statusCode = mapped.statusCode || 500;

  const logMeta = {
    statusCode,
    code: mapped.code,
    url: req.originalUrl,
    method: req.method,
    ...(mapped.details && { details: mapped.details }),
  };

  if (err instanceof AppError) {
    logger.warn(`[${mapped.code}] ${mapped.message}`, logMeta);
  } else if (statusCode >= 500) {
    logger.error('Unexpected error', { ...logMeta, stack: err.stack });
  } else {
    logger.warn('Request error', logMeta);
  }

  const payload = {
    success: false,
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details && { details: mapped.details }),
    },
  };

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;