const { getZoomAuthState } = require('../../infrastructure/zoom/zoomClient');
const { ExternalServiceError } = require('../../utils/errors');

function zoomAuthGuard(req, res, next) {
  const state = getZoomAuthState();
  if (state.ok) return next();

  const err = state.error;
  if (err) return next(err);

  return next(new ExternalServiceError('Invalid Zoom credentials or account configuration', {
    service: 'zoom-auth',
    statusCode: 401,
  }));
}

module.exports = zoomAuthGuard;