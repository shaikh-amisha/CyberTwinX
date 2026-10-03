const IncidentTwin = require("../models/IncidentTwin");


/* =========================================================
   EVIDENCE TAXONOMY
========================================================= */

const EVIDENCE_TAXONOMY = {

    AUTHENTICATION: {
        label: "Authentication Evidence",
        description:
            "Authentication events such as successful logins, failed authentication attempts, invalid users, and account activity."
    },

    PRIVILEGE: {
        label: "Privilege Evidence",
        description:
            "Evidence related to privileged activity, sudo usage, root sessions, and privilege escalation."
    },

    PROCESS: {
        label: "Process Evidence",
        description:
            "Process execution evidence used to identify suspicious, malicious, or abnormal process activity."
    },

    NETWORK: {
        label: "Network Evidence",
        description:
            "Network connections and communication evidence associated with the incident."
    },

    FILE_INTEGRITY: {
        label: "File Integrity Evidence",
        description:
            "File activity used to identify persistence, modification, deletion, or suspicious file changes."
    }

};


/* =========================================================
   INCIDENT EVIDENCE REQUIREMENTS
========================================================= */

const INCIDENT_EVIDENCE_REQUIREMENTS = {

    AUTHENTICATION: ["AUTHENTICATION", "NETWORK"],
    AUTHENTICATION_FAILURE: ["AUTHENTICATION", "NETWORK"],
    FAILED_AUTHENTICATION: ["AUTHENTICATION", "NETWORK"],
    BRUTE_FORCE: ["AUTHENTICATION", "NETWORK", "PROCESS"],
    PASSWORD_SPRAYING: ["AUTHENTICATION", "NETWORK", "PRIVILEGE"],
    ACCOUNT_COMPROMISE: ["AUTHENTICATION", "PRIVILEGE", "PROCESS"],
    USER_ACCOUNT_MODIFICATION: ["AUTHENTICATION", "PRIVILEGE", "PROCESS"],
    USER_ACCOUNT_MANIPULATION: ["AUTHENTICATION", "PRIVILEGE", "PROCESS"],
    PRIVILEGE_ESCALATION: ["AUTHENTICATION", "PRIVILEGE", "PROCESS"],
    PRIVILEGED_ACTIVITY: ["AUTHENTICATION", "PRIVILEGE", "PROCESS"],
    PROCESS_EXECUTION: ["PROCESS", "NETWORK"],
    SUSPICIOUS_PROCESS: ["PROCESS", "NETWORK"],
    SUSPICIOUS_PROCESS_EXECUTION: ["PROCESS", "NETWORK"],
    LIVING_OFF_THE_LAND: ["PROCESS", "NETWORK", "AUTHENTICATION"],
    RANSOMWARE_LIKE_ACTIVITY: ["FILE_INTEGRITY", "PROCESS", "NETWORK"],
    NETWORK_ACTIVITY: ["NETWORK", "PROCESS"],
    NETWORK_SCANNING: ["NETWORK", "PROCESS"],
    C2_LIKE_COMMUNICATION: ["NETWORK", "PROCESS"],
    DATA_EXFILTRATION: ["NETWORK", "PROCESS", "FILE_INTEGRITY"],
    SUSPICIOUS_SERVICE_ACTIVITY: ["PROCESS", "PRIVILEGE", "NETWORK"],
    ABNORMAL_FILE_SYSTEM_ACTIVITY: ["FILE_INTEGRITY", "PROCESS", "NETWORK"],
    FILE_INTEGRITY: ["FILE_INTEGRITY", "PROCESS"]

};

function normalizeValue(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
}

function normalizeStatus(value) {
    const status = normalizeValue(value);
    if (status === "SUPPORTING") return "SUPPORTING";
    if (status === "CONTRADICTING") return "CONTRADICTING";
    if (status === "NEUTRAL") return "NEUTRAL";
    return "SUPPORTING";
}

