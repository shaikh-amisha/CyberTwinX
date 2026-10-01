
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

module.exports = {
    getBlockchainConnection,
    getBlockchainStatus
};