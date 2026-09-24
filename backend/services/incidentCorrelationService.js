/**
 * CyberTwinX
 * Incident Correlation Service
 *
 * Converts actual Detection Engine findings
 * into an Incident Twin.
 */

const IncidentTwin = require("../models/IncidentTwin");
const Telemetry = require("../models/Telemetry");


// =========================================================
// SEVERITY RANKING
// =========================================================

const SEVERITY_RANK = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};


// =========================================================
// FORMAT FINDING TYPE
// =========================================================

function formatFindingType(type = "Security Incident") {

    return String(type)
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}


// =========================================================
// GET INCIDENT SEVERITY
// =========================================================

function getIncidentSeverity(
    findings,
    riskLevel
) {

    let highestSeverity = "LOW";

    for (const finding of findings) {

        const severity =
            String(
                finding.severity || "LOW"
            ).toUpperCase();

        if (
            SEVERITY_RANK[severity] >
            SEVERITY_RANK[highestSeverity]
        ) {

            highestSeverity = severity;

        }

    }

    const calculatedRisk =
        String(
            riskLevel || "LOW"
        ).toUpperCase();

    if (
        SEVERITY_RANK[calculatedRisk] >
        SEVERITY_RANK[highestSeverity]
    ) {

        highestSeverity =
            calculatedRisk;

    }

    return highestSeverity;
}


// =========================================================
// MAP SECURITY STATE → INCIDENT STATE
// =========================================================

function mapIncidentState(
    securityState
) {

    if (
        securityState ===
        "COMPROMISED"
    ) {

        return "COMPROMISED";

    }

    if (
        securityState ===
        "SUSPICIOUS"
    ) {

        return "SUSPICIOUS";

    }

    return "DETECTED";
}


// =========================================================
// GENERATE INCIDENT ID
// =========================================================

async function generateIncidentId() {

    const incidents =
        await IncidentTwin.find(
            {
                incidentId: {
                    $regex: /^INC-\d+$/
                }
            },
            {
                incidentId: 1
            }
        ).lean();

    let highestNumber = 0;

    for (
        const incident of incidents
    ) {

        const number =
            parseInt(
                incident.incidentId
                    .replace("INC-", ""),
                10
            );

        if (
            !Number.isNaN(number)
        ) {

            highestNumber =
                Math.max(
                    highestNumber,
                    number
                );

        }

    }

    return (
        `INC-${String(
            highestNumber + 1
        ).padStart(3, "0")}`
    );
}


// =========================================================
// GET INCIDENT TYPE
// =========================================================

function getIncidentType(
    findings
) {

    if (
        !findings.length
    ) {

        return "Security Incident";

    }

    let strongestFinding =
        findings[0];

    for (
        const finding of findings
    ) {

        const currentSeverity =
            String(
                finding.severity ||
                "LOW"
            ).toUpperCase();

        const strongestSeverity =
            String(
                strongestFinding.severity ||
                "LOW"
            ).toUpperCase();

        if (
            SEVERITY_RANK[currentSeverity] >
            SEVERITY_RANK[strongestSeverity]
        ) {

            strongestFinding =
                finding;

        }

    }

    return formatFindingType(
        strongestFinding.type
    );
}


// =========================================================
// MAP FINDING → EVIDENCE CATEGORY
// =========================================================

function getEvidenceCategory(
    type,
    description = ""
) {

    const findingType =
        String(
            type || ""
        ).toUpperCase();

    const findingDescription =
        String(
            description || ""
        ).toUpperCase();


    if (
        findingType.includes("AUTH") ||
        findingType.includes("LOGIN") ||
        findingType.includes("PASSWORD") ||
        findingType.includes("ACCOUNT") ||
        findingDescription.includes("AUTHENTICATION") ||
        findingDescription.includes("LOGIN")
    ) {

        return "AUTHENTICATION";

    }


    if (
        findingType.includes("PRIVILEGE") ||
        findingType.includes("ROOT") ||
        findingType.includes("SUDO") ||
        findingType.includes("ESCALATION")
    ) {

        return "PRIVILEGE";

    }


    if (
        findingType.includes("PROCESS") ||
        findingType.includes("EXECUTION") ||
        findingType.includes("MALWARE")
    ) {

        return "PROCESS";

    }


    if (
        findingType.includes("NETWORK") ||
        findingType.includes("CONNECTION") ||
        findingType.includes("TRAFFIC") ||
        findingType.includes("PORT") ||
        findingType.includes("IP")
    ) {

        return "NETWORK";

    }


    if (
        findingType.includes("FILE") ||
        findingType.includes("INTEGRITY") ||
        findingType.includes("MODIFICATION")
    ) {

        return "FILE_INTEGRITY";

    }


    return "OTHER";
}


