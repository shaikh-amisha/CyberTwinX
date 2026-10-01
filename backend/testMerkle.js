
const {
    buildMerkleTree,
    verifyMerkleProof
} = require("./services/merkleService");

// Sample evidence records for testing.
const evidence = [
    {
        evidenceId: "EVD-001",
        type: "LOGIN",
        category: "AUTHENTICATION",
        severity: "HIGH",
        status: "SUPPORTING",
        description: "Multiple failed login attempts",
        timestamp: "2026-10-02T10:00:00Z"
    },
    {
        evidenceId: "EVD-002",
        type: "NETWORK",
        category: "NETWORK",
        severity: "MEDIUM",
        status: "SUPPORTING",
        description: "Unusual network traffic",
        timestamp: "2026-10-02T10:05:00Z"
    },
    {
        evidenceId: "EVD-003",
        type: "PROCESS",
        category: "ENDPOINT",
        severity: "CRITICAL",
        status: "SUPPORTING",
        description: "Suspicious process execution",
        timestamp: "2026-10-02T10:10:00Z"
    }
];

// Build the Merkle Tree using the sample evidence.
const result = buildMerkleTree("INC-001", evidence);

// Display the generated Merkle Root.
console.log("\nMerkle Root:", result.root);

// Display the total number of evidence records.
console.log("Leaf Count:", result.leafCount);

// Verify each evidence record using its Merkle Proof.
console.log("\nEvidence Verification:");

result.leaves.forEach((leaf) => {

    const valid = verifyMerkleProof(
        leaf.hash,
        result.proofs[leaf.evidenceId],
        result.root
    );

    console.log(
        `${leaf.evidenceId}:`,
        valid ? "VERIFIED" : "FAILED"
    );
});
