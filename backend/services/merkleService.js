
// Import Node.js's built-in crypto module.
// It provides cryptographic functions, including SHA-256 hashing.
const crypto = require("crypto");


// Convert objects into a consistent JSON format by sorting their keys.
function sortObjectKeys(value) {

    // If the value is an array, process each item inside it.
    if (Array.isArray(value)) {
        return value.map(sortObjectKeys);
    }

    // Check whether the value is an object and not a Date.
    if (value && typeof value === "object" && !(value instanceof Date)) {

        // Sort all object keys alphabetically.
        return Object.keys(value)
            .sort()

            // Create a new object using the sorted keys.
            .reduce((result, key) => {

                // Ignore properties with undefined values.
                if (value[key] !== undefined) {
                    result[key] = sortObjectKeys(value[key]);
                }

                return result;
            }, {});
    }

    // Return the value if it is not an object or array.
    return value;
}


// Generate a SHA-256 hash from the given value.
function sha256(value) {

    return crypto

        // Select the SHA-256 hashing algorithm.
        .createHash("sha256")

        // Pass the data that needs to be hashed.
        .update(value)

        // Generate the final hash in hexadecimal format.
        .digest("hex");
}


// Create a consistent snapshot of one evidence record.
function createEvidenceSnapshot(incidentId, evidence) {

    // Ensure that Incident ID and Evidence ID are available.
    if (!incidentId || !evidence?.evidenceId) {
        throw new Error("Incident ID and Evidence ID are required.");
    }

    // Convert the evidence timestamp into a Date object.
    const timestamp = evidence.timestamp
        ? new Date(evidence.timestamp)
        : null;

    // Check whether the timestamp is valid.
    if (timestamp && Number.isNaN(timestamp.getTime())) {
        throw new Error(`Invalid timestamp for ${evidence.evidenceId}.`);
    }

    // Build a standardized evidence snapshot.
    // Only the selected fields are included in the snapshot.
    return sortObjectKeys({
        schemaVersion: 1,
        incidentId: String(incidentId),
        evidenceId: String(evidence.evidenceId),
        category: evidence.category || "OTHER",
        type: evidence.type || "UNKNOWN",
        timestamp: timestamp ? timestamp.toISOString() : null,
        severity: evidence.severity || "LOW",
        status: evidence.status || "SUPPORTING",
        description: evidence.description || "",
        telemetryId: evidence.telemetryId
            ? String(evidence.telemetryId)
            : null
    });
}


// Generate a SHA-256 leaf hash from an evidence snapshot.
function hashEvidenceSnapshot(snapshot) {

    // Convert the snapshot into consistent JSON before hashing.
    const canonicalSnapshot = JSON.stringify(
        sortObjectKeys(snapshot)
    );

    // Generate and return the SHA-256 hash.
    return sha256(canonicalSnapshot);
}


// Combine two child hashes to generate their parent hash.
function hashPair(left, right) {

    // Convert both hexadecimal hashes into binary data,
    // combine them, and generate a new SHA-256 hash.
    return sha256(
        Buffer.concat([
            Buffer.from(left, "hex"),
            Buffer.from(right, "hex")
        ])
    );
}


