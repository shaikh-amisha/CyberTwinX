const { ethers } = require("ethers");

// Load the deployed contract information.
const contractArtifact = require("../blockchain/CyberTwinXIntegrity.json");

// Create a read-only blockchain connection.
function getBlockchainConnection() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const contractAddress = process.env.CYBERTWINX_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
        throw new Error("Blockchain environment variables are missing.");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Connect to the deployed smart contract.
    const contract = new ethers.Contract(
        contractAddress,
        contractArtifact.abi,
        provider
    );

    return { provider, contract };
}

// Create a transaction-enabled connection for the configured local signer.
async function getBlockchainSignerConnection() {
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const expectedChainId = process.env.BLOCKCHAIN_CHAIN_ID;

    if (!privateKey) {
        throw new Error("BLOCKCHAIN_PRIVATE_KEY is missing.");
    }

    if (!expectedChainId) {
        throw new Error("BLOCKCHAIN_CHAIN_ID is missing.");
    }

    const { provider, contract: readOnlyContract } = getBlockchainConnection();
    const network = await provider.getNetwork();

    if (network.chainId !== BigInt(expectedChainId)) {
        throw new Error(
            `Connected to unexpected network. Expected chain ID ${expectedChainId}, received ${network.chainId}.`
        );
    }

    const contractAddress = await readOnlyContract.getAddress();
    const contractCode = await provider.getCode(contractAddress);

    if (contractCode === "0x") {
        throw new Error("No smart contract found at the configured address.");
    }

    const signer = new ethers.Wallet(privateKey, provider);
    const contract = readOnlyContract.connect(signer);

    // Only the owner or an authorized investigator can anchor roots.
    const isAuthorized = await contract.isAuthorized(signer.address);

    if (!isAuthorized) {
        throw new Error(
            `Wallet ${signer.address} is not authorized to anchor Merkle roots.`
        );
    }

    return { provider, signer, contract };
}

// Check the blockchain connection and contract deployment.
async function getBlockchainStatus() {
    const { provider, contract } = getBlockchainConnection();

    const network = await provider.getNetwork();
    const contractAddress = await contract.getAddress();
    const contractCode = await provider.getCode(contractAddress);

    if (contractCode === "0x") {
        throw new Error("No smart contract found at the configured address.");
    }

    const ownerAddress = await contract.owner();

    return {
        connected: true,
        chainId: network.chainId.toString(),
        contractAddress,
        ownerAddress
    };
}

// Submit a Merkle Root, wait for confirmation and verify the saved root.
async function anchorMerkleRootOnChain(incidentId, merkleRoot) {
    if (typeof incidentId !== "string" || incidentId.trim().length === 0) {
        throw new Error("A valid incident ID is required.");
    }

    if (!ethers.isHexString(merkleRoot, 32) || merkleRoot === ethers.ZeroHash) {
        throw new Error("A valid non-zero 32-byte Merkle Root is required.");
    }

    const { provider, signer, contract } = await getBlockchainSignerConnection();

    const transaction = await contract.anchorMerkleRoot(
        incidentId.trim(),
        merkleRoot
    );

    const receipt = await transaction.wait();

    if (!receipt || receipt.status !== 1) {
        throw new Error("Merkle Root anchoring transaction failed.");
    }

    // Confirm that the submitted root is now the latest root on-chain.
    const isVerified = await contract.verifyMerkleRoot(
        incidentId.trim(),
        merkleRoot
    );

    if (!isVerified) {
        throw new Error("Transaction was confirmed, but on-chain root verification failed.");
    }

    const network = await provider.getNetwork();
    const contractAddress = await contract.getAddress();
    const block = await provider.getBlock(receipt.blockNumber);

    return {
        incidentId: incidentId.trim(),
        merkleRoot,
        registrar: signer.address,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        contractAddress,
        chainId: network.chainId.toString(),
        anchoredAt: block ? new Date(Number(block.timestamp) * 1000) : null,
        verified: true
    };
}

module.exports = {
    getBlockchainConnection,
    getBlockchainSignerConnection,
    getBlockchainStatus,
    anchorMerkleRootOnChain
};
