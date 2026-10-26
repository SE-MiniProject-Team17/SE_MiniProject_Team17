const AppError = require('../utils/AppError');

/** Central error handler: every error leaves the API as { error: { code, message, field? } }. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.field) body.field = err.field;
    return res.status(err.status).json({ error: body });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
  }
  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation (safety net behind the request validators).
    const [field, detail] = Object.entries(err.errors)[0];
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: detail.message, field } });
  }
  if (err.name === 'CastError') {
    // e.g. an invalid ObjectId in the URL – treat as "not found", reveal nothing.
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item unavailable' } });
  }
  // Unexpected error: log it on the server, send a generic message (no stack traces).
  if (process.env.NODE_ENV !== 'test') console.error('Unexpected API error:', err.name || 'Error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}

function notFoundRoute(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

module.exports = { errorHandler, notFoundRoute };
