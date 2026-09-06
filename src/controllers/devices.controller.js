const deviceService = require("../services/devices.service");
const allowedDeviceTypes = new Set(["esp", "wled", "sensor", "relay"]);

function isValidIpv4(value) {
    const parts = String(value).split(".");

    return parts.length === 4 && parts.every(part => {
        if (!/^\d{1,3}$/.test(part)) {
            return false;
        }

        const number = Number(part);
        return number >= 0 && number <= 255;
    });
}

exports.getDevices = (req, res) => {
    const devices = deviceService.getAll();

    res.json({
        success: true,
        data: devices
    });
};

exports.createDevice = (req, res) => {
    const { name, ip, type, firmware, capabilities } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
            success: false,
            error: "Name is required"
        });
    }

    if (!ip || typeof ip !== "string" || !ip.trim()) {
        return res.status(400).json({
            success: false,
            error: "IP address is required"
        });
    }

    if (!isValidIpv4(ip.trim())) {
        return res.status(400).json({
            success: false,
            error: "IP address must be a valid IPv4 address"
        });
    }

    if (type && (!allowedDeviceTypes.has(type))) {
        return res.status(400).json({
            success: false,
            error: "Device type is invalid"
        });
    }

    const device = deviceService.create({ name: name.trim(), ip: ip.trim(), type, firmware, capabilities });

    res.status(201).json({
        success: true,
        data: device
    });
};

exports.registerDevice = (req, res) => {
    const { id, name, firmware, type, ip, capabilities } = req.body || {};
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id) ||
        (name !== undefined && (typeof name !== 'string' || name.length > 100)) ||
        (firmware !== undefined && (typeof firmware !== 'string' || firmware.length > 80)) ||
        (type !== undefined && !allowedDeviceTypes.has(type)) ||
        (ip !== undefined && !isValidIpv4(ip)) ||
        (capabilities !== undefined && (!Array.isArray(capabilities) || capabilities.length > 20 || capabilities.some(c => typeof c !== 'string' || c.length > 40)))) {
        return res.status(400).json({ success: false, error: 'Invalid device registration' });
    }
    const device = deviceService.register(req.body || {});

    res.status(201).json({
        success: true,
        data: device
    });
};

exports.heartbeatDevice = (req, res) => {
    const { id } = req.params;
    const device = deviceService.heartbeat(id, req.body || {});

    if (!device) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    res.json({
        success: true,
        data: device
    });
};

exports.deleteDevice = (req, res) => {
    const { id } = req.params;
    const removed = deviceService.remove(id);

    if (!removed) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    res.json({
        success: true
    });
};

exports.getDeviceCommands = (req, res) => {
    const commands = deviceService.getCommands(req.params.id);

    if (!commands) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    res.json({
        success: true,
        data: commands
    });
};

exports.queueDeviceCommand = (req, res) => {
    const { type, payload } = req.body;

    if (!type || typeof type !== "string") {
        return res.status(400).json({
            success: false,
            error: "Command type is required"
        });
    }

    const command = deviceService.queueCommand(req.params.id, { type, payload });

    if (!command) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    res.status(201).json({
        success: true,
        data: command
    });
};

exports.claimNextDeviceCommand = (req, res) => {
    const command = deviceService.claimNextCommand(req.params.id);

    if (command === null) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    res.json({
        success: true,
        data: command || null
    });
};

exports.ackDeviceCommand = (req, res) => {
    const command = deviceService.ackCommand(req.params.id, req.params.commandId, req.body || {});

    if (command === null) {
        return res.status(404).json({
            success: false,
            error: "Device not found"
        });
    }

    if (command === false) {
        return res.status(404).json({
            success: false,
            error: "Command not found"
        });
    }

    res.json({
        success: true,
        data: command
    });
};
