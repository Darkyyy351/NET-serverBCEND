const systemService = require('../services/system.service');
const systemConfig = require('../services/systemConfig.service');
const logs = require('../services/logs.service');

exports.getStatus = (req, res) => {
  res.json({
    success: true,
    data: systemService.getStatus()
  });
};

exports.setOperatingMode = (req, res) => {
  const result = systemConfig.setMode(req.body?.mode);

  if (!result) {
    return res.status(400).json({
      success: false,
      error: 'Mode must be normal or sleep'
    });
  }

  if (result.changed) {
    logs.append({
      type: 'sys',
      message: `Operating mode changed to ${result.mode}`,
      meta: { mode: result.mode }
    });
  }

  return res.json({
    success: true,
    data: systemService.getStatus()
  });
};
