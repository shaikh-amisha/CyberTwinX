const express = require("express");

const {
    getInvestigation,
    getSummary,
    getDetails,
    getTimeline,
    getMissing
} = require("../controllers/evidenceController");

const router = express.Router();


// =========================================================
// COMPLETE EVIDENCE INVESTIGATION
// GET /api/evidence/:incidentId
// =========================================================

router.get(
    "/:incidentId",
    getInvestigation
);


// =========================================================
// EVIDENCE SUMMARY
// GET /api/evidence/:incidentId/summary
// =========================================================

router.get(
    "/:incidentId/summary",
    getSummary
);


// =========================================================
// EVIDENCE DETAILS
// GET /api/evidence/:incidentId/details
// =========================================================

router.get(
    "/:incidentId/details",
    getDetails
);


// =========================================================
// EVIDENCE TIMELINE
// GET /api/evidence/:incidentId/timeline
// =========================================================

router.get(
    "/:incidentId/timeline",
    getTimeline
);


// =========================================================
// MISSING EVIDENCE
// GET /api/evidence/:incidentId/missing
// =========================================================

router.get(
    "/:incidentId/missing",
    getMissing
);


module.exports = router;