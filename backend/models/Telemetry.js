const mongoose = require("mongoose");

const TelemetrySchema = new mongoose.Schema(
    {
        agent: {
            name: String,
            version: String,
            platform: String
        },

        timestamp: {
            type: Date,
            default: Date.now
        },

        telemetry: {
            system: mongoose.Schema.Types.Mixed,
            resources: mongoose.Schema.Types.Mixed,
            processes: mongoose.Schema.Types.Mixed,
            network: mongoose.Schema.Types.Mixed,
            users: mongoose.Schema.Types.Mixed,
            authentication: mongoose.Schema.Types.Mixed,
            services: mongoose.Schema.Types.Mixed,
            files: mongoose.Schema.Types.Mixed,
            logs: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Telemetry", TelemetrySchema);