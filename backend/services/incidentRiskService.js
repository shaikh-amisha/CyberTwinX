const IncidentTwin = require("../models/IncidentTwin");

function getRiskLevel(score) {
    if (score >= 60) return "CRITICAL";
    if (score >= 40) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
}

function getSecurityState(score) {
    if (score >= 60) return "COMPROMISED";
    if (score >= 25) return "SUSPICIOUS";
    return "NORMAL";
}

/*
 * Aggregate independent active incidents with diminishing returns.
 *
 * A straight sum makes the global score jump too quickly (for example,
 * two incidents scored 50 each immediately produce 100). Instead, each
 * incident contributes its risk against the remaining risk capacity:
 *
 * combined = 100 * (1 - product(1 - incidentScore / 100))
 *
 * This is order-independent, always bounded to 0..100, and ensures that
 * each additional active incident raises risk while its marginal increase
 * gets smaller as the endpoint approaches the upper end of the scale.
 * Per-incident scores and evidence counts remain unchanged in breakdown.
 */
function combineIncidentRiskScores(incidents = []) {
    let remainingSafety = 1;

    for (const incident of incidents) {
        const incidentScore = Math.max(
            0,
            Math.min(100, Number(incident?.riskScore) || 0)
        );

        remainingSafety *= 1 - incidentScore / 100;
    }

    return Math.round((1 - remainingSafety) * 100);
}

async function aggregateActiveIncidentRisk(endpointId) {
    const incidents = await IncidentTwin.find({
        endpointId,
        currentState: {
            $nin: ["RESOLVED", "CONTAINED"]
        }
    }).lean();

    const score = combineIncidentRiskScores(incidents);

    const breakdown = incidents.map(incident => ({
        type: incident.incidentType || "SECURITY_INCIDENT",
        severity: String(incident.severity || "LOW").toUpperCase(),
        score: Number(incident.riskScore || 0),
        count: Array.isArray(incident.evidence)
            ? incident.evidence.length
            : 1,
        description:
            (incident.incidentType || "Security incident") +
            " is active on the endpoint.",
        incidentId: incident.incidentId
    }));

    return {
        score,
        level: getRiskLevel(score),
        state: getSecurityState(score),
        breakdown,
        activeIncidentCount: incidents.length
    };
}

module.exports = {
    aggregateActiveIncidentRisk,
    combineIncidentRiskScores
};
