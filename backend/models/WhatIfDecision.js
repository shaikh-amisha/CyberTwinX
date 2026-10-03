const mongoose = require("mongoose");

const whatIfDecisionSchema = new mongoose.Schema(
    {
        incidentId: { type: String, required: true, index: true },
        endpointId: { type: String, default: "" },
        stage: { type: String, required: true },
        response: { type: String, required: true },
        responseAction: { type: String, default: "" },
        simulatedResult: { type: mongoose.Schema.Types.Mixed, required: true },
        decision: { type: String, enum: ["APPROVED", "REJECTED"], required: true },
        timestamp: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

module.exports = mongoose.model("WhatIfDecision", whatIfDecisionSchema);
