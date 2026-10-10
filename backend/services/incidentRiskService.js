const IncidentTwin = require("../models/IncidentTwin");

function getRiskLevel(score) {
    if (score >= 80) return "CRITICAL";
    if (score >= 60) return "HIGH";
    if (score >= 35) return "MEDIUM";
    return "LOW";
}

function getSecurityState(score) {
    if (score >= 80) return "COMPROMISED";
    if (score >= 35) return "SUSPICIOUS";
    return "NORMAL";
}

const SEVERITY_BASELINES = {
    LOW: 15,
    MEDIUM: 35,
    HIGH: 60,
    CRITICAL: 80
};

/*
 * Aggregate active incidents without summing their stored scores.
 * Individual incident scores can already be saturated at 100, so summing
 * or probabilistically compounding them causes the endpoint score to hit
 * 100 too quickly. Use incident severity as a stable per-incident signal,
 * blend it with the stored score, average across incidents, then add a
 * small logarithmic volume bonus. This makes incident count matter without
 * treating 30 incidents as 30 independent 100-point risks.
 */
function normalizedIncidentScore(incident) {
    const severity = String(incident?.severity || "LOW").toUpperCase();
    const baseline = SEVERITY_BASELINES[severity] || SEVERITY_BASELINES.LOW;
    const stored = Math.max(0, Math.min(100, Number(incident?.riskScore) || 0));

    // Stored incident scores may be capped from multiple findings; temper
    // that value with the incident's declared severity to avoid saturation.
    return Math.round((baseline * 0.65) + (Math.min(stored, baseline + 15) * 0.35));
}

function combineIncidentRiskScores(incidents = []) {
    const scores = incidents
        .map(normalizedIncidentScore)
        .filter(score => Number.isFinite(score) && score > 0);

    if (!scores.length) return 0;

    const averageRisk = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const volumeBonus = Math.min(20, 4 * Math.log2(scores.length));
    return Math.max(0, Math.min(100, Math.round(averageRisk + volumeBonus)));
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
        count: Array.isArray(incident.evidence) ? incident.evidence.length : 1,
        description: (incident.incidentType || "Security incident") + " is active on the endpoint.",
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
    combineIncidentRiskScores,
    normalizedIncidentScore
};
