const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
  getStatus,
  setOperatingMode,
  getFanControl,
  startFanTest,
  stopFanTest
} = require('../controllers/system.controller');

const router = express.Router();

router.use(auth);
router.get('/status', getStatus);
router.post('/mode', setOperatingMode);
router.get('/fan-control', getFanControl);
router.post('/fan-control/test', startFanTest);
router.post('/fan-control/stop', stopFanTest);

module.exports = router;
