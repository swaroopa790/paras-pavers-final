// Centralized error handler — never leaks internal details to the client.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    // Log full detail server-side only.
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    success: false,
    error: status >= 500 ? 'Internal server error' : err.message || 'Request failed',
    details: err.details || undefined
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, error: 'Not found' });
}

module.exports = { errorHandler, notFound };
