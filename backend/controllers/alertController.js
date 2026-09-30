const Alert = require("../models/Alert");
const {
    addSubscriber,
    removeSubscriber
} = require("../services/alertService");

const streamAlerts = (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write("retry: 3000\n\n");
    addSubscriber(res);

    const heartbeat = setInterval(() => {
        try {
            res.write(": heartbeat\n\n");
        } catch (error) {
            clearInterval(heartbeat);
            removeSubscriber(res);
        }
    }, 25000);

    req.on("close", () => {
        clearInterval(heartbeat);
        removeSubscriber(res);
    });
};

const getRecentAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find({})
            .sort({ detectedAt: -1 })
            .limit(20)
            .lean();

        res.json({ success: true, alerts });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch alerts",
            error: error.message
        });
    }
};

module.exports = { streamAlerts, getRecentAlerts };