// =========================================================
// GET EVIDENCE TIMESTAMP
// =========================================================

function getEvidenceTimestamp(
    finding,
    telemetry
) {

    const possibleTimestamps = [

        finding?.timestamp,

        finding?.eventTimestamp,

        finding?.time,

        finding?.detectedAt

    ];


    for (
        const value of possibleTimestamps
    ) {

        if (!value) {
            continue;
        }

        const parsed =
            new Date(value);

        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed;

        }

    }


    const authenticationEvents =
        Array.isArray(
            telemetry?.telemetry?.authentication?.events
        )
            ? telemetry.telemetry.authentication.events
            : [];


    for (
        const event of authenticationEvents
    ) {

        if (!event?.timestamp) {
            continue;
        }


        const message =
            String(
                event.raw_message ||
                event.message ||
                ""
            ).toLowerCase();


        const description =
            String(
                finding?.description ||
                ""
            ).toLowerCase();


        const findingType =
            String(
                finding?.type ||
                ""
            ).toLowerCase();


        if (
            (
                description &&
                message.includes(
                    description
                )
            ) ||
            (
                findingType.includes("auth") &&
                (
                    message.includes("failed password") ||
                    message.includes("authentication failure") ||
                    message.includes("invalid user") ||
                    message.includes("failed login")
                )
            ) ||
            (
                findingType.includes("privilege") &&
                (
                    message.includes("sudo") ||
                    message.includes("session opened for user root")
                )
            )
        ) {

            const parsed =
                new Date(
                    event.timestamp
                );

            if (
                !Number.isNaN(
                    parsed.getTime()
                )
            ) {

                return parsed;

            }

        }

    }


    if (
        telemetry?.timestamp
    ) {

        const telemetryTimestamp =
            new Date(
                telemetry.timestamp
            );

        if (
            !Number.isNaN(
                telemetryTimestamp.getTime()
            )
        ) {

            return telemetryTimestamp;

        }

    }


    return null;
}


// =========================================================
// MERGE ACTUAL FINDINGS INTO EVIDENCE
// =========================================================

function mergeEvidence(
    existingEvidence,
    findings,
    incidentId,
    telemetryId,
    telemetry = null
) {

    const evidence = [
        ...existingEvidence
    ];


    for (
        const finding of findings
    ) {

        const type =
            String(
                finding.type ||
                "UNKNOWN"
            ).toUpperCase();


        const description =
            finding.description ||
            "";


        const newSeverity =
            String(
                finding.severity ||
                "LOW"
            ).toUpperCase();


        const category =
            getEvidenceCategory(
                type,
                description
            );


        const timestamp =
            getEvidenceTimestamp(
                finding,
                telemetry
            );


        const existing =
            evidence.find(
                item =>
                    item.type === type
            );


        if (existing) {

            const oldSeverity =
                String(
                    existing.severity ||
                    "LOW"
                ).toUpperCase();


            existing.description =
                description;


            existing.status =
                "SUPPORTING";


            existing.category =
                category;


            if (telemetryId) {

                existing.telemetryId =
                    telemetryId;

            }


            if (timestamp) {

                existing.timestamp =
                    timestamp;

            }


            if (
                SEVERITY_RANK[newSeverity] >
                SEVERITY_RANK[oldSeverity]
            ) {

                existing.severity =
                    newSeverity;

            }


            continue;
        }


        const evidenceTimestamp =
            timestamp ||
            (
                telemetry?.timestamp
                    ? new Date(
                        telemetry.timestamp
                    )
                    : new Date()
            );


        evidence.push({

            evidenceId:
                `${incidentId}-E${String(
                    evidence.length + 1
                ).padStart(3, "0")}`,

            type,

            category,

            severity:
                newSeverity,

            status:
                "SUPPORTING",

            description,

            timestamp:
                evidenceTimestamp,

            telemetryId:
                telemetryId || null

        });

    }


    return evidence;
}


