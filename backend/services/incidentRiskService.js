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

async function aggregateActiveIncidentRisk(endpointId) {
    const incidents = await IncidentTwin.find({
        endpointId,
        currentState: {
            $nin: ["RESOLVED", "CONTAINED"]
        }
    }).lean();

    const rawScore = incidents.reduce(
        (total, incident) =>
            total + Number(incident.riskScore || 0),
        0
    );

    const score = Math.min(rawScore, 100);

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
    aggregateActiveIncidentRisk
};
