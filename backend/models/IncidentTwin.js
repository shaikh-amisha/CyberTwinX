const mongoose = require("mongoose");


/* =========================================================
   INCIDENT EVIDENCE
   ========================================================= */

const evidenceSchema = new mongoose.Schema(
    {
        evidenceId: {
            type: String,
            required: true
        },

        /* -------------------------------------------------
           EVIDENCE CATEGORY
        ------------------------------------------------- */

        category: {
            type: String,
            default: "OTHER"
        },

        /* -------------------------------------------------
           EVIDENCE TYPE
        ------------------------------------------------- */

        type: {
            type: String,
            required: true
        },

        /* -------------------------------------------------
           EVIDENCE TIMESTAMP
        ------------------------------------------------- */

        timestamp: {
            type: Date,
            default: Date.now
        },

        /* -------------------------------------------------
           SEVERITY
        ------------------------------------------------- */

        severity: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],
            default: "LOW"
        },

        /* -------------------------------------------------
           EVIDENCE STATUS
        ------------------------------------------------- */

        status: {
            type: String,
            enum: [
                "SUPPORTING",
                "CONTRADICTING",
                "NEUTRAL"
            ],
            default: "SUPPORTING"
        },

        /* -------------------------------------------------
           DESCRIPTION
        ------------------------------------------------- */

        description: {
            type: String,
            default: ""
        },

        /* -------------------------------------------------
           LINKED TELEMETRY
        ------------------------------------------------- */

        telemetryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Telemetry",
            default: null
        }

    },
    {
        _id: false
    }
);


/* =========================================================
   INCIDENT LIFECYCLE
   ========================================================= */

const lifecycleSchema = new mongoose.Schema(
    {
        state: {
            type: String,
            required: true
        },

        time: {
            type: Date,
            default: Date.now
        },

        description: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);


/* =========================================================
   INCIDENT TIMELINE
   ========================================================= */

const timelineSchema = new mongoose.Schema(
    {
        time: {
            type: Date,
            default: Date.now
        },

        title: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);


/* =========================================================
   INCIDENT TWIN SCHEMA
   ========================================================= */

const incidentTwinSchema = new mongoose.Schema(
    {

        /* -------------------------------------------------
           INCIDENT IDENTITY
        ------------------------------------------------- */

        incidentId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        incidentType: {
            type: String,
            required: true
        },

        severity: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],
            default: "LOW"
        },


        /* -------------------------------------------------
           INCIDENT STATE
        ------------------------------------------------- */

        currentState: {
            type: String,
            enum: [
                "DETECTED",
                "SUSPICIOUS",
                "COMPROMISED",
                "CONTAINED",
                "RESOLVED"
            ],
            default: "DETECTED"
        },

        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },


        /* -------------------------------------------------
           RISK
        ------------------------------------------------- */

        riskScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },

        riskLevel: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],
            default: "LOW"
        },


        /* -------------------------------------------------
           LINKED ENDPOINT
        ------------------------------------------------- */

        endpointId: {
            type: String,
            required: true,
            index: true
        },

        endpointHostname: {
            type: String,
            default: ""
        },

        endpointState: {
            type: String,
            default: ""
        },


        /* -------------------------------------------------
           EVIDENCE
        ------------------------------------------------- */

        evidence: {
            type: [evidenceSchema],
            default: []
        },


        /* -------------------------------------------------
           INCIDENT LIFECYCLE
        ------------------------------------------------- */

        lifecycle: {
            type: [lifecycleSchema],
            default: []
        },


        /* -------------------------------------------------
           ATTACK PROGRESSION
        ------------------------------------------------- */

        attackProgression: {
            type: [String],
            default: []
        },

        currentObjective: {
            type: String,
            default: ""
        },


        /* -------------------------------------------------
           INCIDENT TIMELINE
        ------------------------------------------------- */

        timeline: {
            type: [timelineSchema],
            default: []
        }

    },

    {
        timestamps: true
    }
);


/* =========================================================
   EXPORT MODEL
   ========================================================= */

module.exports = mongoose.model(
    "IncidentTwin",
    incidentTwinSchema
);