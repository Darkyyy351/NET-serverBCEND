const logsService = require('../services/logs.service');

exports.getLogs = (req, res) => {
  res.json({
    success: true,
    data: logsService.getRecent(req.query.limit)
  });
};
