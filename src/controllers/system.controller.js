const systemService = require('../services/system.service');

exports.getStatus = (req, res) => {
  res.json({
    success: true,
    data: systemService.getStatus()
  });
};