// =========================================================
// BUILD / UPDATE ATTACK PROGRESSION
// =========================================================

function updateAttackProgression(
    existingProgression,
    hostname,
    findings
) {

    const progression = [
        ...existingProgression
    ];


    if (hostname) {

        const endpointNode =
            `Endpoint: ${hostname}`;


        if (
            !progression.includes(
                endpointNode
            )
        ) {

            progression.unshift(
                endpointNode
            );

        }

    }


    for (
        const finding of findings
    ) {

        const node =
            formatFindingType(
                finding.type
            );


        if (
            !progression.includes(node)
        ) {

            progression.push(node);

        }

    }


    return progression;
}


// =========================================================
// BUILD ACTUAL AUTHENTICATION TIMELINE
// =========================================================

function buildAuthenticationTimeline(
    telemetry,
    incident
) {

    const timeline = [];


    const events =
        Array.isArray(
            telemetry?.telemetry?.authentication?.events
        )
            ? telemetry.telemetry.authentication.events
            : [];


    for (const event of events) {

        if (!event?.timestamp) {
            continue;
        }


        const message =
            event.raw_message ||
            event.message ||
            "";


        if (!message) {
            continue;
        }


        let title =
            "Authentication Activity";


        if (
            /useradd|userdel|adduser|deluser/i.test(message)
        ) {

            title =
                "User Account Modification";

        }

        else if (
            /sudo:.*USER=root/i.test(message) ||
            /session opened for user root/i.test(message)
        ) {

            title =
                "Privilege Escalation";

        }

        else if (
            /\bsudo:/i.test(message)
        ) {

            title =
                "Privileged Activity";

        }

        else if (
            /failed password/i.test(message) ||
            /authentication failure/i.test(message) ||
            /failed login/i.test(message) ||
            /invalid user/i.test(message)
        ) {

            title =
                "Authentication Failure";

        }


        timeline.push({

            time:
                new Date(
                    event.timestamp
                ),

            title,

            description:
                message

        });

    }


    return timeline;
}


// =========================================================
// REMOVE DUPLICATE TIMELINE EVENTS
// =========================================================

function mergeTimeline(
    existingTimeline,
    newTimeline
) {

    const timeline = [
        ...existingTimeline
    ];


    for (
        const newEvent of newTimeline
    ) {

        const duplicate =
            timeline.some(
                existing =>
                    new Date(existing.time).getTime() ===
                    new Date(newEvent.time).getTime() &&
                    existing.title ===
                    newEvent.title &&
                    existing.description ===
                    newEvent.description
            );


        if (!duplicate) {

            timeline.push(
                newEvent
            );

        }

    }


    timeline.sort(
        (a, b) =>
            new Date(a.time) -
            new Date(b.time)
    );


    return timeline;
}


// =========================================================
// INCIDENT CORRELATION
// =========================================================

