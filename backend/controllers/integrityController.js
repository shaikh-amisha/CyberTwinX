const BlockchainIntegrity = require("../models/BlockchainIntegrity");
const IncidentTwin = require("../models/IncidentTwin");

const {
    getBlockchainConnection,
    getBlockchainStatus
} = require("../services/blockchainService");

const {
    generateIncidentIntegrity
} = require("../services/integrityService");

const {
    getIncidentCustodyHistory
} = require("../services/chainOfCustodyService");

const {
    createEvidenceSnapshot,
    hashEvidenceSnapshot,
    verifyMerkleProof
} = require("../services/merkleService");


// Generate and anchor a new integrity version for an incident.
async function generateIntegrity(req, res) {
    try {
        const { incidentId } = req.params;
        const result = await generateIncidentIntegrity(incidentId);

        return res.status(201).json({
            success: true,
            message: "Incident integrity generated and anchored successfully.",
            data: result
        });
    } catch (error) {
        console.error("[Integrity] Generation Error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to generate incident integrity."
        });
    }
}


// Retrieve all saved integrity versions for an incident.
async function getIntegrity(req, res) {
    try {
        const { incidentId } = req.params;

        const integrity = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!integrity) {
            return res.status(404).json({
                success: false,
                message: "Blockchain Integrity record not found.",
                incidentId
            });
        }

        return res.status(200).json({
            success: true,
            data: integrity
        });
    } catch (error) {
        console.error("[Integrity] Retrieval Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve Blockchain Integrity records."
        });
    }
}


// Retrieve the Chain of Custody history for an incident.
async function getCustodyHistory(req, res) {
    try {
        const { incidentId } = req.params;
        const events = await getIncidentCustodyHistory(incidentId);

        return res.status(200).json({
            success: true,
            incidentId,
            count: events.length,
            data: events
        });
    } catch (error) {
        console.error("[Integrity] Custody Retrieval Error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to retrieve Chain of Custody history."
        });
    }
}


// Check the blockchain network and deployed contract connection.
async function getIntegrityBlockchainStatus(req, res) {
    try {
        const status = await getBlockchainStatus();

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error("[Integrity] Blockchain Status Error:", error);

        return res.status(503).json({
            success: false,
            message: error.message || "Blockchain connection is unavailable."
        });
    }
}


// Verify one saved root version, its evidence proofs and its on-chain record.
async function verifyIntegrityVersion(req, res) {
    try {
        const { incidentId, version: versionParam } = req.params;
        const versionNumber = Number(versionParam);

        if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
            return res.status(400).json({
                success: false,
                message: "Version must be a positive integer."
            });
        }

        const integrity = await BlockchainIntegrity.findOne({
            incidentId
        }).lean();

        if (!integrity) {
            return res.status(404).json({
                success: false,
                message: "Blockchain Integrity record not found.",
                incidentId
            });
        }

        const rootVersion = integrity.rootVersions.find(
            item => item.version === versionNumber
        );

        if (!rootVersion) {
            return res.status(404).json({
                success: false,
                message: "Requested Merkle Root version was not found.",
                incidentId,
                version: versionNumber
            });
        }

        // Load the current Incident Twin evidence to detect changes made after anchoring.
        const incident = await IncidentTwin.findOne({
            incidentId
        }).lean();

        const currentEvidence = Array.isArray(incident?.evidence)
            ? incident.evidence
            : [];

        const evidenceResults = rootVersion.evidenceRecords.map(record => {
            // First verify that the originally saved snapshot still matches its stored hash.
            const calculatedHash = `0x${hashEvidenceSnapshot(record.snapshot)}`;
            const hashMatches = calculatedHash.toLowerCase() ===
                record.evidenceHash.toLowerCase();

            // Verify the saved evidence proof against the anchored Merkle Root.
            const proofValid = hashMatches && verifyMerkleProof(
                calculatedHash,
                record.merkleProof,
                rootVersion.merkleRoot
            );

            // Compare the current source evidence with the originally anchored snapshot.
            const currentRecord = currentEvidence.find(
                item => String(item.evidenceId) === String(record.evidenceId)
            );

            let sourceDataMatches = false;

            if (currentRecord) {
                const currentSnapshot = createEvidenceSnapshot(
                    incidentId,
                    currentRecord
                );
                const currentSnapshotHash = hashEvidenceSnapshot(currentSnapshot);

                sourceDataMatches = currentSnapshotHash.toLowerCase() ===
                    record.evidenceHash.replace(/^0x/, "").toLowerCase();
            }

            return {
                evidenceId: record.evidenceId,
                hashMatches,
                merkleProofValid: proofValid,
                sourceDataMatches,
                verified: hashMatches && proofValid && sourceDataMatches
            };
        });

        const { contract } = getBlockchainConnection();
        const historicalRootValid = await contract.verifyHistoricalRoot(
            incidentId,
            versionNumber,
            rootVersion.merkleRoot
        );

        const evidenceValid = evidenceResults.length > 0 &&
            evidenceResults.every(record => record.verified);

        const verified = evidenceValid && historicalRootValid &&
            rootVersion.blockchainStatus === "ANCHORED";

        return res.status(200).json({
            success: true,
            data: {
                incidentId,
                version: versionNumber,
                merkleRoot: rootVersion.merkleRoot,
                blockchainStatus: rootVersion.blockchainStatus,
                evidenceCount: evidenceResults.length,
                evidenceValid,
                historicalRootValid,
                verified,
                evidence: evidenceResults
            }
        });
    } catch (error) {
        console.error("[Integrity] Verification Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify incident integrity."
        });
    }
}


module.exports = {
    generateIntegrity,
    getIntegrity,
    getCustodyHistory,
    getIntegrityBlockchainStatus,
    verifyIntegrityVersion
};
