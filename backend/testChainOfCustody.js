const mongoose = require("mongoose");
require("dotenv").config();

const {
    recordCustodyEvent,
    getEvidenceCustodyHistory
} = require("./services/chainOfCustodyService");

const ChainOfCustody = require("./models/ChainOfCustody");

function getTestMongoUri() {
    const uri = process.env.TEST_MONGODB_URI;

    if (!uri) {
        throw new Error("TEST_MONGODB_URI is missing from backend/.env");
    }

    let databaseName;
    try {
        databaseName = new URL(uri).pathname.replace(/^\/+/, "").split("/")[0];
    } catch {
        throw new Error("TEST_MONGODB_URI is not a valid MongoDB connection URI.");
    }

    if (databaseName !== "CyberTwinX_Test") {
        throw new Error(
            `Refusing to run test against database "${databaseName}". Expected "CyberTwinX_Test".`
        );
    }

    return uri;
}

async function testChainOfCustody() {
    let createdEvent = null;

    try {
        // Refuse to connect to the normal CyberTwinX database.
        await mongoose.connect(getTestMongoUri());
        console.log("Connected to isolated CyberTwinX_Test database.");

        const incidentId = "TEST-INCIDENT-001";
        const evidenceId = "TEST-EVIDENCE-001";

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

        const history = await getEvidenceCustodyHistory(incidentId, evidenceId);
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
        if (createdEvent) {
            try {
                await ChainOfCustody.deleteOne({ eventId: createdEvent.eventId });
                console.log("Temporary test event cleaned up.");
            } catch (cleanupError) {
                console.error("Could not clean up temporary test event:", cleanupError.message);
                process.exitCode = 1;
            }
        }

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

testChainOfCustody();