// Build a Merkle Tree and generate proofs for every evidence record.
function buildMerkleTree(incidentId, evidenceRecords) {

    // Ensure that at least one evidence record is provided.
    if (!Array.isArray(evidenceRecords) || evidenceRecords.length === 0) {
        throw new Error("At least one evidence record is required.");
    }

    // Sort evidence records by Evidence ID.
    // This ensures that the same records always produce the same tree.
    const sortedEvidence = [...evidenceRecords].sort(
        (a, b) => String(a.evidenceId).localeCompare(String(b.evidenceId))
    );

    // Extract all Evidence IDs.
    const evidenceIds = sortedEvidence.map(
        item => String(item.evidenceId || "")
    );

    // Ensure that every evidence record has an Evidence ID.
    if (evidenceIds.some(id => !id)) {
        throw new Error("Every evidence record must have an Evidence ID.");
    }

    // Prevent duplicate Evidence IDs within the same incident.
    if (new Set(evidenceIds).size !== evidenceIds.length) {
        throw new Error("Duplicate Evidence IDs are not allowed.");
    }

    // Create a snapshot and SHA-256 hash for every evidence record.
    const leaves = sortedEvidence.map(evidence => {

        // Generate the standardized evidence snapshot.
        const snapshot = createEvidenceSnapshot(
            incidentId,
            evidence
        );

        // Generate the hash of that snapshot.
        return {
            evidenceId: snapshot.evidenceId,
            snapshot,
            hash: hashEvidenceSnapshot(snapshot)
        };
    });

    // Store all levels of the Merkle Tree.
    // The first level contains the individual evidence hashes.
    const levels = [
        leaves.map(leaf => leaf.hash)
    ];

    // Continue building the tree until only one hash remains.
    while (levels[levels.length - 1].length > 1) {

        // Get the hashes from the current tree level.
        const currentLevel = levels[levels.length - 1];

        // Store the hashes of the next level.
        const nextLevel = [];

        // Process the hashes in pairs.
        for (let i = 0; i < currentLevel.length; i += 2) {

            // Get the left child hash.
            const left = currentLevel[i];

            // Get the right child hash.
            // If there is no right child, duplicate the left hash.
            const right = currentLevel[i + 1] || left;

            // Combine both hashes to generate their parent hash.
            nextLevel.push(hashPair(left, right));
        }

        // Add the newly generated level to the tree.
        levels.push(nextLevel);
    }

    // The final remaining hash is the Merkle Root.
    const root = `0x${levels[levels.length - 1][0]}`;


    // Generate a Merkle Proof for every evidence record.
    const proofs = {};

    // Process each evidence leaf individually.
    leaves.forEach((leaf, leafIndex) => {

        // Start from the current leaf's position.
        let index = leafIndex;

        // Store the sibling hashes required for verification.
        const proof = [];

        // Move through each tree level until reaching the root.
        for (let level = 0; level < levels.length - 1; level++) {

            // Get the hashes at the current level.
            const currentLevel = levels[level];

            // Find the sibling hash of the current node.
            const siblingIndex = index % 2 === 0
                ? index + 1
                : index - 1;

            // If there is no sibling, use the current hash itself.
            const siblingHash = currentLevel[siblingIndex] || currentLevel[index];

            // Store the sibling hash and its position.
            proof.push({
                position: index % 2 === 0 ? "right" : "left",
                hash: siblingHash
            });

            // Move to the parent node's position.
            index = Math.floor(index / 2);
        }

        // Save the proof using the Evidence ID as its key.
        proofs[leaf.evidenceId] = proof;
    });


    // Return the complete Merkle Tree information.
    return {
        incidentId,
        hashAlgorithm: "SHA-256",
        root,
        leafCount: leaves.length,
        leaves,
        proofs
    };
}


// Verify an evidence record using its Merkle Proof.
function verifyMerkleProof(leafHash, proof, expectedRoot) {

    // Check whether all required verification inputs are available.
    if (!leafHash || !Array.isArray(proof) || !expectedRoot) {
        return false;
    }

    // Remove the optional 0x prefix from the leaf hash.
    let currentHash = leafHash.replace(/^0x/, "");

    // Process every sibling hash in the Merkle Proof.
    for (const step of proof) {

        // Validate the sibling hash and its position.
        if (
            !step.hash ||
            !["left", "right"].includes(step.position)
        ) {
            return false;
        }

        // Recalculate the parent hash based on sibling position.
        currentHash = step.position === "left"
            ? hashPair(step.hash, currentHash)
            : hashPair(currentHash, step.hash);
    }

    // Compare the calculated root with the expected Merkle Root.
    // Return true if both roots match, otherwise return false.
    return `0x${currentHash}`.toLowerCase() === expectedRoot.toLowerCase();
}


// Export the functions so they can be used by other backend files.
module.exports = {
    createEvidenceSnapshot,
    hashEvidenceSnapshot,
    buildMerkleTree,
    verifyMerkleProof
};




