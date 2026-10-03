const express = require("express");

const {
    getInvestigation,
    getSummary,
    getDetails,
    getTimeline,
    getMissing,
    requestEvidence
} = require("../controllers/evidenceController");

const router = express.Router();

router.get(
    "/:incidentId",
    getInvestigation
);

router.get(
    "/:incidentId/summary",
    getSummary
);

router.get(
    "/:incidentId/details",
    getDetails
);

router.get(
    "/:incidentId/timeline",
    getTimeline
);

router.get(
    "/:incidentId/missing",
    getMissing
);

router.post(
    "/:incidentId/evidence/request",
    requestEvidence
);

module.exports = router;