function inferEvidenceCategory(evidence) {
    if (!evidence) return "OTHER";

    const explicitCategory = normalizeValue(evidence.category);
    if (Object.prototype.hasOwnProperty.call(EVIDENCE_TAXONOMY, explicitCategory)) {
        return explicitCategory;
    }

    const type = normalizeValue(evidence.type);
    const description = normalizeValue(evidence.description);
    const combined = `${type} ${description}`;

    if (/AUTH|LOGIN|PASSWORD|CREDENTIAL|ACCOUNT|USER|SESSION/.test(combined)) {
        if (/PRIVILEGE|ROOT|SUDO|ESCALAT/.test(combined)) return "PRIVILEGE";
        return "AUTHENTICATION";
    }

    if (/PRIVILEGE|ROOT|SUDO|ESCALAT|ADMIN/.test(combined)) return "PRIVILEGE";
    if (/PROCESS|EXECUTION|COMMAND|SHELL|MALWARE|BINARY/.test(combined)) return "PROCESS";
    if (/NETWORK|CONNECTION|TRAFFIC|SOCKET|IP|PORT|DNS|HTTP|HTTPS|TCP|UDP/.test(combined)) return "NETWORK";
    if (/FILE|INTEGRITY|MODIFICATION|MODIFIED|DELETED|CREATED|PERSISTENCE/.test(combined)) return "FILE_INTEGRITY";

    return "OTHER";
}

function normalizeEvidence(evidence, index = 0) {
    const category = inferEvidenceCategory(evidence);
    const status = normalizeStatus(evidence.status);

    return {
        evidenceId: evidence.evidenceId || `EVIDENCE-${String(index + 1).padStart(3, "0")}`,
        type: evidence.type || "UNKNOWN",
        category,
        severity: normalizeValue(evidence.severity) || "LOW",
        status,
        description: evidence.description || "Evidence associated with the incident.",
        timestamp: evidence.timestamp || null,
        telemetryId: evidence.telemetryId || null
    };
}

function getExpectedCategories(incidentType) {
    const normalizedType = normalizeValue(incidentType);
    if (INCIDENT_EVIDENCE_REQUIREMENTS[normalizedType]) {
        return [...INCIDENT_EVIDENCE_REQUIREMENTS[normalizedType]];
    }
    return ["AUTHENTICATION", "PROCESS", "NETWORK"];
}

function getPresentCategories(evidence) {
    const present = new Set();
    evidence.forEach(item => {
        if (item.status !== "SUPPORTING") return;
        if (Object.prototype.hasOwnProperty.call(EVIDENCE_TAXONOMY, item.category)) {
            present.add(item.category);
        }
    });
    return [...present];
}

function getMissingCategories(expectedCategories, presentCategories) {
    const present = new Set(presentCategories);
    return expectedCategories.filter(category => !present.has(category));
}

function buildMissingEvidence(missingCategories) {
    return missingCategories.map(category => {
        const definition = EVIDENCE_TAXONOMY[category];
        return {
            category,
            label: definition?.label || category,
            description: definition?.description || "Additional evidence may improve investigation confidence."
        };
    });
}

function calculateSufficiency(expectedCategories, presentCategories) {
    if (!expectedCategories.length) return 100;
    const present = new Set(presentCategories);
    const covered = expectedCategories.filter(category => present.has(category)).length;
    return Math.round((covered / expectedCategories.length) * 100);
}

function buildSummary(incident, evidence) {
    const expectedCategories = getExpectedCategories(incident.incidentType);
    const presentCategories = getPresentCategories(evidence);
    const missingCategories = getMissingCategories(expectedCategories, presentCategories);
    const supportingEvidence = evidence.filter(item => item.status === "SUPPORTING");

    return {
        incidentId: incident.incidentId,
        incidentType: incident.incidentType,
        supportingCount: supportingEvidence.length,
        missingCount: missingCategories.length,
        sufficiency: calculateSufficiency(expectedCategories, presentCategories),
        currentState: incident.currentState,
        riskScore: incident.riskScore ?? 0,
        riskLevel: incident.riskLevel || "LOW",
        confidence: incident.confidence ?? 0,
        expectedCategories,
        presentCategories,
        missingCategories
    };
}

