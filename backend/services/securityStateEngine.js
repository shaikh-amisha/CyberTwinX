/**
 * CyberTwinX
 * Security State Engine
 *
 * Evaluates security findings and produces:
 * - Security state
 * - Risk score
 * - Confidence
 * - Risk breakdown
 */


/* =====================================================
   DEPENDENCIES
   ===================================================== */

const {
    calculateRiskScore
} = require("./riskScoreEngine");


const {
    detectThreats
} = require("./detectionEngine");


/* =====================================================
   DETECTION INPUT NORMALIZATION
   ===================================================== */

function normalizeDetectionTelemetry(telemetry = {}) {

    const normalized = {
        ...telemetry,
        authentication: {
            ...(telemetry.authentication || {})
        },
        files: {
            ...(telemetry.files || {})
        },
        network: {
            ...(telemetry.network || {})
        }
    };

    /*
     * The Linux agent provides current file state rather than
     * explicit file-event records. Preserve the agent data and
     * expose ransomware-relevant filenames as detection events.
     */
    const fileList = Array.isArray(normalized.files.files)
        ? normalized.files.files
        : [];

    const existingFileEvents = Array.isArray(normalized.files.events)
        ? normalized.files.events
        : [];

    const ransomwareFileEvents = fileList
        .filter(file =>
            /\.locked$|\.encrypted$|ransom/i.test(
                String(file?.name || file?.path || "")
            )
        )
        .map(file => ({
            action: "file_rename_or_encryption",
            filename: file?.name || "",
            path: file?.path || ""
        }));

    normalized.files.events = [
        ...existingFileEvents,
        ...ransomwareFileEvents
    ];

    /*
     * The Linux agent stores active connections under `connections`.
     * The detection engine also accepts an event-oriented shape.
     * Flatten the remote address so network detections can consume
     * the real agent telemetry without changing the collector.
     */
    const connections = Array.isArray(normalized.network.connections)
        ? normalized.network.connections
        : [];

    const existingNetworkEvents = Array.isArray(normalized.network.events)
        ? normalized.network.events
        : [];

    const connectionEvents = connections.map(connection => ({
        ...connection,
        remote_ip: connection?.remote_address?.ip || "",
        remote_port: connection?.remote_address?.port ?? null,
        destination_ip: connection?.remote_address?.ip || "",
        destination_port: connection?.remote_address?.port ?? null
    }));

    normalized.network.events = [
        ...existingNetworkEvents,
        ...connectionEvents
    ];

    return normalized;
}


/* =====================================================
   BRUTE FORCE COMPATIBILITY DETECTION
   ===================================================== */

function ensureBruteForceFinding(telemetry, findings) {

    if (
        findings.some(
            finding => finding.type === "BRUTE_FORCE"
        )
    ) {
        return findings;
    }

    const events = Array.isArray(
        telemetry?.authentication?.events
    )
        ? telemetry.authentication.events
        : [];

    const failedCount = events.filter(event =>
        /failed password|authentication failure|failed login|invalid user/i.test(
            String(
                event?.raw_message ||
                event?.message ||
                ""
            )
        )
    ).length;

    /*
     * Five or more failures are enough to classify the activity as
     * brute force when the V2 detector did not already classify it.
     * This prevents the generic authentication finding from being the
     * only result for a short but clear brute-force test window.
     */
    if (failedCount < 5) {
        return findings;
    }

    return [
        ...findings,
        {
            type: "BRUTE_FORCE",
            severity: "HIGH",
            count: failedCount,
            description:
                `Repeated authentication failures detected (${failedCount} events).`,
            category: "IDENTITY_CREDENTIAL",
            evidenceType: "AUTHENTICATION"
        }
    ];
}


/* =====================================================
   SECURITY STATE ENGINE
   ===================================================== */

function evaluateSecurityState(telemetry) {

    /* =================================================
       01. DETECTION
       ================================================= */

    const detectionTelemetry =
        normalizeDetectionTelemetry(telemetry);

    let findings =
        detectThreats(detectionTelemetry);

    findings = ensureBruteForceFinding(
        detectionTelemetry,
        findings
    );


    /* =================================================
       02. RISK SCORE
       ================================================= */

    const riskAnalysis =
        calculateRiskScore(findings);


    const riskScore =
        riskAnalysis.score;


    /* =================================================
       03. SECURITY STATE
       ================================================= */

    let state = "NORMAL";


    if (riskScore >= 60) {

        state = "COMPROMISED";

    }

    else if (riskScore >= 25) {

        state = "SUSPICIOUS";

    }


    /* =================================================
       04. CONFIDENCE
       ================================================= */

    let confidence = 70;


    if (findings.length === 0) {

        confidence = 70;

    }

    else if (
        findings.some(
            finding =>
                finding.severity === "HIGH"
        )
    ) {

        confidence = 90;

    }

    else {

        confidence = 80;

    }


    /* =================================================
       05. RESULT
       ================================================= */

    return {

        state,

        score:
            riskScore,

        riskLevel:
            riskAnalysis.level,

        confidence,

        findings,

        riskBreakdown:
            riskAnalysis.breakdown,

        evaluatedAt:
            new Date()

    };

}


/* =====================================================
   EXPORTS
   ===================================================== */

module.exports = {

    evaluateSecurityState

};