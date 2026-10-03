const { calculateRiskScore } = require("./riskScoreEngine");

const RESPONSE_MODELS = {
    USER_ACCOUNT_MODIFICATION: [
        {
            action: "DISABLE_ACCOUNT",
            name: "Disable account",
            description: "Disable the affected account to stop further account-based activity.",
            expectedEffect: "Removes the account modification condition from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "REVERT_ACCOUNT_CHANGES",
            name: "Revert account changes",
            description: "Model a rollback of the account changes observed at this stage.",
            expectedEffect: "Removes the modeled account modification from the endpoint state.",
            disruption: "Medium"
        }
    ],
    PRIVILEGED_ACTIVITY: [
        {
            action: "REVOKE_PRIVILEGES",
            name: "Revoke elevated privileges",
            description: "Remove the elevated privileges associated with the observed activity.",
            expectedEffect: "Removes the privileged-activity condition from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "TERMINATE_PROCESS",
            name: "Terminate related process",
            description: "Stop the process associated with the privileged activity.",
            expectedEffect: "Removes process-dependent privileged activity from the modeled state.",
            disruption: "Medium"
        }
    ],
    PRIVILEGE_ESCALATION: [
        {
            action: "REVOKE_PRIVILEGES",
            name: "Revoke elevated privileges",
            description: "Remove the elevated privileges reached during the escalation stage.",
            expectedEffect: "Removes the privilege-escalation condition from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Restrict the endpoint from communicating while the escalation condition is contained.",
            expectedEffect: "Removes network-dependent continuation from the modeled state.",
            disruption: "High"
        }
    ],
    AUTHENTICATION_FAILURE: [
        {
            action: "DISABLE_ACCOUNT",
            name: "Disable account",
            description: "Temporarily disable the affected account after repeated authentication failures.",
            expectedEffect: "Removes the account-related authentication condition from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "BLOCK_SOURCE_IP",
            name: "Block source IP",
            description: "Block the source associated with the authentication activity.",
            expectedEffect: "Removes source-dependent authentication activity from the modeled state.",
            disruption: "Low"
        }
    ],
    BRUTE_FORCE: [
        {
            action: "DISABLE_ACCOUNT",
            name: "Disable account",
            description: "Disable the targeted account to stop repeated authentication attempts.",
            expectedEffect: "Removes the account-related brute-force condition from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "BLOCK_SOURCE_IP",
            name: "Block source IP",
            description: "Block the observed brute-force source.",
            expectedEffect: "Removes source-dependent brute-force activity from the modeled state.",
            disruption: "Low"
        }
    ],
    NETWORK_ANOMALY: [
        {
            action: "BLOCK_SOURCE_IP",
            name: "Block source IP",
            description: "Block the source associated with the network anomaly.",
            expectedEffect: "Removes source-dependent network activity from the modeled state.",
            disruption: "Low"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Restrict the endpoint from communicating while the anomaly is contained.",
            expectedEffect: "Removes network-dependent continuation from the modeled state.",
            disruption: "High"
        }
    ],
    LATERAL_MOVEMENT: [
        {
            action: "BLOCK_SOURCE_IP",
            name: "Block source IP",
            description: "Block the source associated with the lateral movement activity.",
            expectedEffect: "Removes source-dependent lateral movement from the modeled state.",
            disruption: "Low"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint to prevent further lateral movement.",
            expectedEffect: "Removes network-dependent lateral movement from the modeled state.",
            disruption: "High"
        }
    ],
    DATA_EXFILTRATION: [
        {
            action: "BLOCK_SOURCE_IP",
            name: "Block source IP",
            description: "Block the identified source of the transfer activity.",
            expectedEffect: "Removes source-dependent transfer activity from the modeled state.",
            disruption: "Low"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint to interrupt outbound transfer activity.",
            expectedEffect: "Removes network-dependent exfiltration from the modeled state.",
            disruption: "High"
        }
    ],
    PROCESS_ANOMALY: [
        {
            action: "TERMINATE_PROCESS",
            name: "Terminate related process",
            description: "Stop the process associated with the observed anomaly.",
            expectedEffect: "Removes process-dependent activity from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint while the process activity is investigated.",
            expectedEffect: "Removes network-dependent continuation from the modeled state.",
            disruption: "High"
        }
    ],
    MALWARE: [
        {
            action: "TERMINATE_PROCESS",
            name: "Terminate related process",
            description: "Stop the process associated with the malware activity.",
            expectedEffect: "Removes process-dependent malware activity from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint to prevent further malware communication.",
            expectedEffect: "Removes network-dependent malware activity from the modeled state.",
            disruption: "High"
        }
    ],
    TROJAN: [
        {
            action: "TERMINATE_PROCESS",
            name: "Terminate related process",
            description: "Stop the process associated with the trojan activity.",
            expectedEffect: "Removes process-dependent trojan activity from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint to prevent further trojan communication.",
            expectedEffect: "Removes network-dependent trojan activity from the modeled state.",
            disruption: "High"
        }
    ],
    RANSOMWARE: [
        {
            action: "TERMINATE_PROCESS",
            name: "Terminate related process",
            description: "Stop the process associated with the ransomware activity.",
            expectedEffect: "Removes process-dependent ransomware activity from the modeled state.",
            disruption: "Medium"
        },
        {
            action: "ISOLATE_ENDPOINT",
            name: "Isolate endpoint",
            description: "Contain the endpoint to interrupt ransomware spread.",
            expectedEffect: "Removes network-dependent ransomware activity from the modeled state.",
            disruption: "High"
        }
    ]
};

