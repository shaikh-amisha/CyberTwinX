const mongoose = require("mongoose");

// Store details of an individual evidence record.
const evidenceRecordSchema = new mongoose.Schema(
    {
        // Unique ID of the evidence record.
        evidenceId: {
            type: String,
            required: true
        },

        // Store the standardized evidence snapshot used for hashing.
        snapshot: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        // Store the SHA-256 hash of the evidence snapshot.
        evidenceHash: {
            type: String,
            required: true
        },

        // Store the Merkle Proof required for evidence verification.
        merkleProof: [
            {
                position: {
                    type: String,
                    enum: ["left", "right"],
                    required: true
                },
                hash: {
                    type: String,
                    required: true
                }
            }
        ]
    },
    { _id: false }
);


// Store blockchain transaction details for a Merkle Root.
const transactionSchema = new mongoose.Schema(
    {
        // Transaction hash returned by the blockchain.
        transactionHash: {
            type: String,
            default: null
        },

        // Block number containing the transaction.
        blockNumber: {
            type: Number,
            default: null
        },

        // Address of the deployed smart contract.
        contractAddress: {
            type: String,
            default: null
        },

        // ID of the blockchain network.
        chainId: {
            type: String,
            default: null
        },

        // Wallet address that registered the Merkle Root.
        registrar: {
            type: String,
            default: null
        },

        // Time at which the Merkle Root was registered.
        anchoredAt: {
            type: Date,
            default: null
        }
    },
    { _id: false }
);


// Store one version of an incident's Merkle Tree.
const rootVersionSchema = new mongoose.Schema(
    {
        // Sequential version number for the incident.
        version: {
            type: Number,
            required: true
        },

        // Root hash representing all evidence in this version.
        merkleRoot: {
            type: String,
            required: true
        },

        // Hashing algorithm used to generate the Merkle Tree.
        hashAlgorithm: {
            type: String,
            default: "SHA-256"
        },

        // Number of evidence records included in the tree.
        leafCount: {
            type: Number,
            required: true
        },

        // Current blockchain registration status.
        blockchainStatus: {
            type: String,
            enum: ["PENDING", "ANCHORED", "FAILED"],
            default: "PENDING"
        },

        // Store evidence snapshots, hashes and Merkle Proofs.
        evidenceRecords: {
            type: [evidenceRecordSchema],
            default: []
        },

        // Store blockchain transaction information.
        transaction: {
            type: transactionSchema,
            default: () => ({})
        }
    },
    { timestamps: true }
);


// Main Blockchain Integrity document.
const blockchainIntegritySchema = new mongoose.Schema(
    {
        // Incident ID associated with this integrity record.
        incidentId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        // Maintain all Merkle Root versions for this incident.
        rootVersions: {
            type: [rootVersionSchema],
            default: []
        }
    },
    { timestamps: true }
);


// Create and export the BlockchainIntegrity model.
module.exports = mongoose.model(
    "BlockchainIntegrity",
    blockchainIntegritySchema
);
