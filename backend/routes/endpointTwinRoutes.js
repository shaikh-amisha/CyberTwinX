const express = require("express");
const router = express.Router();

const {
  getEndpointTwin,
} = require("../controllers/endpointTwinController");

// GET current Endpoint Twin
router.get("/", getEndpointTwin);

module.exports = router;