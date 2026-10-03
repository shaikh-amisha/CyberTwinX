const IncidentTwin = require("../models/IncidentTwin");

const {
    getInvestigation: getEvidenceInvestigation,
    getSummary: getEvidenceSummary,
    getDetails: getEvidenceDetails,
    getTimeline: getEvidenceTimeline,
    getMissing: getMissingEvidence
} = require("../services/evidenceInvestigationService");

async function getInvestigation(req, res) {
    try {
        const { incidentId } = req.params;
        const data = await getEvidenceInvestigation(incidentId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Evidence Investigation Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load evidence investigation."
        });
    }
}

async function getSummary(req, res) {
    try {
        const { incidentId } = req.params;
        const summary = await getEvidenceSummary(incidentId);
        return res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error("Evidence Summary Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load evidence summary."
        });
    }
}

async function getDetails(req, res) {
    try {
        const { incidentId } = req.params;
        const evidence = await getEvidenceDetails(incidentId);
        return res.status(200).json({ success: true, data: evidence });
    } catch (error) {
        console.error("Evidence Details Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load evidence details."
        });
    }
}

async function getTimeline(req, res) {
    try {
        const { incidentId } = req.params;
        const timeline = await getEvidenceTimeline(incidentId);
        return res.status(200).json({ success: true, data: timeline });
    } catch (error) {
        console.error("Evidence Timeline Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load evidence timeline."
        });
    }
}

async function getMissing(req, res) {
    try {
        const { incidentId } = req.params;
        const missingEvidence = await getMissingEvidence(incidentId);
        return res.status(200).json({ success: true, data: missingEvidence });
    } catch (error) {
        console.error("Missing Evidence Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to load missing evidence."
        });
    }
}

async function requestEvidence(req, res) {
    try {
        const { incidentId } = req.params;
        const category = String(req.body?.category || "").trim().toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");

        const labels = {
            AUTHENTICATION: "Authentication Evidence",
            PRIVILEGE: "Privilege Evidence",
            PROCESS: "Process Evidence",
            NETWORK: "Network Evidence",
            FILE_INTEGRITY: "File Integrity Evidence"
        };

        if (!labels[category]) {
            return res.status(400).json({
                success: false,
                message: "Unsupported evidence category."
            });
        }

        const incident = await IncidentTwin.findOne({ incidentId });

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found."
            });
        }

        if (!Array.isArray(incident.timeline)) {
            incident.timeline = [];
        }

        incident.timeline.push({
            time: new Date(),
            title: "Evidence Requested",
            description: `${labels[category]} requested for the investigation.`
        });

        await incident.save();

        return res.status(200).json({
            success: true,
            message: `${labels[category]} request recorded.`,
            data: {
                incidentId,
                category,
                label: labels[category]
            }
        });
    } catch (error) {
        console.error("Evidence Request Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to request evidence."
        });
    }
}

module.exports = {
    getInvestigation,
    getSummary,
    getDetails,
    getTimeline,
    getMissing,
    requestEvidence
};
