const IncidentTwin =
    require("../models/IncidentTwin");

const EndpointTwin =
    require("../models/EndpointTwin");

const {
    calculateRiskScore
} = require("./riskScoreEngine");


/* =========================================================
   RESPONSE DEFINITIONS
   ========================================================= */

const RESPONSE_DEFINITIONS = {

    DISABLE_ACCOUNT: {

        name: "Disable Account",

        description:
            "Temporarily disable the affected user account.",

        expectedEffect:
            "Removes the account-related attack condition from the modeled state.",

        reversible: true,

        duration: "Immediate",

        disruption: "Medium"

    },


    ISOLATE_ENDPOINT: {

        name: "Isolate Endpoint",

        description:
            "Restrict the endpoint from communicating with other systems.",

        expectedEffect:
            "Removes network-dependent attack activity from the modeled state.",

        reversible: true,

        duration: "Immediate",

        disruption: "High"

    },


    BLOCK_SOURCE_IP: {

        name: "Block Source IP",

        description:
            "Block the identified source IP address.",

        expectedEffect:
            "Removes source-IP-dependent network activity from the modeled state.",

        reversible: true,

        duration: "Immediate",

        disruption: "Low"

    },


    TERMINATE_PROCESS: {

        name: "Terminate Process",

        description:
            "Terminate the process associated with the detected activity.",

        expectedEffect:
            "Removes process-dependent malicious activity from the modeled state.",

        reversible: false,

        duration: "Immediate",

        disruption: "Medium"

    }

};


/* =========================================================
   RESPONSE COVERAGE
   ========================================================= */

const RESPONSE_COVERAGE = {

    DISABLE_ACCOUNT: [

        "USER_ACCOUNT_MODIFICATION",

        "AUTHENTICATION_FAILURE",

        "CREDENTIAL_COMPROMISE",

        "BRUTE_FORCE"

    ],


    ISOLATE_ENDPOINT: [

        "NETWORK_ANOMALY",

        "LATERAL_MOVEMENT",

        "DATA_EXFILTRATION",

        "RANSOMWARE",

        "MALWARE",

        "TROJAN",

        "DOS",

        "DDOS"

    ],


    BLOCK_SOURCE_IP: [

        "NETWORK_ANOMALY",

        "AUTHENTICATION_FAILURE",

        "BRUTE_FORCE",

        "DOS",

        "DDOS",

        "WEB_APPLICATION_ATTACK",

        "SQL_INJECTION",

        "COMMAND_INJECTION"

    ],


    TERMINATE_PROCESS: [

        "PROCESS_ANOMALY",

        "MALWARE",

        "TROJAN",

        "COMMAND_INJECTION",

        "RANSOMWARE"

    ]

};


/* =========================================================
   NORMALIZE TYPE
   ========================================================= */

function normalizeType(value) {

    return String(value || "")

        .trim()

        .toUpperCase()

        .replace(/[-\s]+/g, "_")

        .replace(/[^A-Z0-9_]/g, "");

}


/* =========================================================
   ATTACK ALIASES
   ========================================================= */

const ATTACK_ALIASES = {

    "USER_ACCOUNT_MODIFICATION":
        "USER_ACCOUNT_MODIFICATION",

    "USER_ACCOUNT":
        "USER_ACCOUNT_MODIFICATION",

    "ACCOUNT_MODIFICATION":
        "USER_ACCOUNT_MODIFICATION",


    "PRIVILEGED_ACTIVITY":
        "PRIVILEGED_ACTIVITY",

    "PRIVILEGED":
        "PRIVILEGED_ACTIVITY",


    "PRIVILEGE_ESCALATION":
        "PRIVILEGE_ESCALATION",

    "PRIVILEGE":
        "PRIVILEGE_ESCALATION",


    "CREDENTIAL_COMPROMISE":
        "CREDENTIAL_COMPROMISE",

    "CREDENTIAL":
        "CREDENTIAL_COMPROMISE",


    "BRUTE_FORCE":
        "BRUTE_FORCE",

    "AUTHENTICATION_FAILURE":
        "AUTHENTICATION_FAILURE",


    "NETWORK_ANOMALY":
        "NETWORK_ANOMALY",

    "LATERAL_MOVEMENT":
        "LATERAL_MOVEMENT",

    "DATA_EXFILTRATION":
        "DATA_EXFILTRATION",

    "PROCESS_ANOMALY":
        "PROCESS_ANOMALY",

    "MALWARE":
        "MALWARE",

    "TROJAN":
        "TROJAN",

    "RANSOMWARE":
        "RANSOMWARE"

};


