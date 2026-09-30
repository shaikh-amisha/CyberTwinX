import { expect } from "chai";
import { network } from "hardhat";

describe("CyberTwinXIntegrity", function () {
    async function deployContract() {
        const { ethers } = await network.connect();
        const integrity = await ethers.deployContract("CyberTwinXIntegrity");

        await integrity.waitForDeployment();

        return integrity;
    }

    describe("Merkle Root Anchoring", function () {
        it("should anchor the first Merkle Root as version 1", async function () {
            const integrity = await deployContract();

            const incidentId = "INC-001";
            const root =
                "0x1111111111111111111111111111111111111111111111111111111111111111";

            await integrity.anchorMerkleRoot(incidentId, root);

            const result = await integrity.getLatestRoot(incidentId);

            expect(result[0]).to.equal(root);
            expect(result[3]).to.equal(1n);
        });

        it("should create a new version without overwriting the previous root", async function () {
            const integrity = await deployContract();
            const incidentId = "INC-001";

            const rootV1 =
                "0x1111111111111111111111111111111111111111111111111111111111111111";
            const rootV2 =
                "0x2222222222222222222222222222222222222222222222222222222222222222";

            await integrity.anchorMerkleRoot(incidentId, rootV1);
            await integrity.anchorMerkleRoot(incidentId, rootV2);

            const historyLength =
                await integrity.getRootHistoryLength(incidentId);

            expect(historyLength).to.equal(2n);

            const version1 =
                await integrity.getRootRecord(incidentId, 0);
            const version2 =
                await integrity.getRootRecord(incidentId, 1);

            expect(version1[0]).to.equal(rootV1);
            expect(version1[3]).to.equal(1n);
            expect(version2[0]).to.equal(rootV2);
            expect(version2[3]).to.equal(2n);
        });
    });

    describe("Latest Root Verification", function () {
        it("should verify the latest Merkle Root correctly", async function () {
            const integrity = await deployContract();
            const incidentId = "INC-002";
            const root =
                "0x3333333333333333333333333333333333333333333333333333333333333333";

            await integrity.anchorMerkleRoot(incidentId, root);

            expect(
                await integrity.verifyMerkleRoot(incidentId, root)
            ).to.equal(true);
        });

        it("should reject an incorrect latest Merkle Root", async function () {
            const integrity = await deployContract();
            const incidentId = "INC-002";

            const correctRoot =
                "0x3333333333333333333333333333333333333333333333333333333333333333";
            const incorrectRoot =
                "0x4444444444444444444444444444444444444444444444444444444444444444";

            await integrity.anchorMerkleRoot(incidentId, correctRoot);

            expect(
                await integrity.verifyMerkleRoot(incidentId, incorrectRoot)
            ).to.equal(false);
        });
    });

    describe("Historical Root Verification", function () {
        it("should verify a specific historical root version", async function () {
            const integrity = await deployContract();
            const incidentId = "INC-003";

            const rootV1 =
                "0x5555555555555555555555555555555555555555555555555555555555555555";
            const rootV2 =
                "0x6666666666666666666666666666666666666666666666666666666666666666";

            await integrity.anchorMerkleRoot(incidentId, rootV1);
            await integrity.anchorMerkleRoot(incidentId, rootV2);

            expect(
                await integrity.verifyHistoricalRoot(incidentId, 1n, rootV1)
            ).to.equal(true);

            expect(
                await integrity.verifyHistoricalRoot(incidentId, 2n, rootV2)
            ).to.equal(true);
        });

        it("should reject an incorrect historical root", async function () {
            const integrity = await deployContract();
            const incidentId = "INC-003";

            const rootV1 =
                "0x5555555555555555555555555555555555555555555555555555555555555555";
            const incorrectRoot =
                "0x7777777777777777777777777777777777777777777777777777777777777777";

            await integrity.anchorMerkleRoot(incidentId, rootV1);

            expect(
                await integrity.verifyHistoricalRoot(
                    incidentId,
                    1n,
                    incorrectRoot
                )
            ).to.equal(false);
        });
    });

    describe("Validation", function () {
        it("should reject an empty Incident ID", async function () {
            const integrity = await deployContract();
            const root =
                "0x8888888888888888888888888888888888888888888888888888888888888888";

            await expect(
                integrity.anchorMerkleRoot("", root)
            ).to.be.revertedWith("Incident ID required");
        });

        it("should reject an empty Merkle Root", async function () {
            const integrity = await deployContract();

            await expect(
                integrity.anchorMerkleRoot(
                    "INC-004",
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                )
            ).to.be.revertedWith("Merkle root required");
        });

        it("should reject version 0 during historical verification", async function () {
            const integrity = await deployContract();
            const root =
                "0x9999999999999999999999999999999999999999999999999999999999999999";

            await expect(
                integrity.verifyHistoricalRoot("INC-005", 0n, root)
            ).to.be.revertedWith("Invalid version");
        });
    });

    describe("Root Existence", function () {
        it("should correctly report whether an incident has an anchored root", async function () {
            const integrity = await deployContract();

            expect(
                await integrity.hasAnchoredRoot("INC-006")
            ).to.equal(false);

            const root =
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

            await integrity.anchorMerkleRoot("INC-006", root);

            expect(
                await integrity.hasAnchoredRoot("INC-006")
            ).to.equal(true);
        });
    });
});
