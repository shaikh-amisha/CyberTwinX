/**
 * CyberTwinX - Combined Tests 3-6
 *
 * Run from backend/: node runTests3to6.js
 *
 * All database operations are strictly limited to CyberTwinX_Test.
 * Temporary MongoDB records are cleaned up. Local Hardhat transactions
 * are not reversible; this runner only uses the local development chain.
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const crypto = require("crypto");

const IncidentTwin = require("./models/IncidentTwin");
const Telemetry = require("./models/Telemetry");
const BlockchainIntegrity = require("./models/BlockchainIntegrity");
const ChainOfCustody = require("./models/ChainOfCustody");

const {
    generateIncidentIntegrity
} = require("./services/integrityService");
const {
    correlateIncident
} = require("./services/incidentCorrelationService");
const {
    hashEvidenceSnapshot,
    verifyMerkleProof
} = require("./services/merkleService");

function getTestMongoUri() {
    const uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
        throw new Error("TEST_MONGODB_URI is missing from backend/.env");
    }

    let databaseName;
    try {
        databaseName = new URL(uri).pathname.replace(/^\/+/, "").split("/")[0];
    } catch {
        throw new Error("TEST_MONGODB_URI is not a valid MongoDB connection URI.");
    }

    if (databaseName !== "CyberTwinX_Test") {
        throw new Error(
            `Refusing to run tests against database "${databaseName}". Expected "CyberTwinX_Test".`
        );
    }
    return uri;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function testNavigationCode() {
    const root = __dirname;
    const incidentJs = fs.readFileSync(
        path.join(root, "../frontend/js/incident-twin.js"), "utf8"
    );
    const blockchainJs = fs.readFileSync(
        path.join(root, "../frontend/js/blockchain.js"), "utf8"
    );
    const investigationJs = fs.readFileSync(
        path.join(root, "../frontend/js/investigation-integrity.js"), "utf8"
    );

    assert(
        incidentJs.includes("blockchain.html?incidentId=") &&
        incidentJs.includes("encodeURIComponent(incident.incidentId"),
        "Incident Twin does not preserve the selected incident ID in its Blockchain Integrity link."
    );
    assert(
        blockchainJs.includes('urlParams.get("incidentId")') &&
        blockchainJs.includes("No incident is selected"),
        "Blockchain Integrity does not require an explicit incident ID."
    );
    assert(
        investigationJs.includes('urlParams.get("incidentId")') &&
        investigationJs.includes('encodeURIComponent(state.incidentId)') &&
        investigationJs.includes("incident-twin.html?incidentId=") &&
        investigationJs.includes("blockchain.html?incidentId="),
        "Investigation Integrity does not preserve the selected incident ID across navigation."
    );

    console.log("TEST 5 PASSED: Incident-specific navigation code preserves incidentId.");
}

async function main() {
    let telemetryId = null;
    let followUpTelemetryId = null;
    let automaticIncidentId = null;
    let versionedIncidentId = null;
    let failed = false;

    try {
        await mongoose.connect(getTestMongoUri());
        console.log("Connected to isolated CyberTwinX_Test database.");

        // TEST 3: Generate an anchored test root, then verify that a modified
        // snapshot no longer matches its saved evidence hash/Merkle proof.
        const tamperSuffix = crypto.randomUUID();
        const tamperIncidentId = `TEST-TAMPER-${tamperSuffix}`;
        versionedIncidentId = tamperIncidentId;

        await IncidentTwin.create({
            incidentId: tamperIncidentId,
            incidentType: "TAMPER_TEST",
            endpointId: "TEST-ENDPOINT",
            evidence: [
                {
                    evidenceId: `TEST-E1-${tamperSuffix}`,
                    category: "NETWORK",
                    type: "TEST_CONNECTION",
                    timestamp: new Date(),
                    severity: "HIGH",
                    status: "SUPPORTING",
                    description: "Original evidence snapshot."
                },
                {
                    evidenceId: `TEST-E2-${tamperSuffix}`,
                    category: "PROCESS",
                    type: "TEST_PROCESS",
                    timestamp: new Date(),
                    severity: "MEDIUM",
                    status: "SUPPORTING",
                    description: "Second original evidence snapshot."
                }
            ]
        });

        const anchored = await generateIncidentIntegrity(tamperIncidentId);
        assert(anchored.blockchainStatus === "ANCHORED", "Test root was not anchored.");

        const saved = await BlockchainIntegrity.findOne({
            incidentId: tamperIncidentId
        }).lean();
        const firstEvidence = saved?.rootVersions?.[0]?.evidenceRecords?.[0];
        assert(firstEvidence, "Saved evidence snapshot was not found.");

        const originalHash = hashEvidenceSnapshot(firstEvidence.snapshot);
        assert(
            `0x${originalHash}`.toLowerCase() === firstEvidence.evidenceHash.toLowerCase(),
            "Original evidence snapshot hash does not match."
        );
        assert(
            verifyMerkleProof(
                `0x${originalHash}`,
                firstEvidence.merkleProof,
                saved.rootVersions[0].merkleRoot
            ),
            "Original evidence Merkle proof did not verify."
        );

        const alteredSnapshot = {
            ...firstEvidence.snapshot,
            description: `${firstEvidence.snapshot.description} [TAMPERED]`
        };
        const alteredHash = hashEvidenceSnapshot(alteredSnapshot);
        assert(
            alteredHash !== originalHash,
            "Tampered snapshot unexpectedly produced the original hash."
        );
        assert(
            !verifyMerkleProof(
                `0x${alteredHash}`,
                firstEvidence.merkleProof,
                saved.rootVersions[0].merkleRoot
            ),
            "Tampered evidence was not detected by the Merkle proof."
        );
        console.log("TEST 3 PASSED: Original evidence verifies; modified evidence fails hash/proof verification.");

        // TEST 4: Run the real incident correlation service with temporary
        // telemetry and ensure it automatically creates and anchors integrity.
        const autoSuffix = crypto.randomUUID();
        const telemetry = await Telemetry.create({
            agent: { name: "CyberTwinX-Test-Agent", version: "test", platform: "test" },
            timestamp: new Date(),
            telemetry: { system: { hostname: `test-${autoSuffix}` } }
        });
        telemetryId = telemetry._id;

        const correlated = await correlateIncident({
            endpointId: `TEST-ENDPOINT-${autoSuffix}`,
            hostname: `test-${autoSuffix}`,
            telemetryId: telemetry._id,
            securityAnalysis: {
                state: "SUSPICIOUS",
                riskLevel: "HIGH",
                score: 75,
                confidence: 90,
                findings: [
                    {
                        type: "TEST_SUSPICIOUS_PROCESS",
                        severity: "HIGH",
                        description: "Temporary finding for automatic integrity test.",
                        timestamp: new Date().toISOString()
                    },
                    {
                        type: "TEST_NETWORK_SCAN",
                        severity: "MEDIUM",
                        description: "Temporary network finding for automatic integrity test.",
                        timestamp: new Date().toISOString()
                    }
                ]
            }
        });

        automaticIncidentId = correlated?.incident?.incidentId;
        assert(correlated?.created && automaticIncidentId, "Test incident was not created.");
        const automaticRecord = await BlockchainIntegrity.findOne({
            incidentId: automaticIncidentId
        }).lean();
        assert(automaticRecord, "Automatic integrity record was not created.");
        const automaticLatest = automaticRecord.rootVersions
            .slice().sort((a, b) => b.version - a.version)[0];
        assert(
            automaticLatest?.blockchainStatus === "ANCHORED",
            "Automatically generated root is not anchored."
        );
        assert(
            automaticLatest.evidenceRecords.length === correlated.incident.evidence.length,
            "Automatic root evidence count does not match the incident evidence count."
        );
        console.log(`TEST 4 PASSED: New incident ${automaticIncidentId} automatically received an anchored integrity root.`);

        // TEST 4B: A routine follow-up telemetry update with the same evidence
        // types must not mutate the anchored evidence snapshot or create a new root.
        const originalEvidence = correlated.incident.evidence.map(item => ({
            evidenceId: item.evidenceId,
            type: item.type,
            category: item.category,
            severity: item.severity,
            status: item.status,
            description: item.description,
            timestamp: new Date(item.timestamp).toISOString(),
            telemetryId: String(item.telemetryId)
        }));
        const originalIntegrity = await BlockchainIntegrity.findOne({
            incidentId: automaticIncidentId
        }).lean();
        const originalVersionCount = originalIntegrity.rootVersions.length;

        const followUpTelemetry = await Telemetry.create({
            agent: { name: "CyberTwinX-Test-Agent", version: "test", platform: "test" },
            timestamp: new Date(),
            telemetry: { system: { hostname: `test-${autoSuffix}` } }
        });
        followUpTelemetryId = followUpTelemetry._id;

        const followUp = await correlateIncident({
            endpointId: `TEST-ENDPOINT-${autoSuffix}`,
            hostname: `test-${autoSuffix}`,
            telemetryId: followUpTelemetry._id,
            securityAnalysis: {
                state: "COMPROMISED",
                riskLevel: "CRITICAL",
                score: 95,
                confidence: 99,
                findings: [
                    {
                        type: "TEST_SUSPICIOUS_PROCESS",
                        severity: "CRITICAL",
                        description: "Changed follow-up description must not overwrite the anchored snapshot.",
                        timestamp: new Date(Date.now() + 1000).toISOString()
                    },
                    {
                        type: "TEST_NETWORK_SCAN",
                        severity: "HIGH",
                        description: "Changed network description must not overwrite the anchored snapshot.",
                        timestamp: new Date(Date.now() + 1000).toISOString()
                    }
                ]
            }
        });

        assert(
            followUp?.updated && followUp.incident.incidentId === automaticIncidentId,
            "Follow-up telemetry did not update the same incident."
        );
        const evidenceAfterFollowUp = followUp.incident.evidence.map(item => ({
            evidenceId: item.evidenceId,
            type: item.type,
            category: item.category,
            severity: item.severity,
            status: item.status,
            description: item.description,
            timestamp: new Date(item.timestamp).toISOString(),
            telemetryId: String(item.telemetryId)
        }));
        assert(
            JSON.stringify(evidenceAfterFollowUp) === JSON.stringify(originalEvidence),
            "Routine telemetry update changed one or more existing evidence snapshot fields."
        );

        const integrityAfterFollowUp = await BlockchainIntegrity.findOne({
            incidentId: automaticIncidentId
        }).lean();
        assert(
            integrityAfterFollowUp.rootVersions.length === originalVersionCount,
            "Routine telemetry update unexpectedly created a new integrity root version."
        );
        console.log("TEST 4B PASSED: Routine telemetry updates preserve all anchored evidence fields and do not create a new root.");

        // TEST 5: Verify actual frontend navigation code keeps incidentId in links.
        testNavigationCode();

        // TEST 6: Generate a second root version for an additional evidence item.
        // Expect one hash event per evidence per version and one root event per version.
        const currentIncident = await IncidentTwin.findOne({
            incidentId: tamperIncidentId
        });
        currentIncident.evidence.push({
            evidenceId: `TEST-E3-${tamperSuffix}`,
            category: "FILE_INTEGRITY",
            type: "TEST_FILE_CHANGE",
            timestamp: new Date(),
            severity: "LOW",
            status: "SUPPORTING",
            description: "Additional evidence for root version 2."
        });
        await currentIncident.save();

        const secondRoot = await generateIncidentIntegrity(tamperIncidentId);
        assert(secondRoot.version === 2, `Expected root version 2; received ${secondRoot.version}.`);
        assert(secondRoot.blockchainStatus === "ANCHORED", "Second root version was not anchored.");

        const hashEvents = await ChainOfCustody.find({
            incidentId: tamperIncidentId,
            eventType: "HASH_GENERATED"
        }).lean();
        const rootEvents = await ChainOfCustody.find({
            incidentId: tamperIncidentId,
            eventType: { $in: ["ROOT_ANCHORED", "ROOT_REANCHORED"] }
        }).lean();

        assert(
            hashEvents.length === 5,
            `Expected 5 HASH_GENERATED events across 2 versions (2 + 3); found ${hashEvents.length}.`
        );
        assert(
            rootEvents.length === 2,
            `Expected exactly 2 root events across 2 versions; found ${rootEvents.length}.`
        );
        assert(
            rootEvents.filter(event => event.eventType === "ROOT_ANCHORED").length === 1 &&
            rootEvents.filter(event => event.eventType === "ROOT_REANCHORED").length === 1,
            "Expected one ROOT_ANCHORED event for version 1 and one ROOT_REANCHORED event for version 2."
        );
        assert(
            rootEvents.every(event => !event.evidenceId),
            "A root-level custody event unexpectedly contains an evidenceId."
        );
        console.log("TEST 6 PASSED: Two root versions have 5 evidence hash events and exactly 2 root-level anchoring events.");

        console.log("\nALL TESTS 3-6 PASSED.");
    } catch (error) {
        failed = true;
        console.error("\nCOMBINED TEST RUN FAILED:", error.message);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            try {
                const incidentIds = [versionedIncidentId, automaticIncidentId].filter(Boolean);
                if (incidentIds.length) {
                    await Promise.all([
                        IncidentTwin.deleteMany({ incidentId: { $in: incidentIds } }),
                        BlockchainIntegrity.deleteMany({ incidentId: { $in: incidentIds } }),
                        ChainOfCustody.deleteMany({ incidentId: { $in: incidentIds } })
                    ]);
                }
                const telemetryIds = [telemetryId, followUpTelemetryId].filter(Boolean);
                if (telemetryIds.length) await Telemetry.deleteMany({ _id: { $in: telemetryIds } });
                console.log("Temporary test records cleaned up.");
            } catch (cleanupError) {
                failed = true;
                console.error("TEST CLEANUP FAILED:", cleanupError.message);
            } finally {
                await mongoose.disconnect();
            }
        }
    }

    if (failed) process.exitCode = 1;
}

main();
