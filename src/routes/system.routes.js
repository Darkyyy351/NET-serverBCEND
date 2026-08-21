const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getStatus, setOperatingMode } = require('../controllers/system.controller');

const router = express.Router();

router.use(auth);
router.get('/status', getStatus);
router.post('/mode', setOperatingMode);

module.exports = router;
