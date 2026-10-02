const IncidentTwin = require("../models/IncidentTwin");
const BlockchainIntegrity = require("../models/BlockchainIntegrity");

const {
    buildMerkleTree
} = require("./merkleService");

const {
    recordCustodyEvent
} = require("./chainOfCustodyService");

const {
    anchorMerkleRootOnChain
} = require("./blockchainService");


// Build the next version number for an incident.
function getNextRootVersion(rootVersions) {
    if (!Array.isArray(rootVersions) || rootVersions.length === 0) {
        return 1;
    }

    return Math.max(
        ...rootVersions.map(version => Number(version.version) || 0)
    ) + 1;
}


// Generate a Merkle Tree, save it in MongoDB and anchor its root on-chain.
async function generateIncidentIntegrity(incidentId) {

    // Ensure the Incident ID is provided.
    if (!incidentId) {
        const error = new Error("Incident ID is required.");
        error.statusCode = 400;
        throw error;
    }

    // Load the Incident Twin that contains the source evidence.
    const incident = await IncidentTwin.findOne({ incidentId }).lean();

    if (!incident) {
        const error = new Error(
            `Incident Twin not found for incident: ${incidentId}`
        );
        error.statusCode = 404;
        throw error;
    }

    // Ensure that the incident contains evidence.
    if (!Array.isArray(incident.evidence) || incident.evidence.length === 0) {
        const error = new Error(
            "At least one evidence record is required for integrity generation."
        );
        error.statusCode = 400;
        throw error;
    }

    // Build the Merkle Tree from the incident evidence.
    const merkleTree = buildMerkleTree(
        incidentId,
        incident.evidence
    );

    // Find the existing integrity document for this incident.
    let integrityRecord = await BlockchainIntegrity.findOne({
        incidentId
    });

    // Create the main integrity document when this is the first version.
    if (!integrityRecord) {
        integrityRecord = new BlockchainIntegrity({
            incidentId,
            rootVersions: []
        });
    }

    // Determine the next sequential root version.
    const version = getNextRootVersion(
        integrityRecord.rootVersions
    );

    // Convert Merkle Tree leaves into the MongoDB evidence record format.
    const evidenceRecords = merkleTree.leaves.map(leaf => ({
        evidenceId: leaf.evidenceId,
        snapshot: leaf.snapshot,
        evidenceHash: `0x${leaf.hash}`,
        merkleProof: merkleTree.proofs[leaf.evidenceId] || []
    }));

    // Store the newly generated Merkle Root as a pending version.
    integrityRecord.rootVersions.push({
        version,
        merkleRoot: merkleTree.root,
        hashAlgorithm: merkleTree.hashAlgorithm,
        leafCount: merkleTree.leafCount,
        blockchainStatus: "PENDING",
        evidenceRecords,
        transaction: {}
    });

    // Save the generated integrity information before blockchain submission.
    await integrityRecord.save();

    // Record the initial hash-generation event for each evidence record.
    for (const evidenceRecord of evidenceRecords) {
        await recordCustodyEvent({
            incidentId,
            evidenceId: evidenceRecord.evidenceId,
            eventType: "HASH_GENERATED",
            integrity: {
                status: "PENDING",
                evidenceHash: evidenceRecord.evidenceHash,
                merkleRoot: merkleTree.root,
                rootVersion: version
            },
            details: "SHA-256 evidence hash generated for Merkle Tree integrity."
        });
    }

    // Submit the Merkle Root and update its blockchain status.
    try {
        const anchorResult = await anchorMerkleRootOnChain(
            incidentId,
            merkleTree.root
        );

        // Find the root version that was just generated.
        const savedRootVersion = integrityRecord.rootVersions.find(
            item => item.version === version
        );

        if (!savedRootVersion) {
            throw new Error("Generated Merkle Root version could not be found.");
        }

        // Store the confirmed blockchain transaction details.
        savedRootVersion.blockchainStatus = "ANCHORED";
        savedRootVersion.transaction = {
            transactionHash: anchorResult.transactionHash,
            blockNumber: anchorResult.blockNumber,
            contractAddress: anchorResult.contractAddress,
            chainId: anchorResult.chainId,
            registrar: anchorResult.registrar,
            anchoredAt: anchorResult.anchoredAt
        };

        await integrityRecord.save();

        // Record that the Merkle Root was anchored on the blockchain.
        const custodyEventType = version === 1
            ? "ROOT_ANCHORED"
            : "ROOT_REANCHORED";

        for (const evidenceRecord of evidenceRecords) {
            await recordCustodyEvent({
                incidentId,
                evidenceId: evidenceRecord.evidenceId,
                eventType: custodyEventType,
                integrity: {
                    status: "PENDING",
                    evidenceHash: evidenceRecord.evidenceHash,
                    merkleRoot: merkleTree.root,
                    rootVersion: version
                },
                details: `Merkle Root version ${version} anchored on-chain. Transaction: ${anchorResult.transactionHash}`
            });
        }

        // Return the generated integrity information and transaction details.
        return {
            incidentId,
            version,
            merkleRoot: merkleTree.root,
            hashAlgorithm: merkleTree.hashAlgorithm,
            leafCount: merkleTree.leafCount,
            blockchainStatus: "ANCHORED",
            transaction: savedRootVersion.transaction,
            evidenceRecords
        };

    } catch (error) {
        // Mark the version as failed if blockchain submission did not complete.
        const failedRootVersion = integrityRecord.rootVersions.find(
            item => item.version === version
        );

        if (failedRootVersion) {
            failedRootVersion.blockchainStatus = "FAILED";
            await integrityRecord.save();
        }

        throw error;
    }
}


module.exports = {
    generateIncidentIntegrity
};