function buildDetails(evidence) {
    return Object.keys(EVIDENCE_TAXONOMY).map(category => {
        const records = evidence.filter(item => item.category === category);
        const supporting = records.filter(item => item.status === "SUPPORTING");
        const latest = records[records.length - 1];

        return {
            category,
            label: EVIDENCE_TAXONOMY[category].label,
            description: latest?.description || EVIDENCE_TAXONOMY[category].description,
            status: supporting.length ? "SUPPORTING" : "MISSING",
            evidence: records
        };
    });
}

function buildTimeline(incident, evidence) {
    const timeline = Array.isArray(incident.timeline)
        ? incident.timeline.map(event => ({
            time: event.time || null,
            title: event.title || "Evidence Event",
            description: event.description || ""
        }))
        : [];

    evidence.forEach(item => {
        if (!item.timestamp) return;

        const alreadyExists = timeline.some(event => {
            const sameTime = new Date(event.time).getTime() === new Date(item.timestamp).getTime();
            const sameDescription = event.description === item.description;
            return sameTime && sameDescription;
        });

        if (alreadyExists) return;

        timeline.push({
            time: item.timestamp,
            title: item.type || `${item.category} Evidence`,
            description: item.description || "Evidence associated with the incident."
        });
    });

    return timeline
        .filter(event => event.time)
        .sort((a, b) => new Date(a.time) - new Date(b.time));
}

async function getIncident(incidentId) {
    const incident = await IncidentTwin.findOne({ incidentId }).lean();

    if (!incident) {
        const error = new Error("Incident not found");
        error.statusCode = 404;
        throw error;
    }

    return incident;
}

async function getInvestigation(incidentId) {
    const incident = await getIncident(incidentId);
    const evidence = (Array.isArray(incident.evidence) ? incident.evidence : [])
        .map(normalizeEvidence);
    const summary = buildSummary(incident, evidence);
    const details = buildDetails(evidence);
    const timeline = buildTimeline(incident, evidence);
    const missingEvidence = buildMissingEvidence(summary.missingCategories);

    return {
        incident: {
            incidentId: incident.incidentId,
            incidentType: incident.incidentType,
            severity: incident.severity,
            currentState: incident.currentState,
            confidence: incident.confidence,
            riskScore: incident.riskScore,
            riskLevel: incident.riskLevel,
            endpointId: incident.endpointId,
            endpointHostname: incident.endpointHostname,
            endpointState: incident.endpointState
        },
        summary,
        evidence,
        details,
        timeline,
        missingEvidence
    };
}

async function getSummary(incidentId) {
    const incident = await getIncident(incidentId);
    const evidence = (Array.isArray(incident.evidence) ? incident.evidence : [])
        .map(normalizeEvidence);
    return buildSummary(incident, evidence);
}

async function getDetails(incidentId) {
    const incident = await getIncident(incidentId);
    const evidence = (Array.isArray(incident.evidence) ? incident.evidence : [])
        .map(normalizeEvidence);
    return buildDetails(evidence);
}

async function getTimeline(incidentId) {
    const incident = await getIncident(incidentId);
    const evidence = (Array.isArray(incident.evidence) ? incident.evidence : [])
        .map(normalizeEvidence);
    return buildTimeline(incident, evidence);
}

async function getMissing(incidentId) {
    const summary = await getSummary(incidentId);
    return buildMissingEvidence(summary.missingCategories);
}

module.exports = {
    EVIDENCE_TAXONOMY,
    INCIDENT_EVIDENCE_REQUIREMENTS,
    normalizeEvidence,
    inferEvidenceCategory,
    getExpectedCategories,
    getPresentCategories,
    getMissingCategories,
    calculateSufficiency,
    buildSummary,
    buildDetails,
    buildTimeline,
    buildMissingEvidence,
    getInvestigation,
    getSummary,
    getDetails,
    getTimeline,
    getMissing
};
