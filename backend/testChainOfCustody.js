const mongoose = require("mongoose");
require("dotenv").config();

const {
    recordCustodyEvent,
    getEvidenceCustodyHistory
} = require("./services/chainOfCustodyService");

const ChainOfCustody = require("./models/ChainOfCustody");


async function testChainOfCustody() {
    let createdEvent = null;

    try {
        // Connect to the existing CyberTwinX MongoDB database.
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from backend/.env");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connection successful.");

        // Use dedicated temporary identifiers for this test.
        const incidentId = "TEST-INCIDENT-001";
        const evidenceId = "TEST-EVIDENCE-001";

        // Record a temporary evidence creation event.
        createdEvent = await recordCustodyEvent({
            incidentId,
            evidenceId,
            eventType: "EVIDENCE_CREATED",
            actor: {
                actorId: "TEST-USER",
                actorRole: "INVESTIGATOR"
            },
            integrity: {
                status: "NOT_CHECKED"
            },
            details: "Temporary Chain of Custody test event."
        });

        console.log("Custody event created:", createdEvent.eventId);

        // Retrieve the event using its incident and evidence identifiers.
        const history = await getEvidenceCustodyHistory(
            incidentId,
            evidenceId
        );

        // Confirm that the newly created event can be retrieved.
        const eventFound = history.some(
            event => event.eventId === createdEvent.eventId
        );

        if (!eventFound) {
            throw new Error("The created custody event could not be retrieved.");
        }

        console.log("Custody event retrieval successful.");
        console.log("TEST PASSED");

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exitCode = 1;

    } finally {
        // Delete only the temporary event created by this test.
        if (createdEvent) {
            try {
                await ChainOfCustody.deleteOne({
                    eventId: createdEvent.eventId
                });

                console.log("Temporary test event cleaned up.");
            } catch (cleanupError) {
                console.error(
                    "Could not clean up temporary test event:",
                    cleanupError.message
                );
                process.exitCode = 1;
            }
        }

        await mongoose.disconnect();
    }
}


// Run the test.
testChainOfCustody();
