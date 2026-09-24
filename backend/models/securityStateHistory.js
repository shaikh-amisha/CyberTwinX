const mongoose = require("mongoose");

const SecurityStateHistorySchema = new mongoose.Schema(
    {
        endpointId: {
            type: String,
            required: true,
            index: true
        },

        state: {
            type: String,
            enum: [
                "NORMAL",
                "SUSPICIOUS",
                "COMPROMISED",
                "UNKNOWN"
            ],
            required: true
        },

        riskScore: {
            type: Number,
            default: 0
        },

        riskLevel: {
            type: String,
            default: "LOW"
        },

        confidence: {
            type: Number,
            default: 0
        },

        findings: {
            type: Array,
            default: []
        },

        changedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "SecurityStateHistory",
        SecurityStateHistorySchema
    );