const aliases = {
    ACCOUNT_MODIFICATION: "USER_ACCOUNT_MODIFICATION",
    USER_ACCOUNT: "USER_ACCOUNT_MODIFICATION",
    PRIVILEGED: "PRIVILEGED_ACTIVITY",
    PRIVILEGE: "PRIVILEGE_ESCALATION"
};

function normalize(value) {
    const key = String(value || "").trim().toUpperCase().replace(/[-\s]+/g, "_").replace(/[^A-Z0-9_]/g, "");
    return aliases[key] || key;
}

function getResponseModels(attackType) {
    return RESPONSE_MODELS[normalize(attackType)] || [];
}

function buildResponseScenarios(attackType, evidence = []) {
    return getResponseModels(attackType).map(model => ({
        ...model,
        status: evidence.length ? "SUPPORTED" : "SUPPORTED",
        reason: `Modeled for the observed ${normalize(attackType).replace(/_/g, " ").toLowerCase()} stage.`,
        evidence
    }));
}

function applyModel(findings, attackType, action) {
    const selected = normalize(attackType);
    const removeTypes = new Set([selected]);

    if (action === "DISABLE_ACCOUNT" || action === "REVERT_ACCOUNT_CHANGES") {
        removeTypes.add("USER_ACCOUNT_MODIFICATION");
    }
    if (action === "REVOKE_PRIVILEGES") {
        removeTypes.add("PRIVILEGED_ACTIVITY");
        removeTypes.add("PRIVILEGE_ESCALATION");
    }
    if (action === "TERMINATE_PROCESS") removeTypes.add("PROCESS_ANOMALY");
    if (action === "BLOCK_SOURCE_IP") removeTypes.add("NETWORK_ANOMALY");
    if (action === "ISOLATE_ENDPOINT") {
        removeTypes.add("NETWORK_ANOMALY");
        removeTypes.add("LATERAL_MOVEMENT");
        removeTypes.add("DATA_EXFILTRATION");
    }

    return findings
        .filter(f => !removeTypes.has(normalize(f.type)))
        .map(f => ({ ...f }));
}

function buildSimulatedProgression(progression, attackType) {
    const selected = normalize(attackType);
    return (Array.isArray(progression) ? progression : []).filter(stage => normalize(stage) !== selected);
}

function buildPaths(progression) {
    if (!progression.length) return [];
    return [{
        id: "Path-1",
        name: "Modeled attack path",
        stages: progression.map((label, index) => ({ order: index + 1, label, type: normalize(label) })),
        stageCount: progression.length
    }];
}

async function simulateModeledResponse({ context, attackType, action }) {
    const scenarios = buildResponseScenarios(attackType, context?.evidence || []);
    const scenario = scenarios.find(item => item.action === action);
    if (!scenario) {
        const error = new Error("Selected response is not modeled for this attack stage.");
        error.statusCode = 400;
        throw error;
    }

    const actualFindings = Array.isArray(context?.actual?.findings) ? context.actual.findings : [];
    const simulatedFindings = applyModel(actualFindings, attackType, action);
    const simulatedRisk = calculateRiskScore(simulatedFindings);
    const actualProgression = Array.isArray(context?.actual?.attackProgression) ? context.actual.attackProgression : [];
    const simulatedProgression = buildSimulatedProgression(actualProgression, attackType);
    const simulatedPaths = buildPaths(simulatedProgression);
    const riskReduction = Number(context.actual.riskScore || 0) - Number(simulatedRisk.score || 0);

    const securityState = score => score >= 60 ? "COMPROMISED" : score >= 25 ? "SUSPICIOUS" : "NORMAL";

    return {
        action,
        actionName: scenario.name,
        status: "SIMULATION ONLY",
        actual: {
            riskScore: context.actual.riskScore,
            riskLevel: context.actual.riskLevel,
            securityState: context.actual.securityState,
            attackPaths: context.actual.attackPaths,
            findings: actualFindings,
            attackProgression: actualProgression,
            paths: context.actual.paths
        },
        simulation: {
            riskScore: simulatedRisk.score,
            riskLevel: simulatedRisk.level,
            securityState: securityState(simulatedRisk.score),
            attackPaths: simulatedPaths.length,
            findings: simulatedFindings,
            attackProgression: simulatedProgression,
            paths: simulatedPaths,
            riskBreakdown: simulatedRisk.breakdown
        },
        impact: riskReduction > 0 ? `Risk score decreases by ${riskReduction}.` : "No modeled risk change was produced by this response.",
        riskReduction,
        pathReduction: Number(context.actual.attackPaths || 0) - simulatedPaths.length,
        responseScenario: scenario
    };
}

module.exports = { buildResponseScenarios, simulateModeledResponse, getResponseModels };