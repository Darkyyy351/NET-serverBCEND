const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
    getDevices,
    createDevice,
    deleteDevice
} = require("../controllers/devices.controller");

// Všechny routes jsou chráněné tokenem
router.use(auth);

// GET all devices
router.get("/", getDevices);

// CREATE device
router.post("/", createDevice);

// DELETE device
router.delete("/:id", deleteDevice);

module.exports = router;