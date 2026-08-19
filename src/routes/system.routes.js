const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getStatus } = require('../controllers/system.controller');

const router = express.Router();

router.use(auth);
router.get('/status', getStatus);

module.exports = router;
