const IncidentTwin = require("../models/IncidentTwin");
const BlockchainIntegrity = require("../models/BlockchainIntegrity");

const {
    buildMerkleTree
} = require("./merkleService");

const {
    recordCustodyEvent
} = require("./chainOfCustodyService");


// Build the next version number for an incident.
function getNextRootVersion(rootVersions) {
    if (!Array.isArray(rootVersions) || rootVersions.length === 0) {
        return 1;
    }

    return Math.max(
        ...rootVersions.map(version => Number(version.version) || 0)
    ) + 1;
}


// Generate a Merkle Tree from an incident's evidence
// and save the generated integrity information in MongoDB.
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

    // Save the generated integrity information in MongoDB.
    await integrityRecord.save();

    // Record the initial integrity event for the incident.
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

    // Return the newly generated integrity information.
    return {
        incidentId,
        version,
        merkleRoot: merkleTree.root,
        hashAlgorithm: merkleTree.hashAlgorithm,
        leafCount: merkleTree.leafCount,
        evidenceRecords
    };
}


module.exports = {
    generateIncidentIntegrity
};
