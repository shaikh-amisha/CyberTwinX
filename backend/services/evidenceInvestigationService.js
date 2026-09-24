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

    AUTHENTICATION: [
        "AUTHENTICATION",
        "NETWORK"
    ],

    AUTHENTICATION_FAILURE: [
        "AUTHENTICATION",
        "NETWORK"
    ],

    FAILED_AUTHENTICATION: [
        "AUTHENTICATION",
        "NETWORK"
    ],

    ACCOUNT_COMPROMISE: [
        "AUTHENTICATION",
        "PRIVILEGE",
        "PROCESS"
    ],

    USER_ACCOUNT_MODIFICATION: [
        "AUTHENTICATION",
        "PRIVILEGE"
    ],

    PRIVILEGE_ESCALATION: [
        "AUTHENTICATION",
        "PRIVILEGE",
        "PROCESS"
    ],

    PRIVILEGED_ACTIVITY: [
        "AUTHENTICATION",
        "PRIVILEGE",
        "PROCESS"
    ],

    PROCESS_EXECUTION: [
        "PROCESS",
        "NETWORK"
    ],

    SUSPICIOUS_PROCESS: [
        "PROCESS",
        "NETWORK"
    ],

    NETWORK_ACTIVITY: [
        "NETWORK",
        "PROCESS"
    ],

    FILE_INTEGRITY: [
        "FILE_INTEGRITY",
        "PROCESS"
    ]

};


/* =========================================================
   NORMALIZE VALUE
========================================================= */

