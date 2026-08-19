const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getLogs } = require('../controllers/logs.controller');

const router = express.Router();

router.use(auth);
router.get('/', getLogs);

module.exports = router;
