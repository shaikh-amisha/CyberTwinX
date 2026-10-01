
import { network } from "hardhat";

async function main() {
    // Connect to the selected Hardhat network.
    const connection = await network.connect();
    const ethers = connection.ethers;

    // Get the deployer's account.
    const [deployer] = await ethers.getSigners();

    console.log("Deploying CyberTwinXIntegrity...");
    console.log("Deployer address:", deployer.address);

    // Deploy the smart contract.
    const integrity = await ethers.deployContract("CyberTwinXIntegrity");

    // Wait until deployment is confirmed.
    await integrity.waitForDeployment();

    const contractAddress = await integrity.getAddress();

    console.log("----------------------------------");
    console.log("CyberTwinXIntegrity deployed!");
    console.log("Contract Address:", contractAddress);
    console.log("Owner Address:", await integrity.owner());
    console.log("----------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});