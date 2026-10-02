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


// Test Merkle Tree generation, MongoDB storage and blockchain anchoring.
async function testIntegrityService() {
    const testSuffix = crypto.randomUUID();

    const incidentId = `TEST-INTEGRITY-${testSuffix}`;
    const evidenceIds = [
        `TEST-EVIDENCE-A-${testSuffix}`,
        `TEST-EVIDENCE-B-${testSuffix}`
    ];

    try {
        // Ensure the required connection settings are configured.
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

        // Generate the Merkle Tree, save it and anchor its root on-chain.
        const result = await generateIncidentIntegrity(incidentId);

        console.log("Merkle Root generated:", result.merkleRoot);
        console.log("Evidence count:", result.leafCount);
        console.log("Root version:", result.version);
        console.log("Blockchain status:", result.blockchainStatus);
        console.log("Transaction hash:", result.transaction.transactionHash);

        if (result.blockchainStatus !== "ANCHORED") {
            throw new Error("The generated Merkle Root was not marked as ANCHORED.");
        }

        if (!result.transaction.transactionHash) {
            throw new Error("Blockchain transaction hash was not returned.");
        }

        // Retrieve the saved integrity document.
        const savedIntegrity = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!savedIntegrity) {
            throw new Error("Blockchain Integrity record was not saved.");
        }

        // Confirm the root, evidence records and transaction were stored.
        const savedVersion = savedIntegrity.rootVersions.find(
            item => item.version === result.version
        );

        if (
            !savedVersion ||
            savedVersion.merkleRoot !== result.merkleRoot ||
            savedVersion.evidenceRecords.length !== evidenceIds.length ||
            savedVersion.blockchainStatus !== "ANCHORED" ||
            savedVersion.transaction.transactionHash !== result.transaction.transactionHash ||
            savedVersion.transaction.blockNumber !== result.transaction.blockNumber ||
            savedVersion.transaction.contractAddress !== result.transaction.contractAddress ||
            savedVersion.transaction.chainId !== result.transaction.chainId ||
            savedVersion.transaction.registrar !== result.transaction.registrar
        ) {
            throw new Error("Saved integrity or transaction details do not match the generated result.");
        }

        if (
            !/^0x[0-9a-fA-F]{64}$/.test(result.transaction.transactionHash) ||
            !result.transaction.contractAddress ||
            !result.transaction.registrar ||
            !result.transaction.blockNumber
        ) {
            throw new Error("Blockchain transaction metadata is incomplete or invalid.");
        }

        console.log("Blockchain Integrity and transaction metadata storage successful.");

        // Verify the generated Merkle Root using the deployed smart contract.
        const { contract } = getBlockchainConnection();
        const onChainVerified = await contract.verifyMerkleRoot(
            incidentId,
            result.merkleRoot
        );

        if (!onChainVerified) {
            throw new Error("The generated Merkle Root could not be verified on-chain.");
        }

        // getLatestRoot returns a tuple: root, timestamp, registrar and version.
        const latestRootRecord = await contract.getLatestRoot(incidentId);
        const latestRoot = latestRootRecord[0];
        const latestRootVersion = latestRootRecord[3];

        if (String(latestRoot).toLowerCase() !== result.merkleRoot.toLowerCase()) {
            throw new Error("The latest on-chain Merkle Root does not match the generated root.");
        }

        if (latestRootVersion !== BigInt(result.version)) {
            throw new Error("The latest on-chain Merkle Root version is incorrect.");
        }

        // Confirm that the contract recorded the expected number of root versions.
        const rootHistoryLength = await contract.getRootHistoryLength(incidentId);

        if (rootHistoryLength !== BigInt(result.version)) {
            throw new Error("The on-chain Merkle Root history length is incorrect.");
        }

        console.log("On-chain Merkle Root and history verification successful.");

        // Confirm that hash-generation custody events were recorded.
        const hashEvents = await ChainOfCustody.find({
            incidentId,
            evidenceId: { $in: evidenceIds },
            eventType: "HASH_GENERATED"
        }).lean();

        if (hashEvents.length !== evidenceIds.length) {
            throw new Error("Expected HASH_GENERATED custody events were not found.");
        }

        // Confirm that blockchain anchoring custody events were recorded.
        const anchorEvents = await ChainOfCustody.find({
            incidentId,
            evidenceId: { $in: evidenceIds },
            eventType: "ROOT_ANCHORED"
        }).lean();

        if (anchorEvents.length !== evidenceIds.length) {
            throw new Error("Expected ROOT_ANCHORED custody events were not found.");
        }

        console.log("Chain of Custody hash and anchoring events successful.");
        console.log("FULL INTEGRITY WORKFLOW TEST PASSED");

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
