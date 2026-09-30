const express = require("express");
const { streamAlerts, getRecentAlerts } = require("../controllers/alertController");

const router = express.Router();

router.get("/stream", streamAlerts);
router.get("/recent", getRecentAlerts);

module.exports = router;
