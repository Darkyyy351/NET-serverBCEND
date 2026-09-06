const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
    getDevices,
    createDevice,
    registerDevice,
    heartbeatDevice,
    deleteDevice,
    getDeviceCommands,
    queueDeviceCommand,
    claimNextDeviceCommand,
    ackDeviceCommand
} = require("../controllers/devices.controller");

// All device routes are protected by the shared NET 0.1 API token.
router.use(auth);

const devices = require('../services/devices.service');
router.get('/requests', (req, res) => res.json({ success: true, data: devices.getRequests() }));
router.post('/:id/admission', (req, res) => {
    if (!['approved', 'rejected'].includes(req.body?.decision)) return res.status(400).json({ success: false, error: 'Invalid admission decision' });
    const result = devices.decideAdmission(req.params.id, req.body.decision);
    if (!result) return res.status(409).json({ success: false, error: 'Request no longer pending' });
    res.json({ success: true, data: result });
});
router.post('/:id/verify', (req, res) => {
    const result = devices.verify(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Device not found' });
    res.json({ success: true, data: result });
});
router.get('/:id/verify/:commandId', (req, res) => {
    const result = devices.verification(req.params.id, req.params.commandId);
    if (!result) return res.status(404).json({ success: false, error: 'Verification not found' });
    res.json({ success: true, data: result });
});

router.get("/", getDevices);
router.post("/", createDevice);
router.post("/register", registerDevice);
router.post("/:id/heartbeat", heartbeatDevice);
router.get("/:id/commands", getDeviceCommands);
router.post("/:id/commands", queueDeviceCommand);
router.get("/:id/commands/next", claimNextDeviceCommand);
router.post("/:id/commands/:commandId/ack", ackDeviceCommand);
router.delete("/:id", deleteDevice);

module.exports = router;
