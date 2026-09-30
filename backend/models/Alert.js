const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
    alertId: { type: String, unique: true, required: true },
    endpointId: { type: String, default: "Unknown" },
    hostname: { type: String, default: "Unknown" },
    incidentId: { type: String, default: null },
    detectionType: { type: String, required: true },
    severity: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM"
    },
    count: { type: Number, default: 0 },
    description: { type: String, default: "" },
    category: { type: String, default: "SECURITY" },
    detectedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Alert", AlertSchema);
