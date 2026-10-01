const mongoose = require("mongoose");

// Store the identity of the person or system responsible for an event.
const actorSchema = new mongoose.Schema(
    {
        actorId: {
            type: String,
            default: "SYSTEM"
        },

        actorRole: {
            type: String,
            default: "SYSTEM"
        }
    },
    { _id: false }
);


// Store integrity information associated with a custody event.
const integritySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: [
                "NOT_CHECKED",
                "PENDING",
                "VERIFIED",
                "FAILED"
            ],
            default: "NOT_CHECKED"
        },

        evidenceHash: {
            type: String,
            default: null
        },

        merkleRoot: {
            type: String,
            default: null
        },

        rootVersion: {
            type: Number,
            default: null
        }
    },
    { _id: false }
);


// Store one chain-of-custody event.
const chainOfCustodySchema = new mongoose.Schema(
    {
        // Unique identifier for this custody event.
        eventId: {
            type: String,
            required: true,
            unique: true
        },

        // Incident associated with this event.
        incidentId: {
            type: String,
            required: true,
            index: true
        },

        // Evidence record associated with this event.
        evidenceId: {
            type: String,
            required: true,
            index: true
        },

        // Type of action recorded in the custody history.
        eventType: {
            type: String,
            required: true,
            enum: [
                "EVIDENCE_CREATED",
                "HASH_GENERATED",
                "ROOT_ANCHORED",
                "EVIDENCE_ACCESSED",
                "VERIFICATION_PASSED",
                "INTEGRITY_FAILED",
                "ROOT_REANCHORED"
            ]
        },

        // Person or system that performed the action.
        actor: {
            type: actorSchema,
            default: () => ({})
        },

        // Time at which the custody event occurred.
        timestamp: {
            type: Date,
            default: Date.now,
            required: true
        },

        // Integrity state and related hashes at the time of the event.
        integrity: {
            type: integritySchema,
            default: () => ({})
        },

        // Additional explanation about the recorded action.
        details: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);


// Create and export the ChainOfCustody model.
module.exports = mongoose.model(
    "ChainOfCustody",
    chainOfCustodySchema
);
