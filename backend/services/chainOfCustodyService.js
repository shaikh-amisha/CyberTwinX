const crypto = require("crypto");
const ChainOfCustody = require("../models/ChainOfCustody");


// Record a new event in the evidence chain of custody.
async function recordCustodyEvent({
    incidentId,
    evidenceId,
    eventType,
    actor,
    timestamp,
    integrity,
    details
}) {

    // Ensure the event is linked to an incident and evidence record.
    if (!incidentId || !evidenceId) {
        const error = new Error(
            "Incident ID and Evidence ID are required."
        );
        error.statusCode = 400;
        throw error;
    }

    // Ensure an event type has been provided.
    if (!eventType) {
        const error = new Error(
            "Custody event type is required."
        );
        error.statusCode = 400;
        throw error;
    }

    // Generate a unique ID for this custody event.
    const eventId = crypto.randomUUID();

    // Create and save the custody event in MongoDB.
    const custodyEvent = await ChainOfCustody.create({
        eventId,
        incidentId,
        evidenceId,
        eventType,

        // Use SYSTEM when no actor information is supplied.
        // API controllers should provide actor details from authenticated identity.
        actor: actor || {
            actorId: "SYSTEM",
            actorRole: "SYSTEM"
        },

        timestamp: timestamp || new Date(),

        // Store the integrity details available at the time of the event.
        integrity: integrity || {},

        details: details || ""
    });

    return custodyEvent;
}


// Retrieve the custody history for an incident.
async function getIncidentCustodyHistory(incidentId) {

    if (!incidentId) {
        const error = new Error("Incident ID is required.");
        error.statusCode = 400;
        throw error;
    }

    return ChainOfCustody.find({ incidentId })
        .sort({ timestamp: 1, createdAt: 1 })
        .lean();
}


// Retrieve the custody history for one evidence record.
async function getEvidenceCustodyHistory(incidentId, evidenceId) {

    if (!incidentId || !evidenceId) {
        const error = new Error(
            "Incident ID and Evidence ID are required."
        );
        error.statusCode = 400;
        throw error;
    }

    return ChainOfCustody.find({
        incidentId,
        evidenceId
    })
        .sort({ timestamp: 1, createdAt: 1 })
        .lean();
}


// Export the custody service functions.
module.exports = {
    recordCustodyEvent,
    getIncidentCustodyHistory,
    getEvidenceCustodyHistory
};
