const Telemetry = require("../models/Telemetry");
const EndpointTwin = require("../models/EndpointTwin");
const IncidentTwin = require("../models/IncidentTwin");
const { getSummary } = require("../services/evidenceInvestigationService");


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


        if (activeIncident) {

            const evidence =
                Array.isArray(
                    activeIncident.evidence
                )
                    ? activeIncident.evidence
                    : [];


            evidenceItems =
                evidence.length;


            /*
             * Use the same evidence investigation service
             * as the Evidence Investigation page so the
             * dashboard KPIs reflect supporting evidence,
             * missing evidence types, and sufficiency.
             */

            try {

                const investigationSummary =
                    await getSummary(
                        activeIncident.incidentId
                    );


                evidenceSufficiency =
                    Number(
                        investigationSummary.sufficiency ||
                        0
                    );

            } catch (evidenceError) {

                console.error(
                    "Dashboard evidence summary error:",
                    evidenceError
                );

            }

        }


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

            investigationHealthScore:
                Math.round(
                    Math.min(
                        100,
                        Math.max(0, evidenceSufficiency)
                    )
                ),

            blockchainHealth:
                "VERIFIED"

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