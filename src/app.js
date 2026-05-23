const express = require('express');
const devicesRoutes = require('./routes/devices.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(express.json({ limit: '128kb' }));

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
    res.json({
        success: true,
        status: "OK",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use('/api/v1/devices', devicesRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Not Found"
    });
});

app.use(errorMiddleware);

module.exports = app;
