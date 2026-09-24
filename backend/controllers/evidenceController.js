const {
    getInvestigation: getEvidenceInvestigation,
    getSummary: getEvidenceSummary,
    getDetails: getEvidenceDetails,
    getTimeline: getEvidenceTimeline,
    getMissing: getMissingEvidence
} = require("../services/evidenceInvestigationService");


// =========================================================
// GET COMPLETE EVIDENCE INVESTIGATION
// GET /api/evidence/:incidentId
// =========================================================

async function getInvestigation(req, res) {

    try {

        const { incidentId } =
            req.params;


        const data =
            await getEvidenceInvestigation(
                incidentId
            );


        return res.status(200).json({

            success: true,

            data

        });

    }

    catch (error) {

        console.error(
            "Evidence Investigation Error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load evidence investigation."

        });

    }

}


// =========================================================
// GET EVIDENCE SUMMARY
// GET /api/evidence/:incidentId/summary
// =========================================================

async function getSummary(req, res) {

    try {

        const { incidentId } =
            req.params;


        const summary =
            await getEvidenceSummary(
                incidentId
            );


        return res.status(200).json({

            success: true,

            data: summary

        });

    }

    catch (error) {

        console.error(
            "Evidence Summary Error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load evidence summary."

        });

    }

}


// =========================================================
// GET EVIDENCE DETAILS
// GET /api/evidence/:incidentId/details
// =========================================================

async function getDetails(req, res) {

    try {

        const { incidentId } =
            req.params;


        const evidence =
            await getEvidenceDetails(
                incidentId
            );


        return res.status(200).json({

            success: true,

            data: evidence

        });

    }

    catch (error) {

        console.error(
            "Evidence Details Error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load evidence details."

        });

    }

}


// =========================================================
// GET EVIDENCE TIMELINE
// GET /api/evidence/:incidentId/timeline
// =========================================================

async function getTimeline(req, res) {

    try {

        const { incidentId } =
            req.params;


        const timeline =
            await getEvidenceTimeline(
                incidentId
            );


        return res.status(200).json({

            success: true,

            data: timeline

        });

    }

    catch (error) {

        console.error(
            "Evidence Timeline Error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load evidence timeline."

        });

    }

}


// =========================================================
// GET MISSING EVIDENCE
// GET /api/evidence/:incidentId/missing
// =========================================================

async function getMissing(req, res) {

    try {

        const { incidentId } =
            req.params;


        const missingEvidence =
            await getMissingEvidence(
                incidentId
            );


        return res.status(200).json({

            success: true,

            data: missingEvidence

        });

    }

    catch (error) {

        console.error(
            "Missing Evidence Error:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Failed to load missing evidence."

        });

    }

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    getInvestigation,

    getSummary,

    getDetails,

    getTimeline,

    getMissing

};