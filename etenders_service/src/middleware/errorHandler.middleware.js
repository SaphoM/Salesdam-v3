// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error('[error]', err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
