const systemService = require('../services/system.service');
const systemConfig = require('../services/systemConfig.service');
const logs = require('../services/logs.service');
const fanControl = require('../services/fanControl.service');

exports.getStatus = (req, res) => {
  res.json({
    success: true,
    data: systemService.getStatus()
  });
};

exports.getFanControl = async (req, res) => {
  res.json({
    success: true,
    data: await fanControl.getStatus()
  });
};

exports.startFanTest = async (req, res) => {
  const state = req.body?.state;
  const duration = req.body?.duration ?? 60;

  if (!Number.isInteger(state) || state < 0 || state > 4 ||
      !Number.isInteger(duration) || duration < 1 || duration > 60) {
    return res.status(400).json({
      success: false,
      error: 'Fan state must be 0-4 and duration must be 1-60 seconds'
    });
  }

  try {
    const data = await fanControl.startTest(state, duration);
    logs.append({
      type: 'sys',
      message: `CM5 fan manual test started at state ${state}`,
      meta: { state, duration }
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, error: error.message });
  }
};

exports.stopFanTest = async (req, res) => {
  try {
    const data = await fanControl.stopTest();
    logs.append({
      type: 'sys',
      message: 'CM5 fan manual test stopped; kernel control restored',
      meta: null
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, error: error.message });
  }
};

exports.setOperatingMode = (req, res) => {
  const result = systemConfig.setMode(req.body?.mode);

  if (!result) {
    return res.status(400).json({
      success: false,
      error: 'Mode must be normal or eco'
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
