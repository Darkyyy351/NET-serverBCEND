module.exports = function (err, req, res, next) {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message || 'Internal Server Error'
  });
};
