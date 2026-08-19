const logs = require('../services/logs.service');

module.exports = function (req, res, next) {
  if (!process.env.API_TOKEN) {
    logs.append({
      type: 'auth',
      level: 'error',
      message: 'API token is not configured',
      meta: { method: req.method, path: req.originalUrl }
    });

    return res.status(503).json({
      success: false,
      error: 'API token is not configured'
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logs.append({
      type: 'auth',
      level: 'warn',
      message: 'Unauthorized request without bearer token',
      meta: { method: req.method, path: req.originalUrl, ip: req.ip }
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== process.env.API_TOKEN) {
    logs.append({
      type: 'auth',
      level: 'warn',
      message: 'Forbidden request with invalid bearer token',
      meta: { method: req.method, path: req.originalUrl, ip: req.ip }
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden'
    });
  }

  next();
};
