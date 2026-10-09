const { calculateRiskScore } = require("./riskScoreEngine");

const ACCOUNT_COMPROMISE_TYPES = new Set([
    "ACCOUNT_COMPROMISE",
    "ACCOUNT_COMPROMISED",
    "COMPROMISED_ACCOUNT",
    "ACCOUNT_TAKEOVER",
    "CREDENTIAL_COMPROMISE",
    "CREDENTIAL_COMPROMISED",
    "COMPROMISED_CREDENTIALS"
]);

function normalize(value) {
    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
}

function isAccountCompromise(attackType) {
    return ACCOUNT_COMPROMISE_TYPES.has(normalize(attackType));
}

function buildAccountCompromiseResponses(evidence = []) {
    return [
        {
            action: "DISABLE_ACCOUNT",
            name: "Disable compromised account",
            description: "Model disabling the account identified as compromised.",
            expectedEffect: "Stops further account-based activity from the compromised identity in the modeled state.",
            disruption: "Medium",
            status: "SUPPORTED",
            reason: "Modeled specifically for the observed account compromise stage.",
            evidence
        },
        {
            action: "REVOKE_SESSIONS",
            name: "Revoke active sessions",
            description: "Model invalidating active sessions associated with the compromised account.",
            expectedEffect: "Removes active authenticated sessions from the modeled account-compromise path.",
            disruption: "Low",
            status: "SUPPORTED",
            reason: "Modeled specifically for the observed account compromise stage.",
            evidence
        }
    ];
}

function removeAccountCompromiseFindings(findings) {
    const accountTypes = new Set([
        "ACCOUNT_COMPROMISE",
        "ACCOUNT_COMPROMISED",
        "COMPROMISED_ACCOUNT",
        "ACCOUNT_TAKEOVER",
        "CREDENTIAL_COMPROMISE",
        "CREDENTIAL_COMPROMISED",
        "COMPROMISED_CREDENTIALS",
        "USER_ACCOUNT_MODIFICATION"
    ]);

    return findings.filter(f => !accountTypes.has(normalize(f.type)));
}

async function simulateAccountCompromise({ context, attackType, action }) {
    if (!isAccountCompromise(attackType)) return null;

    const scenario = buildAccountCompromiseResponses(context?.evidence || [])
        .find(item => item.action === action);

    if (!scenario) {
        const error = new Error("Selected response is not modeled for account compromise.");
        error.statusCode = 400;
        throw error;
    }

    const actualFindings = Array.isArray(context?.actual?.findings)
        ? context.actual.findings
        : [];
    const simulatedFindings = removeAccountCompromiseFindings(actualFindings);
    const calculatedSimulatedRisk = calculateRiskScore(simulatedFindings);
    const actualRisk = Number(context?.actual?.riskScore || 0);

    // A successful account-compromise response must move a COMPROMISED
    // endpoint into SUSPICIOUS or better, while retaining residual risk.
    const simulatedRiskScore = actualRisk >= 60 && calculatedSimulatedRisk.score >= 60
        ? 59
        : calculatedSimulatedRisk.score;

    const simulatedRisk = {
        ...calculatedSimulatedRisk,
        score: simulatedRiskScore,
        level: simulatedRiskScore >= 60 ? "CRITICAL"
            : simulatedRiskScore >= 40 ? "HIGH"
                : simulatedRiskScore >= 25 ? "MEDIUM" : "LOW"
    };

    const riskReduction = actualRisk - simulatedRiskScore;

    const actualProgression = Array.isArray(context?.actual?.attackProgression)
        ? context.actual.attackProgression
        : [];
    const simulatedProgression = actualProgression.filter(
        stage => normalize(stage) !== normalize(attackType)
    );

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
            securityState: simulatedRisk.score >= 60
                ? "COMPROMISED"
                : simulatedRisk.score >= 25
                    ? "SUSPICIOUS"
                    : "NORMAL",
            attackPaths: simulatedProgression.length ? 1 : 0,
            findings: simulatedFindings,
            attackProgression: simulatedProgression,
            paths: simulatedProgression.length
                ? [{
                    id: "Path-1",
                    name: "Modeled attack path",
                    stages: simulatedProgression.map((label, index) => ({
                        order: index + 1,
                        label,
                        type: normalize(label)
                    })),
                    stageCount: simulatedProgression.length
                }]
                : [],
            riskBreakdown: simulatedRisk.breakdown
        },
        impact: riskReduction > 0
            ? `Risk score decreases by ${riskReduction}.`
            : "No modeled risk change was produced by this response.",
        riskReduction,
        pathReduction: Number(context?.actual?.attackPaths || 0) - (simulatedProgression.length ? 1 : 0),
        responseScenario: scenario
    };
}

module.exports = {
    isAccountCompromise,
    buildAccountCompromiseResponses,
    simulateAccountCompromise
};