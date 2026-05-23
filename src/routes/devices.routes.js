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
