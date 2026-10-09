const express = require("express");

const {
    generateIntegrity,
    getIntegrity,
    getLatestIntegrity,
    getCustodyHistory,
    getIntegrityBlockchainStatus,
    verifyIntegrityVersion
} = require("../controllers/integrityController");

const router = express.Router();


// Check the blockchain connection and deployed contract.
router.get("/blockchain/status", getIntegrityBlockchainStatus);

// Fallback for integrity pages when the selected incident has no saved root.
router.get("/latest", getLatestIntegrity);

// Generate a new Merkle Root version and anchor it on-chain.
router.post("/:incidentId/generate", generateIntegrity);

// Retrieve all saved integrity versions for an incident.
router.get("/:incidentId", getIntegrity);

// Retrieve the Chain of Custody history for an incident.
router.get("/:incidentId/custody", getCustodyHistory);

// Verify one saved version, its evidence proofs and its historical root.
router.get("/:incidentId/verify/:version", verifyIntegrityVersion);


module.exports = router;
