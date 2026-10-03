const express = require("express");

const {
    getWhatIfContextController,
    simulateWhatIfController,
    getWhatIfIncidentsController
} = require("../controllers/whatIfController");
const {
    recordWhatIfDecisionController
} = require("../controllers/whatIfDecisionController");

const router = express.Router();

router.get("/incidents", getWhatIfIncidentsController);
router.get("/", getWhatIfContextController);
router.post("/simulate", simulateWhatIfController);
router.post("/decisions", recordWhatIfDecisionController);

module.exports = router;
