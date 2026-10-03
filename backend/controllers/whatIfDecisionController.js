const WhatIfDecision = require("../models/WhatIfDecision");

async function recordWhatIfDecisionController(req, res) {
    try {
        const {
            incidentId,
            endpointId,
            stage,
            response,
            responseAction,
            simulatedResult,
            decision,
            timestamp
        } = req.body;

        if (!incidentId || !stage || !response || !simulatedResult || !decision) {
            return res.status(400).json({
                success: false,
                message: "Incident, stage, response, simulated result and decision are required."
            });
        }

        const record = await WhatIfDecision.create({
            incidentId,
            endpointId: endpointId || "",
            stage,
            response,
            responseAction: responseAction || "",
            simulatedResult,
            decision,
            timestamp: timestamp ? new Date(timestamp) : new Date()
        });

        return res.status(201).json({
            success: true,
            data: {
                id: record._id,
                incidentId: record.incidentId,
                stage: record.stage,
                response: record.response,
                decision: record.decision,
                timestamp: record.timestamp
            }
        });
    } catch (error) {
        console.error("[What-If] Decision persistence error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to record What-If decision.",
            error: error.message
        });
    }
}

module.exports = { recordWhatIfDecisionController };
