const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();

const IncidentTwin = require("./models/IncidentTwin");
const BlockchainIntegrity = require("./models/BlockchainIntegrity");
const ChainOfCustody = require("./models/ChainOfCustody");

const {
    hashEvidenceSnapshot,
    verifyMerkleProof
} = require("./services/merkleService");

const {
    generateIncidentIntegrity
} = require("./services/integrityService");

const {
    getBlockchainConnection
} = require("./services/blockchainService");


// Test whether modified evidence is detected by its SHA-256 hash and Merkle Proof.
async function testEvidenceTampering() {
    const testSuffix = crypto.randomUUID();
    const incidentId = `TEST-TAMPERING-${testSuffix}`;
    const evidenceIds = [
        `TEST-TAMPER-EVIDENCE-A-${testSuffix}`,
        `TEST-TAMPER-EVIDENCE-B-${testSuffix}`
    ];

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from backend/.env");
        }

        // Connect to MongoDB.
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connection successful.");

        // Create temporary source evidence for this isolated test.
        await IncidentTwin.create({
            incidentId,
            incidentType: "EVIDENCE_TAMPERING_TEST",
            endpointId: "TEST-TAMPERING-ENDPOINT",
            evidence: [
                {
                    evidenceId: evidenceIds[0],
                    category: "NETWORK",
                    type: "SUSPICIOUS_CONNECTION",
                    timestamp: new Date(),
                    severity: "HIGH",
                    status: "SUPPORTING",
                    description: "Original evidence description A."
                },
                {
                    evidenceId: evidenceIds[1],
                    category: "ENDPOINT",
                    type: "UNUSUAL_PROCESS",
                    timestamp: new Date(),
                    severity: "MEDIUM",
                    status: "SUPPORTING",
                    description: "Original evidence description B."
                }
            ]
        });

        console.log("Temporary evidence records created.");

        // Generate hashes, Merkle Proofs and anchor the root on the local chain.
        const generated = await generateIncidentIntegrity(incidentId);

        if (generated.blockchainStatus !== "ANCHORED") {
            throw new Error("Test Merkle Root was not anchored on the blockchain.");
        }

        console.log("Temporary Merkle Root anchored:", generated.merkleRoot);

        // Load the saved evidence snapshots, hashes and proofs from MongoDB.
        const integrityRecord = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!integrityRecord) {
            throw new Error("Saved Blockchain Integrity record was not found.");
        }

        const rootVersion = integrityRecord.rootVersions.find(
            item => item.version === generated.version
        );

        if (!rootVersion || rootVersion.blockchainStatus !== "ANCHORED") {
            throw new Error("Saved Merkle Root version is not marked as ANCHORED.");
        }

        // Scenario A: Original evidence must pass hash and Merkle Proof checks.
        for (const evidenceRecord of rootVersion.evidenceRecords) {
            const recalculatedHash = `0x${hashEvidenceSnapshot(evidenceRecord.snapshot)}`;

            if (recalculatedHash !== evidenceRecord.evidenceHash) {
                throw new Error(
                    `Original SHA-256 hash mismatch for ${evidenceRecord.evidenceId}.`
                );
            }

            const originalProofValid = verifyMerkleProof(
                recalculatedHash,
                evidenceRecord.merkleProof,
                rootVersion.merkleRoot
            );

            if (!originalProofValid) {
                throw new Error(
                    `Original Merkle Proof failed for ${evidenceRecord.evidenceId}.`
                );
            }
        }

        console.log("SCENARIO A PASSED: Original evidence hashes and Merkle Proofs are valid.");

        // Scenario B: Change a copy of one evidence snapshot to simulate tampering.
        const targetEvidence = rootVersion.evidenceRecords[0];
        const tamperedSnapshot = JSON.parse(
            JSON.stringify(targetEvidence.snapshot)
        );

        tamperedSnapshot.description = "TAMPERED: Evidence description was modified.";

        const tamperedHash = `0x${hashEvidenceSnapshot(tamperedSnapshot)}`;

        if (tamperedHash === targetEvidence.evidenceHash) {
            throw new Error("Tampered evidence unexpectedly produced the original SHA-256 hash.");
        }

        console.log("Original evidence hash:", targetEvidence.evidenceHash);
        console.log("Tampered evidence hash:", tamperedHash);

        // The modified evidence must not validate against the original Merkle Proof.
        const tamperedProofValid = verifyMerkleProof(
            tamperedHash,
            targetEvidence.merkleProof,
            rootVersion.merkleRoot
        );

        if (tamperedProofValid) {
            throw new Error("Tampered evidence incorrectly passed Merkle Proof verification.");
        }

        console.log("SCENARIO B PASSED: Tampered evidence was detected.");

        // Confirm that the original root remains anchored on the blockchain.
        const { contract } = getBlockchainConnection();
        const onChainVerified = await contract.verifyMerkleRoot(
            incidentId,
            rootVersion.merkleRoot
        );

        if (!onChainVerified) {
            throw new Error("Original Merkle Root could not be verified on-chain.");
        }

        console.log("Original Merkle Root remains verified on-chain.");
        console.log("EVIDENCE TAMPERING DETECTION TEST PASSED");

    } catch (error) {
        console.error("TEST FAILED:", error.message);
        process.exitCode = 1;

    } finally {
        // Remove only temporary MongoDB records created by this test.
        try {
            await Promise.all([
                IncidentTwin.deleteOne({ incidentId }),
                BlockchainIntegrity.deleteOne({ incidentId }),
                ChainOfCustody.deleteMany({ incidentId })
            ]);

            console.log("Temporary MongoDB test records cleaned up.");
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


// Run the tampering test.
testEvidenceTampering();
