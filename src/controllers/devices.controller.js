const deviceService = require("../services/devices.service");

exports.getDevices = (req, res) => {
    const devices = deviceService.getAll();

    res.json({
        success: true,
        data: devices
    });
};

exports.createDevice = (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: "Name is required"
        });
    }

    const device = deviceService.create({ name });

    res.status(201).json({
        success: true,
        data: device
    });
};

exports.deleteDevice = (req, res) => {
    const { id } = req.params;

    deviceService.remove(id);

    res.json({
        success: true
    });
};