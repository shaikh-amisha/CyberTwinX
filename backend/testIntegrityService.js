const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const IncidentTwin = require("./models/IncidentTwin");
const BlockchainIntegrity = require("./models/BlockchainIntegrity");
const ChainOfCustody = require("./models/ChainOfCustody");

const {
    generateIncidentIntegrity
} = require("./services/integrityService");


// Test Merkle Tree generation and MongoDB integrity storage.
async function testIntegrityService() {
    const testSuffix = crypto.randomUUID();

    const incidentId = `TEST-INTEGRITY-${testSuffix}`;
    const evidenceIds = [
        `TEST-EVIDENCE-A-${testSuffix}`,
        `TEST-EVIDENCE-B-${testSuffix}`
    ];

    try {
        // Ensure the MongoDB connection string is configured.
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from backend/.env");
        }

        // Connect to the CyberTwinX MongoDB database.
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connection successful.");

        // Create a temporary Incident Twin with two evidence records.
        await IncidentTwin.create({
            incidentId,
            incidentType: "INTEGRITY_TEST",
            endpointId: "TEST-ENDPOINT",
            evidence: [
                {
                    evidenceId: evidenceIds[0],
                    category: "NETWORK",
                    type: "SUSPICIOUS_CONNECTION",
                    timestamp: new Date(),
                    severity: "HIGH",
                    status: "SUPPORTING",
                    description: "Temporary evidence record A."
                },
                {
                    evidenceId: evidenceIds[1],
                    category: "ENDPOINT",
                    type: "UNUSUAL_PROCESS",
                    timestamp: new Date(),
                    severity: "MEDIUM",
                    status: "SUPPORTING",
                    description: "Temporary evidence record B."
                }
            ]
        });

        console.log("Temporary Incident Twin created.");

        // Generate the Merkle Tree and save its integrity record.
        const result = await generateIncidentIntegrity(incidentId);

        console.log("Merkle Root generated:", result.merkleRoot);
        console.log("Evidence count:", result.leafCount);
        console.log("Root version:", result.version);

        // Retrieve the saved integrity document.
        const savedIntegrity = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!savedIntegrity) {
            throw new Error("Blockchain Integrity record was not saved.");
        }

        // Confirm the generated root and evidence records were stored.
        const savedVersion = savedIntegrity.rootVersions.find(
            item => item.version === result.version
        );

        if (
            !savedVersion ||
            savedVersion.merkleRoot !== result.merkleRoot ||
            savedVersion.evidenceRecords.length !== evidenceIds.length
        ) {
            throw new Error("Saved Merkle Root version does not match the generated result.");
        }

        console.log("Blockchain Integrity MongoDB storage successful.");

        // Retrieve the generated custody events.
        const custodyEvents = await ChainOfCustody.find({
            incidentId,
            evidenceId: { $in: evidenceIds },
            eventType: "HASH_GENERATED"
        }).lean();

        if (custodyEvents.length !== evidenceIds.length) {
            throw new Error("Expected HASH_GENERATED custody events were not found.");
        }

        console.log("Chain of Custody event creation successful.");
        console.log("TEST PASSED");

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exitCode = 1;

    } finally {
        // Remove only the temporary records created by this test.
        try {
            await Promise.all([
                IncidentTwin.deleteOne({ incidentId }),
                BlockchainIntegrity.deleteOne({ incidentId }),
                ChainOfCustody.deleteMany({ incidentId })
            ]);

            console.log("Temporary test records cleaned up.");
        } catch (cleanupError) {
            console.error(
                "Could not clean up temporary test records:",
                cleanupError.message
            );
            process.exitCode = 1;
        }

        await mongoose.disconnect();
    }
}


// Run the test.
testIntegrityService();
