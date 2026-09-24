const express = require("express");

const {
    receiveTelemetry
} = require("../controllers/telemetryController");

const router = express.Router();

// Receive telemetry from Linux Agent
router.post("/", receiveTelemetry);

module.exports = router;