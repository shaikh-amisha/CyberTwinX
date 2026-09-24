const express = require("express");

const router = express.Router();

const {
    getSecurityStateHistory
} = require(
    "../controllers/stateHistoryController"
);


// GET security state history

router.get(
    "/",
    getSecurityStateHistory
);


module.exports = router;