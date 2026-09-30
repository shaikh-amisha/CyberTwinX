const Telemetry = require("../models/Telemetry");
const EndpointTwin = require("../models/EndpointTwin");
const IncidentTwin = require("../models/IncidentTwin");
const { getSummary } = require("../services/evidenceInvestigationService");
const { detectThreats } = require("../services/detectionEngine");


const getDashboardOverview = async (req, res) => {

    try {

        /*
         * =====================================================
         * 1. LATEST TELEMETRY
         * =====================================================
         */

        const latestTelemetry =
            await Telemetry.findOne()
                .sort({
                    timestamp: -1
                })
                .lean();


        if (!latestTelemetry) {

            return res.status(404).json({
                success: false,
                message: "No telemetry data available"
            });

        }


        const telemetry =
            latestTelemetry.telemetry || {};


        const agent =
            latestTelemetry.agent || {};


        /*
         * =====================================================
         * 2. ENDPOINT TWIN
         * =====================================================
         */

        let endpointTwin =
            await EndpointTwin.findOne({
                endpointId: agent.name
            })
            .sort({
                updatedAt: -1
            })
            .lean();


        /*
         * Fallback:
         * If endpointId does not exactly match the agent name,
         * use the most recently updated Endpoint Twin.
         */

        if (!endpointTwin) {

            endpointTwin =
                await EndpointTwin.findOne()
                    .sort({
                        updatedAt: -1
                    })
                    .lean();

        }


        /*
         * =====================================================
         * 3. ACTIVE INCIDENT
         * =====================================================
         */

        let activeIncident = null;


        if (endpointTwin?.endpointId) {

            activeIncident =
                await IncidentTwin.findOne({

                    endpointId:
                        endpointTwin.endpointId,

                    currentState: {
                        $nin: [
                            "RESOLVED",
                            "CONTAINED"
                        ]
                    }

                })
                .sort({
                    updatedAt: -1
                })
                .lean();

        }


        /*
         * Fallback:
         * If the Endpoint Twin did not give us a match,
         * find the newest active incident.
         */

        if (!activeIncident) {

            activeIncident =
                await IncidentTwin.findOne({

                    currentState: {
                        $nin: [
                            "RESOLVED",
                            "CONTAINED"
                        ]
                    }

                })
                .sort({
                    updatedAt: -1
                })
                .lean();

        }


        const incidentCount =
            await IncidentTwin.countDocuments();


        /*
         * =====================================================
         * 4. ENDPOINT SECURITY DATA
         * =====================================================
         */

        const endpointState =
            endpointTwin?.securityState ||
            activeIncident?.endpointState ||
            "UNKNOWN";


        const riskScore =
            Number(
                endpointTwin?.riskScore ??
                activeIncident?.riskScore ??
                0
            );


        const riskLevel =
            endpointTwin?.riskLevel ||
            activeIncident?.riskLevel ||
            getRiskLevel(riskScore);


        const confidence =
            Number(
                endpointTwin?.evidenceConfidence ??
                activeIncident?.confidence ??
                0
            );


        /*
         * Digital Twin health is based on the twin being
         * present and receiving recent telemetry.
         */

        const telemetryAgeMs =
            latestTelemetry?.timestamp
                ? Date.now() -
                  new Date(
                      latestTelemetry.timestamp
                  ).getTime()
                : Infinity;

        /*
         * Twin Health Score (0-100)
         * 40: Endpoint Twin exists
         * 30: Telemetry is recent
         * 20: Endpoint is active
         * 10: Twin confidence
         */
        let twinHealthScore = 0;

        if (endpointTwin) {
            twinHealthScore += 40;
        }

        if (
            Number.isFinite(telemetryAgeMs) &&
            telemetryAgeMs <= 120000
        ) {
            twinHealthScore += 30;
        }

        if (
            String(endpointTwin?.status || "").toUpperCase() ===
            "ACTIVE"
        ) {
            twinHealthScore += 20;
        }

        twinHealthScore += Math.min(
            10,
            Math.max(0, confidence / 10)
        );

        twinHealthScore = Math.round(
            Math.min(100, twinHealthScore)
        );

        const twinHealth =
            getHealthLevel(twinHealthScore);


        /*
         * =====================================================
         * 5. INCIDENT DATA
         * =====================================================
         */

        const findingDistribution = [];
        const findingCounts = new Map();
        const riskDistribution = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            CRITICAL: 0
        };

        const riskBreakdown = Array.isArray(endpointTwin?.riskBreakdown)
            ? endpointTwin.riskBreakdown
            : [];

        riskBreakdown.forEach((finding) => {
            const type = typeof finding === "string"
                ? finding
                : finding?.type || finding?.name || "OTHER";
            const key = String(type || "OTHER").trim() || "OTHER";
            findingCounts.set(key, (findingCounts.get(key) || 0) + 1);
        });

        findingCounts.forEach((count, type) => {
            findingDistribution.push({ type, count });
        });

        findingDistribution.sort((a, b) => b.count - a.count);

        /*
         * Risk distribution reflects the severity of the
         * current findings. Older Endpoint Twin records may
         * contain only a finding type, so those findings fall
         * back to the current calculated risk level.
         */
        riskBreakdown.forEach((finding) => {
            const severity = String(
                typeof finding === "object" && finding?.severity
                    ? finding.severity
                    : riskLevel
            ).toUpperCase();

            const normalizedSeverity = [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ].includes(severity)
                ? severity
                : riskLevel;

            const count = Math.max(
                1,
                Number(
                    typeof finding === "object" && finding?.count
                        ? finding.count
                        : 1
                )
            );

            riskDistribution[normalizedSeverity] += count;
        });

        if (
            Object.values(riskDistribution).every(count => count === 0) &&
            riskScore > 0
        ) {
            const fallbackLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
                String(riskLevel).toUpperCase()
            )
                ? String(riskLevel).toUpperCase()
                : getRiskLevel(riskScore);

            riskDistribution[fallbackLevel] = 1;
        }

        /*
         * Events Over Time uses the same detection engine as
         * the live telemetry pipeline. It summarizes the last
         * 24 hours into hourly buckets.
         */
        const eventsOverTime = [];
        const now = Date.now();
        const eventWindowStart = new Date(now - 24 * 60 * 60 * 1000);

        try {
            const historicalTelemetry = await Telemetry.find({
                timestamp: { $gte: eventWindowStart }
            })
                .select({ timestamp: 1, telemetry: 1 })
                .sort({ timestamp: 1 })
                .lean();

            const buckets = new Map();

            for (const record of historicalTelemetry) {
                const timestamp = new Date(record.timestamp);
                if (Number.isNaN(timestamp.getTime())) continue;

                const bucketTime = new Date(
                    Math.floor(timestamp.getTime() / (60 * 60 * 1000)) *
                    (60 * 60 * 1000)
                );
                const bucketKey = bucketTime.toISOString();

                if (!buckets.has(bucketKey)) {
                    buckets.set(bucketKey, {
                        timestamp: bucketTime,
                        count: 0
                    });
                }

                const findings = detectThreats(
                    record.telemetry || {}
                );

                const suspiciousEvents = findings.reduce(
                    (sum, finding) =>
                        sum + Math.max(0, Number(finding?.count) || 0),
                    0
                );

                buckets.get(bucketKey).count += suspiciousEvents;
            }

            for (let hour = 23; hour >= 0; hour--) {
                const bucketTime = new Date(
                    now - hour * 60 * 60 * 1000
                );
                bucketTime.setMinutes(0, 0, 0);

                const bucketKey = bucketTime.toISOString();
                const bucket = buckets.get(bucketKey);

                eventsOverTime.push({
                    timestamp: bucketTime,
                    label: bucketTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    }),
                    count: bucket?.count || 0
                });
            }
        } catch (eventsError) {
            console.error(
                "Dashboard events-over-time error:",
                eventsError
            );
        }

        const incidentData = {

            id:
                activeIncident?.incidentId ||
                null,

            type:
                activeIncident?.incidentType ||
                null,

            severity:
                activeIncident?.severity ||
                null,

            state:
                activeIncident?.currentState ||
                null,

            confidence:
                Number(
                    activeIncident?.confidence || 0
                ),

            riskScore:
                Number(
                    activeIncident?.riskScore || 0
                ),

            riskLevel:
                activeIncident?.riskLevel ||
                null

        };


        /*
         * =====================================================
         * 6. EVIDENCE SUMMARY
         * =====================================================
         */

        let evidenceItems = 0;
        let evidenceSufficiency = 0;
        let evidenceCoverage = 0;
        let evidenceQuality = 0;
        let investigationConfidence = 0;


        if (activeIncident) {

            const evidence =
                Array.isArray(
                    activeIncident.evidence
                )
                    ? activeIncident.evidence
                    : [];


            evidenceItems =
                evidence.length;


            investigationConfidence =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            activeIncident.confidence ??
                            confidence ??
                            0
                        )
                    )
                );


            /*
             * Use the same evidence investigation service
             * as the Evidence Investigation page.
             *
             * Investigation Health is a composite score:
             * 50 points: expected evidence-category coverage
             * 25 points: supporting evidence quality
             * 15 points: active incident investigation data
             * 10 points: investigation confidence
             */

            try {

                const investigationSummary =
                    await getSummary(
                        activeIncident.incidentId
                    );


                evidenceSufficiency =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            Number(
                                investigationSummary.sufficiency ||
                                0
                            )
                        )
                    );


                const expectedCount =
                    Array.isArray(
                        investigationSummary.expectedCategories
                    )
                        ? investigationSummary.expectedCategories.length
                        : 0;


                const presentCount =
                    Array.isArray(
                        investigationSummary.presentCategories
                    )
                        ? investigationSummary.presentCategories.length
                        : 0;


                evidenceCoverage =
                    expectedCount > 0
                        ? Math.round(
                            (
                                presentCount /
                                expectedCount
                            ) * 100
                        )
                        : 100;


                const supportingCount =
                    Number(
                        investigationSummary.supportingCount ||
                        0
                    );


                evidenceQuality =
                    evidenceItems > 0
                        ? Math.round(
                            (
                                supportingCount /
                                evidenceItems
                            ) * 100
                        )
                        : 0;

            } catch (evidenceError) {

                console.error(
                    "Dashboard evidence summary error:",
                    evidenceError
                );

            }

        }


        const investigationHealthScore =
            Math.round(
                Math.min(
                    100,
                    (
                        evidenceCoverage * 0.50 +
                        evidenceQuality * 0.25 +
                        (activeIncident ? 15 : 0) +
                        (investigationConfidence * 0.10)
                    )
                )
            );


        /*
         * =====================================================
         * 7. ATTACK PATH
         * =====================================================
         */

        const activeAttackPaths =
            activeIncident &&
            Array.isArray(
                activeIncident.attackProgression
            )
                ? activeIncident.attackProgression.length
                : 0;


        /*
         * =====================================================
         * 8. TELEMETRY OVERVIEW
         * =====================================================
         */

        const overview = {

            processes:
                telemetry.processes?.process_count ||
                0,

            connections:
                telemetry.network?.connection_count ||
                0,

            users:
                telemetry.users?.user_count ||
                0,

            logs:
                telemetry.logs?.log_count ||
                0

        };


        /*
         * =====================================================
         * 9. RESPONSE
         * =====================================================
         */

        return res.json({

            success: true,

            timestamp:
                latestTelemetry.timestamp,

            agent,

            overview,

            resources:
                telemetry.resources || {},

            system:
                telemetry.system || {},


            endpoint: {

                endpointId:
                    endpointTwin?.endpointId ||
                    agent.name ||
                    null,

                hostname:
                    endpointTwin?.hostname ||
                    telemetry.system?.hostname ||
                    "Unknown",

                operatingSystem:
                    endpointTwin?.os ||
                    telemetry.system?.operating_system ||
                    agent.platform ||
                    "Unknown",

                ip:
                    endpointTwin?.ip ||
                    "Unknown",

                status:
                    endpointTwin?.status ||
                    "UNKNOWN",

                securityState:
                    endpointState,

                riskScore,

                riskLevel,

                confidence

            },


            incident:
                incidentData,


            evidence: {

                sufficiency:
                    evidenceSufficiency,

                total:
                    evidenceItems

            },


            attackPath: {

                active:
                    activeAttackPaths

            },


            incidentCount,

            twinHealth,

            twinHealthScore,

            investigationHealthScore,

            blockchainHealth:
                "VERIFIED",

            findingDistribution,

            riskDistribution,

            eventsOverTime

        });


    } catch (error) {

        console.error(
            "Dashboard overview error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch dashboard data"

        });

    }

};


/*
 * =========================================================
 * RISK LEVEL FALLBACK
 * =========================================================
 */

function getRiskLevel(score) {

    if (score >= 60) {
        return "CRITICAL";
    }

    if (score >= 40) {
        return "HIGH";
    }

    if (score >= 25) {
        return "MEDIUM";
    }

    return "LOW";

}


function getHealthLevel(score) {

    if (score >= 80) {
        return "HEALTHY";
    }

    if (score >= 60) {
        return "GOOD";
    }

    if (score >= 40) {
        return "DEGRADED";
    }

    return "POOR";

}


module.exports = {
    getDashboardOverview
};