function normalizeValue(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(value) {

    const status =
        normalizeValue(value);

    if (status === "SUPPORTING") {
        return "SUPPORTING";
    }

    if (status === "CONTRADICTING") {
        return "CONTRADICTING";
    }

    if (status === "NEUTRAL") {
        return "NEUTRAL";
    }

    return "SUPPORTING";

}


/* =========================================================
   INFER EVIDENCE CATEGORY
========================================================= */

function inferEvidenceCategory(evidence) {

    if (!evidence) {
        return "OTHER";
    }


    const explicitCategory =
        normalizeValue(
            evidence.category
        );


    if (
        Object.prototype.hasOwnProperty.call(
            EVIDENCE_TAXONOMY,
            explicitCategory
        )
    ) {

        return explicitCategory;

    }


    const type =
        normalizeValue(
            evidence.type
        );


    const description =
        normalizeValue(
            evidence.description
        );


    const combined =
        `${type} ${description}`;


    /* -----------------------------------------------------
       AUTHENTICATION
    ----------------------------------------------------- */

    if (
        /AUTH|LOGIN|PASSWORD|CREDENTIAL|ACCOUNT|USER|SESSION/.test(
            combined
        )
    ) {

        if (
            /PRIVILEGE|ROOT|SUDO|ESCALAT/.test(
                combined
            )
        ) {

            return "PRIVILEGE";

        }

        return "AUTHENTICATION";

    }


    /* -----------------------------------------------------
       PRIVILEGE
    ----------------------------------------------------- */

    if (
        /PRIVILEGE|ROOT|SUDO|ESCALAT|ADMIN/.test(
            combined
        )
    ) {

        return "PRIVILEGE";

    }


    /* -----------------------------------------------------
       PROCESS
    ----------------------------------------------------- */

    if (
        /PROCESS|EXECUTION|COMMAND|SHELL|MALWARE|BINARY/.test(
            combined
        )
    ) {

        return "PROCESS";

    }


    /* -----------------------------------------------------
       NETWORK
    ----------------------------------------------------- */

    if (
        /NETWORK|CONNECTION|TRAFFIC|SOCKET|IP|PORT|DNS|HTTP|HTTPS|TCP|UDP/.test(
            combined
        )
    ) {

        return "NETWORK";

    }


    /* -----------------------------------------------------
       FILE INTEGRITY
    ----------------------------------------------------- */

    if (
        /FILE|INTEGRITY|MODIFICATION|MODIFIED|DELETED|CREATED|PERSISTENCE/.test(
            combined
        )
    ) {

        return "FILE_INTEGRITY";

    }


    return "OTHER";

}


/* =========================================================
   NORMALIZE EVIDENCE
========================================================= */

function normalizeEvidence(
    evidence,
    index = 0
) {

    const category =
        inferEvidenceCategory(
            evidence
        );


    const status =
        normalizeStatus(
            evidence.status
        );


    return {

        evidenceId:
            evidence.evidenceId ||
            `EVIDENCE-${String(index + 1).padStart(3, "0")}`,

        type:
            evidence.type ||
            "UNKNOWN",

        category,

        severity:
            normalizeValue(
                evidence.severity
            ) || "LOW",

        status,

        description:
            evidence.description ||
            "Evidence associated with the incident.",

        timestamp:
            evidence.timestamp ||
            null,

        telemetryId:
            evidence.telemetryId ||
            null

    };

}


/* =========================================================
   GET EXPECTED CATEGORIES
========================================================= */

function getExpectedCategories(
    incidentType
) {

    const normalizedType =
        normalizeValue(
            incidentType
        );


    if (
        INCIDENT_EVIDENCE_REQUIREMENTS[
            normalizedType
        ]
    ) {

        return [
            ...INCIDENT_EVIDENCE_REQUIREMENTS[
                normalizedType
            ]
        ];

    }


    return [
        "AUTHENTICATION",
        "PROCESS",
        "NETWORK"
    ];

}


/* =========================================================
   GET PRESENT CATEGORIES
========================================================= */

function getPresentCategories(
    evidence
) {

    const present =
        new Set();


    evidence.forEach(
        item => {

            if (
                item.status !==
                "SUPPORTING"
            ) {

                return;

            }


            if (
                Object.prototype.hasOwnProperty.call(
                    EVIDENCE_TAXONOMY,
                    item.category
                )
            ) {

                present.add(
                    item.category
                );

            }

        }
    );


    return [
        ...present
    ];

}


/* =========================================================
   GET MISSING CATEGORIES
========================================================= */

function getMissingCategories(
    expectedCategories,
    presentCategories
) {

    const present =
        new Set(
            presentCategories
        );


    return expectedCategories.filter(
        category =>
            !present.has(
                category
            )
    );

}


/* =========================================================
   BUILD MISSING EVIDENCE
========================================================= */

function buildMissingEvidence(
    missingCategories
) {

    return missingCategories.map(
        category => {

            const definition =
                EVIDENCE_TAXONOMY[
                    category
                ];


            return {

                category,

                label:
                    definition?.label ||
                    category,

                description:
                    definition?.description ||
                    "Additional evidence may improve investigation confidence."

            };

        }
    );

}


/* =========================================================
   CALCULATE SUFFICIENCY
========================================================= */

function calculateSufficiency(
    expectedCategories,
    presentCategories
) {

    if (!expectedCategories.length) {
        return 100;
    }


    const present =
        new Set(
            presentCategories
        );


    const covered =
        expectedCategories.filter(
            category =>
                present.has(
                    category
                )
        ).length;


    return Math.round(
        (
            covered /
            expectedCategories.length
        ) * 100
    );

}


/* =========================================================
   BUILD SUMMARY
========================================================= */

function buildSummary(
    incident,
    evidence
) {

    const expectedCategories =
        getExpectedCategories(
            incident.incidentType
        );


    const presentCategories =
        getPresentCategories(
            evidence
        );


    const missingCategories =
        getMissingCategories(
            expectedCategories,
            presentCategories
        );


    const supportingEvidence =
        evidence.filter(
            item =>
                item.status ===
                "SUPPORTING"
        );


    const sufficiency =
        calculateSufficiency(
            expectedCategories,
            presentCategories
        );


    return {

        incidentId:
            incident.incidentId,

        incidentType:
            incident.incidentType,

        supportingCount:
            supportingEvidence.length,

        missingCount:
            missingCategories.length,

        sufficiency,

        currentState:
            incident.currentState,

        riskScore:
            incident.riskScore ?? 0,

        riskLevel:
            incident.riskLevel || "LOW",

        confidence:
            incident.confidence ?? 0,

        expectedCategories,

        presentCategories,

        missingCategories

    };

}


/* =========================================================
   BUILD DETAILS
========================================================= */

function buildDetails(
    evidence
) {

    const categories =
        Object.keys(
            EVIDENCE_TAXONOMY
        );


    return categories.map(
        category => {

            const records =
                evidence.filter(
                    item =>
                        item.category ===
                        category
                );


            const supporting =
                records.filter(
                    item =>
                        item.status ===
                        "SUPPORTING"
                );


            const latest =
                records[
                    records.length - 1
                ];


            return {

                category,

                label:
                    EVIDENCE_TAXONOMY[
                        category
                    ].label,

                description:
                    latest?.description ||
                    EVIDENCE_TAXONOMY[
                        category
                    ].description,

                status:
                    supporting.length
                        ? "SUPPORTING"
                        : "MISSING",

                evidence:
                    records

            };

        }
    );

}


/* =========================================================
   BUILD TIMELINE
========================================================= */

function buildTimeline(
    incident,
    evidence
) {

    const timeline =
        Array.isArray(
            incident.timeline
        )
            ? incident.timeline.map(
                event => ({
                    time:
                        event.time ||
                        null,

                    title:
                        event.title ||
                        "Evidence Event",

                    description:
                        event.description ||
                        ""
                })
            )
            : [];


    evidence.forEach(
        item => {

            if (!item.timestamp) {
                return;
            }


            const alreadyExists =
                timeline.some(
                    event => {

                        const sameTime =
                            new Date(
                                event.time
                            ).getTime() ===
                            new Date(
                                item.timestamp
                            ).getTime();


                        const sameDescription =
                            event.description ===
                            item.description;


                        return (
                            sameTime &&
                            sameDescription
                        );

                    }
                );


            if (alreadyExists) {
                return;
            }


            timeline.push({

                time:
                    item.timestamp,

                title:
                    item.type ||
                    `${item.category} Evidence`,

                description:
                    item.description ||
                    "Evidence associated with the incident."

            });

        }
    );


    return timeline
        .filter(
            event =>
                event.time
        )
        .sort(
            (a, b) =>
                new Date(a.time) -
                new Date(b.time)
        );

}


/* =========================================================
   GET INCIDENT
========================================================= */

async function getIncident(
    incidentId
) {

    const incident =
        await IncidentTwin
            .findOne({
                incidentId
            })
            .lean();


    if (!incident) {

        const error =
            new Error(
                "Incident not found"
            );

        error.statusCode =
            404;

        throw error;

    }


    return incident;

}


/* =========================================================
   GET COMPLETE INVESTIGATION
========================================================= */

async function getInvestigation(
    incidentId
) {

    const incident =
        await getIncident(
            incidentId
        );


    const evidence =
        (
            Array.isArray(
                incident.evidence
            )
                ? incident.evidence
                : []
        ).map(
            normalizeEvidence
        );


    const summary =
        buildSummary(
            incident,
            evidence
        );


    const details =
        buildDetails(
            evidence
        );


    const timeline =
        buildTimeline(
            incident,
            evidence
        );


    const missingEvidence =
        buildMissingEvidence(
            summary.missingCategories
        );


    return {

        incident: {

            incidentId:
                incident.incidentId,

            incidentType:
                incident.incidentType,

            severity:
                incident.severity,

            currentState:
                incident.currentState,

            confidence:
                incident.confidence,

            riskScore:
                incident.riskScore,

            riskLevel:
                incident.riskLevel,

            endpointId:
                incident.endpointId,

            endpointHostname:
                incident.endpointHostname,

            endpointState:
                incident.endpointState

        },

        summary,

        evidence,

        details,

        timeline,

        missingEvidence

    };

}


/* =========================================================
   GET SUMMARY
========================================================= */

async function getSummary(
    incidentId
) {

    const incident =
        await getIncident(
            incidentId
        );


    const evidence =
        (
            Array.isArray(
                incident.evidence
            )
                ? incident.evidence
                : []
        ).map(
            normalizeEvidence
        );


    return buildSummary(
        incident,
        evidence
    );

}


/* =========================================================
   GET DETAILS
========================================================= */

async function getDetails(
    incidentId
) {

    const incident =
        await getIncident(
            incidentId
        );


    const evidence =
        (
            Array.isArray(
                incident.evidence
            )
                ? incident.evidence
                : []
        ).map(
            normalizeEvidence
        );


    return buildDetails(
        evidence
    );

}


/* =========================================================
   GET TIMELINE
========================================================= */

async function getTimeline(
    incidentId
) {

    const incident =
        await getIncident(
            incidentId
        );


    const evidence =
        (
            Array.isArray(
                incident.evidence
            )
                ? incident.evidence
                : []
        ).map(
            normalizeEvidence
        );


    return buildTimeline(
        incident,
        evidence
    );

}


/* =========================================================
   GET MISSING EVIDENCE
========================================================= */

async function getMissing(
    incidentId
) {

    const summary =
        await getSummary(
            incidentId
        );


    return buildMissingEvidence(
        summary.missingCategories
    );

}


/* =========================================================
   EXPORTS
========================================================= */

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