async function correlateIncident({

    endpointId,

    hostname,

    telemetryId,

    securityAnalysis

}) {

    const findings =
        Array.isArray(
            securityAnalysis?.findings
        )
            ? securityAnalysis.findings
            : [];


    if (
        findings.length === 0
    ) {

        return {

            created: false,

            updated: false,

            incident: null

        };

    }


    // =====================================================
    // LOAD ORIGINAL TELEMETRY
    // =====================================================

    const telemetry =
        await Telemetry.findById(
            telemetryId
        ).lean();


    // =====================================================
    // DETERMINE INCIDENT VALUES
    // =====================================================

    const incidentState =
        mapIncidentState(
            securityAnalysis.state
        );


    const severity =
        getIncidentSeverity(
            findings,
            securityAnalysis.riskLevel
        );


    // =====================================================
    // FIND EXISTING ACTIVE INCIDENT
    // =====================================================

    let incident =
        await IncidentTwin.findOne({

            endpointId,

            currentState: {
                $nin: [
                    "RESOLVED",
                    "CONTAINED"
                ]
            }

        }).sort({

            updatedAt: -1

        });


    // =====================================================
    // BUILD ACTUAL TELEMETRY TIMELINE
    // =====================================================

    const telemetryTimeline =
        buildAuthenticationTimeline(
            telemetry,
            incident
        );


    // =====================================================
    // CREATE NEW INCIDENT
    // =====================================================

    if (!incident) {

        const incidentId =
            await generateIncidentId();


        const now =
            new Date();


        const evidence =
            mergeEvidence(
                [],
                findings,
                incidentId,
                telemetryId,
                telemetry
            );


        const timeline =
            mergeTimeline(
                [],
                telemetryTimeline
            );


        incident =
            new IncidentTwin({

                incidentId,

                incidentType:
                    getIncidentType(
                        findings
                    ),

                severity,

                currentState:
                    incidentState,

                confidence:
                    securityAnalysis.confidence,

                riskScore:
                    securityAnalysis.score,

                riskLevel:
                    securityAnalysis.riskLevel,

                endpointId,

                endpointHostname:
                    hostname || "",

                endpointState:
                    securityAnalysis.state,

                evidence,

                lifecycle: [

                    {

                        state:
                            incidentState,

                        time:
                            now,

                        description:
                            "Incident detected from endpoint security findings."

                    }

                ],

                attackProgression:
                    updateAttackProgression(
                        [],
                        hostname,
                        findings
                    ),

                currentObjective:
                    "",

                timeline

            });


        await incident.save();


        return {

            created: true,

            updated: false,

            incident

        };

    }


    // =====================================================
    // UPDATE EXISTING INCIDENT
    // =====================================================

    const previousState =
        incident.currentState;


    const previousRisk =
        incident.riskScore;


    const previousEvidenceCount =
        incident.evidence.length;


    const now =
        new Date();


    // =====================================================
    // UPDATE CURRENT VALUES
    // =====================================================

    incident.severity =
        severity;


    incident.currentState =
        incidentState;


    incident.confidence =
        securityAnalysis.confidence;


    incident.riskScore =
        securityAnalysis.score;


    incident.riskLevel =
        securityAnalysis.riskLevel;


    incident.endpointHostname =
        hostname ||
        incident.endpointHostname;


    incident.endpointState =
        securityAnalysis.state;


    // =====================================================
    // MERGE EVIDENCE
    // =====================================================

    incident.evidence =
        mergeEvidence(

            incident.evidence,

            findings,

            incident.incidentId,

            telemetryId,

            telemetry

        );


    // =====================================================
    // UPDATE ATTACK PROGRESSION
    // =====================================================

    incident.attackProgression =
        updateAttackProgression(

            incident.attackProgression,

            hostname,

            findings

        );


    // =====================================================
    // MERGE ACTUAL TELEMETRY TIMELINE
    // =====================================================

    incident.timeline =
        mergeTimeline(

            incident.timeline,

            telemetryTimeline

        );


    // =====================================================
    // STATE TRANSITION
    // =====================================================

    if (
        previousState !==
        incidentState
    ) {

        incident.lifecycle.push({

            state:
                incidentState,

            time:
                now,

            description:
                `Incident state changed from ${previousState} to ${incidentState}.`

        });

    }


    // =====================================================
    // NEW EVIDENCE
    // =====================================================

    if (
        incident.evidence.length >
        previousEvidenceCount
    ) {

        const newEvidenceCount =
            incident.evidence.length -
            previousEvidenceCount;


        /*
         * Keep the event timeline
         * evidence-driven.
         *
         * Do not create a fake
         * "New Evidence Detected"
         * timestamp here.
         */

    }


    // =====================================================
    // RISK CHANGE
    // =====================================================

    /*
     * Risk changes are already stored
     * in the Incident Twin fields.
     *
     * Do not add a fake attack timestamp
     * using new Date().
     */


    await incident.save();


    return {

        created: false,

        updated: true,

        incident

    };

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    correlateIncident

};