function canonicalType(value) {

    const normalized =
        normalizeType(value);

    return (
        ATTACK_ALIASES[normalized] ||
        normalized
    );

}


/* =========================================================
   FIND INCIDENT
   ========================================================= */

async function findIncident(
    incidentId,
    endpointId
) {

    if (incidentId) {

        const incident =
            await IncidentTwin
                .findOne({
                    incidentId
                })
                .lean();


        if (!incident) {

            throw new Error(
                `Incident ${incidentId} not found.`
            );

        }


        return incident;

    }


    if (endpointId) {

        const incident =
            await IncidentTwin
                .findOne({

                    endpointId,

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


        if (incident) {

            return incident;

        }

    }


    const incident =
        await IncidentTwin

            .findOne({

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


    if (!incident) {

        throw new Error(
            "No active incident is available for What-If analysis."
        );

    }


    return incident;

}


/* =========================================================
   FIND ENDPOINT
   ========================================================= */

async function findEndpoint(
    endpointId,
    incident
) {

    const resolvedEndpointId =
        endpointId ||
        incident?.endpointId;


    if (resolvedEndpointId) {

        const endpoint =
            await EndpointTwin
                .findOne({

                    endpointId:
                        resolvedEndpointId

                })
                .lean();


        if (endpoint) {

            return endpoint;

        }

    }


    const endpoint =
        await EndpointTwin

            .findOne({})

            .sort({
                lastUpdated: -1
            })

            .lean();


    if (!endpoint) {

        throw new Error(
            "No Endpoint Twin is available for What-If analysis."
        );

    }


    return endpoint;

}


/* =========================================================
   NORMALIZE FINDINGS
   ========================================================= */

function normalizeFindings(
    findings
) {

    if (!Array.isArray(findings)) {

        return [];

    }


    return findings

        .map(finding => ({

            type:
                finding?.type ||
                "UNKNOWN",

            severity:
                String(
                    finding?.severity ||
                    "LOW"
                ).toUpperCase(),

            score:
                Number(
                    finding?.score ||
                    0
                ),

            count:
                Number(
                    finding?.count ||
                    1
                ),

            description:
                finding?.description ||
                ""

        }))

        .filter(
            finding =>
                finding.type !== "UNKNOWN"
        );

}


/* =========================================================
   OBSERVED ATTACKS
   ========================================================= */

function getObservedAttacks(
    attackProgression
) {

    if (!Array.isArray(
        attackProgression
    )) {

        return [];

    }


    return [
        ...new Set(

            attackProgression

                .filter(Boolean)

                .filter(item => {

                    const normalized =
                        normalizeType(item);

                    return (
                        normalized !== "ENDPOINT" &&
                        !normalized.startsWith(
                            "ENDPOINT_"
                        )
                    );

                })

        )
    ];

}


/* =========================================================
   VALIDATE SELECTED ATTACK
   ========================================================= */

function validateSelectedAttack(
    attackType,
    observedAttacks
) {

    if (!attackType) {

        return null;

    }


    const requested =
        canonicalType(
            attackType
        );


    const match =
        observedAttacks.find(
            observed =>
                canonicalType(
                    observed
                ) === requested
        );


    if (!match) {

        const error =
            new Error(
                `Attack "${attackType}" is not an observed attack for this incident.`
            );

        error.statusCode = 400;

        throw error;

    }


    return match;

}


/* =========================================================
   FINDING FOR ATTACK
   ========================================================= */

function findAttackFinding(
    attackType,
    findings
) {

    if (!attackType) {

        return null;

    }


    const normalizedAttack =
        canonicalType(
            attackType
        );


    return (
        findings.find(
            finding =>
                canonicalType(
                    finding.type
                ) === normalizedAttack
        ) ||
        null
    );

}


/* =========================================================
   BUILD EVIDENCE
   ========================================================= */

function buildEvidence(
    incident,
    selectedAttack,
    selectedFinding
) {

    const incidentEvidence =
        Array.isArray(
            incident?.evidence
        )
            ? incident.evidence
            : [];


    if (!selectedAttack) {

        return incidentEvidence;

    }


    const normalizedAttack =
        canonicalType(
            selectedAttack
        );


    const matchingEvidence =
        incidentEvidence.filter(
            evidence => {

                const values = [

                    evidence?.type,

                    evidence?.category,

                    evidence?.description

                ];


                return values.some(
                    value =>
                        canonicalType(
                            value
                        ) === normalizedAttack
                );

            }
        );


    if (matchingEvidence.length) {

        return matchingEvidence;

    }


    /*
     * The finding is returned as evidence context
     * only when actual incident evidence is unavailable.
     *
     * We do not invent an evidence record.
     */

    if (selectedFinding) {

        return [

            {

                source:
                    "Endpoint Twin",

                type:
                    selectedFinding.type,

                severity:
                    selectedFinding.severity,

                description:
                    selectedFinding.description,

                count:
                    selectedFinding.count

            }

        ];

    }


    return [];

}


/* =========================================================
   RESPONSE APPLICABILITY
   ========================================================= */

function evaluateResponse(
    action,
    selectedAttack,
    selectedFinding,
    evidence
) {

    const definition =
        RESPONSE_DEFINITIONS[action];


    const coverage =
        RESPONSE_COVERAGE[action] ||
        [];


    const normalizedAttack =
        canonicalType(
            selectedAttack
        );


    const supportedByAttack =
        coverage.some(
            type =>
                canonicalType(type) ===
                normalizedAttack
        );


    /*
     * No selected attack:
     *
     * Do not mark every response as supported.
     * The analyst must select an observed stage first.
     */

    if (!selectedAttack) {

        return {

            action,

            name:
                definition.name,

            status:
                "NOT_APPLICABLE",

            reason:
                "Select an observed attack stage before evaluating this response.",

            expectedEffect:
                definition.expectedEffect,

            description:
                definition.description,

            duration:
                definition.duration,

            disruption:
                definition.disruption,

            reversible:
                definition.reversible,

            evidence

        };

    }


    /*
     * The response does not directly cover
     * the selected attack type.
     */

    if (!supportedByAttack) {

        return {

            action,

            name:
                definition.name,

            status:
                "NOT_APPLICABLE",

            reason:
                `${definition.name} does not directly address the selected attack stage.`,

            expectedEffect:
                definition.expectedEffect,

            description:
                definition.description,

            duration:
                definition.duration,

            disruption:
                definition.disruption,

            reversible:
                definition.reversible,

            evidence

        };

    }


    /*
     * The response covers the attack type,
     * but evidence must exist before simulation
     * is considered supported.
     */

    if (!selectedFinding && !evidence.length) {

        return {

            action,

            name:
                definition.name,

            status:
                "INSUFFICIENT_EVIDENCE",

            reason:
                "The selected attack is present in the incident context, but there is insufficient evidence to model this response confidently.",

            expectedEffect:
                definition.expectedEffect,

            description:
                definition.description,

            duration:
                definition.duration,

            disruption:
                definition.disruption,

            reversible:
                definition.reversible,

            evidence

        };

    }


    return {

        action,

        name:
            definition.name,

        status:
            "SUPPORTED",

        reason:
            `${definition.name} directly addresses the selected attack stage supported by the available evidence.`,

        expectedEffect:
            definition.expectedEffect,

        description:
            definition.description,

        duration:
            definition.duration,

        disruption:
            definition.disruption,

        reversible:
            definition.reversible,

        evidence

    };

}


/* =========================================================
   BUILD RESPONSE SCENARIOS
   ========================================================= */

function buildResponseScenarios(
    selectedAttack,
    selectedFinding,
    evidence
) {

    return Object.keys(
        RESPONSE_DEFINITIONS
    ).map(

        action =>
            evaluateResponse(

                action,

                selectedAttack,

                selectedFinding,

                evidence

            )

    );

}


/* =========================================================
   RISK HELPERS
   ========================================================= */

function getRiskLevel(
    score
) {

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


function getSecurityState(
    score
) {

    if (score >= 60) {

        return "COMPROMISED";

    }

    if (score >= 25) {

        return "SUSPICIOUS";

    }

    return "NORMAL";

}


/* =========================================================
   BUILD ATTACK PATHS
   ========================================================= */

function buildAttackPaths(
    progression
) {

    if (!Array.isArray(
        progression
    )) {

        return [];

    }


    if (!progression.length) {

        return [];

    }


    return [

        {

            id:
                "Path-1",

            name:
                "Observed Attack Path",

            stages:
                progression.map(
                    (label, index) => ({

                        order:
                            index + 1,

                        label,

                        type:
                            normalizeType(
                                label
                            )

                    })
                ),

            stageCount:
                progression.length

        }

    ];

}


/* =========================================================
   SIMULATE ATTACK PROGRESSION
   ========================================================= */

function simulateAttackProgression(
    progression,
    actualFindings,
    simulatedFindings
) {

    if (!Array.isArray(
        progression
    )) {

        return [];

    }


    const removedTypes =
        actualFindings

            .filter(actual => {

                const simulated =
                    simulatedFindings.find(
                        item =>
                            canonicalType(
                                item.type
                            ) ===
                            canonicalType(
                                actual.type
                            )
                    );


                return (
                    !simulated ||
                    Number(
                        simulated.count
                    ) <= 0
                );

            })

            .map(
                finding =>
                    canonicalType(
                        finding.type
                    )
            );


    if (!removedTypes.length) {

        return [
            ...progression
        ];

    }


    return progression.filter(
        node => {

            const normalizedNode =
                canonicalType(
                    node
                );


            return !removedTypes.some(
                type => {

                    return (

                        normalizedNode ===
                        type

                        ||

                        normalizedNode.includes(
                            type
                        )

                        ||

                        normalizedNode.replace(
                            /_/g,
                            ""
                        ).includes(
                            type.replace(
                                /_/g,
                                ""
                            )
                        )

                    );

                }
            );

        }
    );

}


/* =========================================================
   APPLY RESPONSE
   ========================================================= */

function applyResponse(
    findings,
    action
) {

    const definition =
        RESPONSE_COVERAGE[action] ||
        [];


    const coverage =
        new Set(
            definition.map(
                canonicalType
            )
        );


    return findings.map(
        finding => {

            const normalized =
                canonicalType(
                    finding.type
                );


            if (!coverage.has(
                normalized
            )) {

                return {
                    ...finding
                };

            }


            return {

                ...finding,

                count: 0

            };

        }

    ).filter(
        finding =>
            Number(
                finding.count
            ) > 0
    );

}


/* =========================================================
   SIMULATE RESPONSE
   ========================================================= */

async function simulateWhatIf({

    endpointId,

    incidentId,

    attackType,

    action

} = {}) {

    if (!action) {

        const error =
            new Error(
                "What-If action is required."
            );

        error.statusCode = 400;

        throw error;

    }


    const normalizedAction =
        String(action)
            .trim()
            .toUpperCase();


    if (
        !RESPONSE_DEFINITIONS[
            normalizedAction
        ]
    ) {

        const error =
            new Error(
                `Unsupported What-If action: ${action}`
            );

        error.statusCode = 400;

        throw error;

    }


    /*
     * Reload the complete context.
     *
     * This is important because the simulation must
     * validate the action against the latest backend state.
     */

    const context =
        await getWhatIfContext({

            endpointId,

            incidentId,

            attackType

        });


    const selectedScenario =
        context.responseScenarios.find(
            scenario =>
                scenario.action ===
                normalizedAction
        );


    if (!selectedScenario) {

        const error =
            new Error(
                "Selected response scenario could not be resolved."
            );

        error.statusCode = 400;

        throw error;

    }


    if (
        selectedScenario.status !==
        "SUPPORTED"
    ) {

        const error =
            new Error(
                `${selectedScenario.name} cannot be simulated: ${selectedScenario.reason}`
            );

        error.statusCode = 400;

        throw error;

    }


    const actualFindings =
        context.actual.findings;


    /*
     * Counterfactual state only.
     *
     * MongoDB is NOT modified.
     */

    const simulatedFindings =
        applyResponse(

            actualFindings,

            normalizedAction

        );


    /*
     * Reuse the actual CyberTwinX
     * Risk Score Engine.
     */

    const simulatedRisk =
        calculateRiskScore(
            simulatedFindings
        );


    const simulatedRiskScore =
        simulatedRisk.score;


    const simulatedRiskLevel =
        simulatedRisk.level ||
        getRiskLevel(
            simulatedRiskScore
        );


    const simulatedSecurityState =
        getSecurityState(
            simulatedRiskScore
        );


    const simulatedProgression =
        simulateAttackProgression(

            context.actual.attackProgression,

            actualFindings,

            simulatedFindings

        );


    const simulatedPaths =
        buildAttackPaths(
            simulatedProgression
        );


    const riskReduction =
        context.actual.riskScore -
        simulatedRiskScore;


    const pathReduction =
        context.actual.attackPaths -
        simulatedPaths.length;


    let impact =
        "No modeled change was produced by this response.";


    if (
        riskReduction > 0 ||
        pathReduction > 0
    ) {

        const parts = [];


        if (riskReduction > 0) {

            parts.push(
                `Risk score decreases by ${riskReduction}.`
            );

        }


        if (pathReduction > 0) {

            parts.push(
                `The modeled attack path is reduced by ${pathReduction} stage${pathReduction === 1 ? "" : "s"}.`
            );

        }


        impact =
            parts.join(" ");

    }


    return {

        action:
            normalizedAction,

        actionName:
            selectedScenario.name,

        status:
            "SIMULATION ONLY",

        actual: {

            riskScore:
                context.actual.riskScore,

            riskLevel:
                context.actual.riskLevel,

            securityState:
                context.actual.securityState,

            attackPaths:
                context.actual.attackPaths,

            findings:
                actualFindings,

            attackProgression:
                context.actual.attackProgression,

            paths:
                context.actual.paths

        },

        simulation: {

            riskScore:
                simulatedRiskScore,

            riskLevel:
                simulatedRiskLevel,

            securityState:
                simulatedSecurityState,

            attackPaths:
                simulatedPaths.length,

            findings:
                simulatedFindings,

            attackProgression:
                simulatedProgression,

            paths:
                simulatedPaths,

            riskBreakdown:
                simulatedRisk.breakdown

        },

        impact,

        riskReduction,

        pathReduction,

        responseScenario:
            selectedScenario

    };

}


/* =========================================================
   GET WHAT-IF CONTEXT
   ========================================================= */

async function getWhatIfContext({

    endpointId,

    incidentId,

    attackType

} = {}) {

    const incident =
        await findIncident(

            incidentId,

            endpointId

        );


    const endpoint =
        await findEndpoint(

            endpointId,

            incident

        );


    /*
     * Endpoint Twin is the current state source.
     */

    const actualFindings =
        normalizeFindings(

            endpoint.riskBreakdown

        );


    const actualProgression =
        Array.isArray(
            incident.attackProgression
        )
            ? [
                ...incident.attackProgression
            ]
            : [];


    const observedAttacks =
        getObservedAttacks(
            actualProgression
        );


    /*
     * Validate attackType against the
     * actual Incident Twin progression.
     */

    const selectedAttack =
        validateSelectedAttack(

            attackType,

            observedAttacks

        );


    const selectedFinding =
        findAttackFinding(

            selectedAttack,

            actualFindings

        );


    const evidence =
        buildEvidence(

            incident,

            selectedAttack,

            selectedFinding

        );


    const responseScenarios =
        buildResponseScenarios(

            selectedAttack,

            selectedFinding,

            evidence

        );


    const riskScore =
        Number(

            endpoint.riskScore ??
            incident.riskScore ??
            0

        );


    const riskLevel =
        endpoint.riskLevel ||
        incident.riskLevel ||
        getRiskLevel(
            riskScore
        );


    const securityState =
        endpoint.securityState ||
        incident.endpointState ||
        getSecurityState(
            riskScore
        );


    const paths =
        buildAttackPaths(
            actualProgression
        );


    return {

        endpoint: {

            endpointId:
                endpoint.endpointId,

            hostname:
                endpoint.hostname ||
                "Unknown",

            os:
                endpoint.os ||
                "Linux",

            ip:
                endpoint.ip ||
                "Unknown",

            status:
                endpoint.status ||
                "UNKNOWN",

            securityState,

            riskScore,

            riskLevel,

            riskBreakdown:
                actualFindings,

            evidenceConfidence:
                Number(
                    endpoint.evidenceConfidence ||
                    incident.confidence ||
                    0
                )

        },


        incident: {

            incidentId:
                incident.incidentId,

            incidentType:
                incident.incidentType,

            currentState:
                incident.currentState,

            severity:
                incident.severity,

            confidence:
                Number(
                    incident.confidence ||
                    0
                ),

            riskScore:
                Number(
                    incident.riskScore ??
                    riskScore
                ),

            riskLevel:
                incident.riskLevel ||
                riskLevel,

            currentObjective:
                incident.currentObjective ||
                "",

            attackProgression:
                actualProgression,

            observedAttacks,

            timeline:
                Array.isArray(
                    incident.timeline
                )
                    ? incident.timeline
                    : []

        },


        actual: {

            riskScore,

            riskLevel,

            securityState,

            attackPaths:
                paths.length,

            findings:
                actualFindings,

            attackProgression:
                actualProgression,

            paths

        },


        selectedAttack:
            selectedAttack || null,


        selectedFinding:
            selectedFinding || null,


        evidence,


        responseScenarios

    };

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

    RESPONSE_DEFINITIONS,

    RESPONSE_COVERAGE,

    getWhatIfContext,

    simulateWhatIf

};