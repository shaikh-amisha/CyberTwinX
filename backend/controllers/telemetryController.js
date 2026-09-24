const Telemetry = require("../models/Telemetry");
const EndpointTwin = require("../models/EndpointTwin");
const SecurityStateHistory = require("../models/securityStateHistory");

const {
    evaluateSecurityState
} = require("../services/securityStateEngine");

const {
    correlateIncident
} = require("../services/incidentCorrelationService");


const receiveTelemetry = async (req, res) => {

    try {

        const telemetryData = req.body;


        // =====================================================
        // 1. ANALYZE TELEMETRY
        // =====================================================

        const securityAnalysis =
            evaluateSecurityState(
                telemetryData.telemetry || {}
            );


        // =====================================================
        // 2. STORE RAW TELEMETRY
        // =====================================================

            const savedTelemetry =
                await Telemetry.create(
                    telemetryData
                );

        // =====================================================
        // 3. EXTRACT TELEMETRY
        // =====================================================

        const data =
            telemetryData.telemetry || {};

        const system =
            data.system || {};

        const processes =
            data.processes || {};

        const network =
            data.network || {};

        const users =
            data.users || {};

        const logs =
            data.logs || {};


        // =====================================================
        // 4. ENDPOINT INFORMATION
        // =====================================================

        const agent =
            telemetryData.agent || {};

        const endpointId =
            agent.name ||
            telemetryData.hostname ||
            "CYBERTWIN-ENDPOINT";

        const hostname =
            system.hostname ||
            telemetryData.hostname ||
            "Unknown";

        const os =
            agent.platform ||
            system.os ||
            "Linux";

        const ip =
            network.ip ||
            network.local_ip ||
            network.primary_ip ||
            "Unknown";


        // =====================================================
        // 5. GET PREVIOUS ENDPOINT TWIN
        // =====================================================

        const previousEndpoint =
            await EndpointTwin.findOne({
                endpointId
            });


        // =====================================================
        // 6. UPDATE ENDPOINT TWIN
        // =====================================================

        const endpointTwin =
            await EndpointTwin.findOneAndUpdate(

                { endpointId },

                {
                    endpointId,

                    hostname,

                    os,

                    ip,

                    status: "ACTIVE",

                    securityState:
                        securityAnalysis.state,

                    riskScore:
                        securityAnalysis.score,

                    evidenceConfidence:
                        securityAnalysis.confidence,

                    /*
                     * Use the risk level calculated
                     * by the Risk Score Engine.
                     */
                    riskLevel:
                        securityAnalysis.riskLevel,

                    riskBreakdown:
                        buildRiskBreakdown(
                            securityAnalysis.findings
                        ),

                    telemetry: {

                        processes:
                            processes.process_count ||
                            processes.count ||
                            0,

                        connections:
                            network.connection_count ||
                            network.connections ||
                            0,

                        users:
                            users.user_count ||
                            users.count ||
                            0,

                        logs:
                            logs.log_count ||
                            logs.count ||
                            0
                    },

                    lastUpdated:
                        new Date()
                },

                {
                    returnDocument: "after",
                    upsert: true
                }
            );


        // =====================================================
        // 7. DETECT STATE / RISK CHANGE
        // =====================================================

        const stateChanged =
            !previousEndpoint ||
            previousEndpoint.securityState !==
                securityAnalysis.state;

        const riskChanged =
            !previousEndpoint ||
            previousEndpoint.riskScore !==
                securityAnalysis.score;


        // =====================================================
        // 8. SAVE SECURITY STATE HISTORY
        // =====================================================

        if (stateChanged || riskChanged) {

            await SecurityStateHistory.create({

                endpointId,

                state:
                    securityAnalysis.state,

                riskScore:
                    securityAnalysis.score,

                riskLevel:
                    securityAnalysis.riskLevel,

                confidence:
                    securityAnalysis.confidence,

                findings:
                    securityAnalysis.findings,

                changedAt:
                    new Date()
            });
        }


        // =====================================================
        // 9. INCIDENT CORRELATION
        // =====================================================

        const incidentCorrelation =
            await correlateIncident({

                endpointId,

                hostname,

                telemetryId: savedTelemetry._id,

                securityAnalysis

            });


        // =====================================================
        // 10. RESPONSE
        // =====================================================

        res.status(201).json({

            success: true,

            message:
                "Telemetry received successfully",

            telemetryId:
                savedTelemetry._id,

            securityAnalysis,


            // =================================================
            // ENDPOINT TWIN
            // =================================================

            endpointTwin: {

                endpointId:
                    endpointTwin.endpointId,

                status:
                    endpointTwin.status,

                securityState:
                    endpointTwin.securityState,

                riskScore:
                    endpointTwin.riskScore,

                riskLevel:
                    endpointTwin.riskLevel,

                evidenceConfidence:
                    endpointTwin.evidenceConfidence,

                riskBreakdown:
                    endpointTwin.riskBreakdown,

                lastUpdated:
                    endpointTwin.lastUpdated
            },


            // =================================================
            // INCIDENT TWIN
            // =================================================

            incidentTwin:
                incidentCorrelation.incident

        });


    } catch (error) {

        console.error(
            "Telemetry ingestion error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to store telemetry",

            error:
                error.message
        });

    }
};


// =========================================================
// RISK BREAKDOWN
// =========================================================

function buildRiskBreakdown(findings) {

    if (!Array.isArray(findings)) {

        return [];

    }

    return findings.map(

        finding => ({

            type:
                finding.type,

            severity:
                finding.severity,

            score:
                getFindingScore(
                    finding.severity
                ),

            count:
                finding.count || 0,

            description:
                finding.description || ""

        })

    );
}


// =========================================================
// FINDING SCORE
// =========================================================

function getFindingScore(severity) {

    if (severity === "CRITICAL") {

        return 40;

    }

    if (severity === "HIGH") {

        return 30;

    }

    if (severity === "MEDIUM") {

        return 15;

    }

    if (severity === "LOW") {

        return 5;

    }

    return 0;
}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    receiveTelemetry

};