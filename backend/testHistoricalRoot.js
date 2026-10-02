const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const IncidentTwin = require("./models/IncidentTwin");
const BlockchainIntegrity = require("./models/BlockchainIntegrity");
const ChainOfCustody = require("./models/ChainOfCustody");

const {
    getBlockchainConnection
} = require("./services/blockchainService");

const {
    generateIncidentIntegrity
} = require("./services/integrityService");


// Test historical Merkle Root verification after a new version is anchored.
async function testHistoricalRootVerification() {
    const testSuffix = crypto.randomUUID();
    const incidentId = `TEST-HISTORICAL-ROOT-${testSuffix}`;

    const evidenceIds = [
        `TEST-HISTORY-EVIDENCE-A-${testSuffix}`,
        `TEST-HISTORY-EVIDENCE-B-${testSuffix}`,
        `TEST-HISTORY-EVIDENCE-C-${testSuffix}`
    ];

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from backend/.env");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connection successful.");

        // Create Version 1 with two evidence records.
        await IncidentTwin.create({
            incidentId,
            incidentType: "HISTORICAL_ROOT_TEST",
            endpointId: "TEST-HISTORICAL-ENDPOINT",
            evidence: [
                {
                    evidenceId: evidenceIds[0],
                    category: "NETWORK",
                    type: "SUSPICIOUS_CONNECTION",
                    timestamp: new Date(),
                    severity: "HIGH",
                    status: "SUPPORTING",
                    description: "Original evidence record A."
                },
                {
                    evidenceId: evidenceIds[1],
                    category: "ENDPOINT",
                    type: "UNUSUAL_PROCESS",
                    timestamp: new Date(),
                    severity: "MEDIUM",
                    status: "SUPPORTING",
                    description: "Original evidence record B."
                }
            ]
        });

        console.log("Incident created with two evidence records.");

        // Generate and anchor the first Merkle Root.
        const version1 = await generateIncidentIntegrity(incidentId);

        if (version1.version !== 1 || version1.blockchainStatus !== "ANCHORED") {
            throw new Error("Version 1 was not successfully anchored.");
        }

        console.log("Version 1 anchored:", version1.merkleRoot);

        // Add a new evidence record to the same Incident Twin.
        const updateResult = await IncidentTwin.updateOne(
            { incidentId },
            {
                $push: {
                    evidence: {
                        evidenceId: evidenceIds[2],
                        category: "NETWORK",
                        type: "UNAUTHORIZED_ACCESS",
                        timestamp: new Date(),
                        severity: "CRITICAL",
                        status: "SUPPORTING",
                        description: "New evidence record added for Version 2."
                    }
                }
            }
        );

        if (updateResult.modifiedCount !== 1) {
            throw new Error("The new evidence record could not be added.");
        }

        console.log("New evidence record added to the Incident Twin.");

        // Generate and anchor Version 2 using all three evidence records.
        const version2 = await generateIncidentIntegrity(incidentId);

        if (version2.version !== 2 || version2.blockchainStatus !== "ANCHORED") {
            throw new Error("Version 2 was not successfully anchored.");
        }

        if (version1.merkleRoot === version2.merkleRoot) {
            throw new Error("The Merkle Root did not change after evidence was added.");
        }

        if (version2.leafCount !== 3) {
            throw new Error("Version 2 does not contain all three evidence records.");
        }

        console.log("Version 2 anchored:", version2.merkleRoot);
        console.log("Version 2 evidence count:", version2.leafCount);

        // Confirm both versions were persisted in MongoDB.
        const savedIntegrity = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!savedIntegrity || savedIntegrity.rootVersions.length !== 2) {
            throw new Error("MongoDB does not contain exactly two root versions.");
        }

        const savedVersion1 = savedIntegrity.rootVersions.find(
            item => item.version === 1
        );

        const savedVersion2 = savedIntegrity.rootVersions.find(
            item => item.version === 2
        );

        if (
            !savedVersion1 ||
            !savedVersion2 ||
            savedVersion1.merkleRoot !== version1.merkleRoot ||
            savedVersion2.merkleRoot !== version2.merkleRoot ||
            savedVersion1.blockchainStatus !== "ANCHORED" ||
            savedVersion2.blockchainStatus !== "ANCHORED"
        ) {
            throw new Error("MongoDB root version history is incomplete or incorrect.");
        }

        console.log("MongoDB historical root versions 1 and 2 verified.");

        // Verify both historical versions and the latest version on-chain.
        const { contract } = getBlockchainConnection();

        const historyLength = await contract.getRootHistoryLength(incidentId);

        if (historyLength !== 2n) {
            throw new Error("On-chain root history length is not 2.");
        }

        const historicalVersion1Valid = await contract.verifyHistoricalRoot(
            incidentId,
            1,
            version1.merkleRoot
        );

        const historicalVersion2Valid = await contract.verifyHistoricalRoot(
            incidentId,
            2,
            version2.merkleRoot
        );

        if (!historicalVersion1Valid || !historicalVersion2Valid) {
            throw new Error("One or more historical Merkle Roots failed verification.");
        }

        // Confirm that the old root is no longer the latest root.
        const oldRootIsLatest = await contract.verifyMerkleRoot(
            incidentId,
            version1.merkleRoot
        );

        const newRootIsLatest = await contract.verifyMerkleRoot(
            incidentId,
            version2.merkleRoot
        );

        if (oldRootIsLatest || !newRootIsLatest) {
            throw new Error("Latest-root verification returned an unexpected result.");
        }

        // Check the latest root record and its version number.
        const latestRecord = await contract.getLatestRoot(incidentId);

        if (
            String(latestRecord[0]).toLowerCase() !== version2.merkleRoot.toLowerCase() ||
            latestRecord[3] !== 2n
        ) {
            throw new Error("The latest on-chain root record is not Version 2.");
        }

        // Read both root records directly from the contract history.
        const onChainVersion1 = await contract.getRootRecord(incidentId, 0);
        const onChainVersion2 = await contract.getRootRecord(incidentId, 1);

        if (
            String(onChainVersion1[0]).toLowerCase() !== version1.merkleRoot.toLowerCase() ||
            onChainVersion1[3] !== 1n ||
            String(onChainVersion2[0]).toLowerCase() !== version2.merkleRoot.toLowerCase() ||
            onChainVersion2[3] !== 2n
        ) {
            throw new Error("On-chain root records do not match the two generated versions.");
        }

        console.log("Historical Version 1 verification successful.");
        console.log("Historical Version 2 verification successful.");
        console.log("Latest root correctly points to Version 2.");
        console.log("Previous Version 1 remains available in on-chain history.");

        // Confirm that the chain-of-custody log records the re-anchoring.
        const reanchorEvents = await ChainOfCustody.find({
            incidentId,
            eventType: "ROOT_REANCHORED"
        }).lean();

        if (reanchorEvents.length !== evidenceIds.length) {
            throw new Error("Expected ROOT_REANCHORED custody events were not found.");
        }

        console.log("Chain of Custody re-anchoring events verified.");
        console.log("HISTORICAL ROOT VERIFICATION TEST PASSED");

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exitCode = 1;

    } finally {
        try {
            await Promise.all([
                IncidentTwin.deleteOne({ incidentId }),
                BlockchainIntegrity.deleteOne({ incidentId }),
                ChainOfCustody.deleteMany({ incidentId })
            ]);

            console.log("Temporary MongoDB test records cleaned up.");
        } catch (cleanupError) {
            console.error(
                "Could not clean up temporary MongoDB test records:",
                cleanupError.message
            );
            process.exitCode = 1;
        }

        await mongoose.disconnect();
    }
}

testHistoricalRootVerification();
