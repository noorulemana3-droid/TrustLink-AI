const { captureError } = require('../config/sentry');

const errorHandler = (err, req, res, next) => {
  console.error(err);
  captureError(err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ message: `${field} already exists` });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Server error',
  });
};

module.exports = errorHandler;
