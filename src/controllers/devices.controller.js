const deviceService = require("../services/devices.service");

exports.getDevices = (req, res) => {
    const devices = deviceService.getAll();

    res.json({
        success: true,
        data: devices
    });
};

exports.createDevice = (req, res) => {
    const { name, ip, type, firmware, capabilities } = req.body;

    if (!name || typeof name !== "string") {
        return res.status(400).json({
            success: false,
            error: "Name is required"
        });
    }

    const device = deviceService.create({ name, ip, type, firmware, capabilities });

    res.status(201).json({
        success: true,
        data: device
    });
};

exports.registerDevice = (req, res) => {
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
