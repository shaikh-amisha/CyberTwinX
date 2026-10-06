const { calculateRiskScore } = require("./riskScoreEngine");

function response(action, name, description, expectedEffect, disruption) {
    return { action, name, description, expectedEffect, disruption };
}

/*
 * Every attack/finding type produced by CyberTwinX detection is mapped
 * to responses that specifically address that attack stage.
 */
const RESPONSE_MODELS = {
    AUTHENTICATION_FAILURE: [
        response("DISABLE_ACCOUNT", "Disable affected account", "Model disabling the account targeted by repeated authentication failures.", "Stops further authentication attempts through the affected identity.", "Medium"),
        response("BLOCK_SOURCE_IP", "Block authentication source", "Model blocking the source associated with the failed authentication activity.", "Stops further source-dependent authentication activity.", "Low")
    ],
    BRUTE_FORCE: [
        response("DISABLE_ACCOUNT", "Disable targeted account", "Model disabling the account receiving the brute-force attempts.", "Stops the attacker from continuing against that identity.", "Medium"),
        response("BLOCK_SOURCE_IP", "Block brute-force source", "Model blocking the source generating the repeated login attempts.", "Stops further source-dependent brute-force activity.", "Low")
    ],
    PASSWORD_SPRAYING: [
        response("DISABLE_ACCOUNT", "Disable affected accounts", "Model disabling accounts targeted by the password-spraying activity.", "Stops further authentication through the affected identities.", "Medium"),
        response("BLOCK_SOURCE_IP", "Block spraying source", "Model blocking the source responsible for the distributed authentication attempts.", "Stops further source-dependent password spraying.", "Low")
    ],
    ACCOUNT_COMPROMISE: [
        response("DISABLE_ACCOUNT", "Disable compromised account", "Model disabling the identity identified as compromised.", "Stops further account-based activity from the compromised identity.", "Medium"),
        response("REVOKE_SESSIONS", "Revoke active sessions", "Model invalidating active sessions associated with the compromised account.", "Removes active authenticated sessions from the modeled compromise path.", "Low")
    ],
    CREDENTIAL_COMPROMISE: [
        response("DISABLE_ACCOUNT", "Disable compromised account", "Model disabling the account associated with the compromised credentials.", "Stops further use of the affected identity.", "Medium"),
        response("REVOKE_SESSIONS", "Revoke active sessions", "Model invalidating sessions created with the compromised credentials.", "Removes active authenticated sessions from the modeled credential-compromise path.", "Low")
    ],
    USER_ACCOUNT_MODIFICATION: [
        response("REVERT_ACCOUNT_CHANGES", "Revert account changes", "Model rolling back the account changes observed at this stage.", "Removes the modeled unauthorized account modification.", "Medium"),
        response("DISABLE_ACCOUNT", "Disable modified account", "Model disabling the affected account while the modification is investigated.", "Stops further activity through the modified identity.", "Medium")
    ],
    USER_ACCOUNT_MANIPULATION: [
        response("REVERT_ACCOUNT_CHANGES", "Revert account changes", "Model reversing the observed user or group manipulation.", "Removes the modeled account or group modification.", "Medium"),
        response("DISABLE_ACCOUNT", "Disable affected account", "Model disabling the account involved in the manipulation.", "Stops further activity through the affected identity.", "Medium")
    ],
    PRIVILEGED_ACTIVITY: [
        response("REVOKE_PRIVILEGES", "Revoke elevated privileges", "Model removing elevated privileges associated with the observed activity.", "Removes the privileged-activity condition from the modeled state.", "Medium"),
        response("TERMINATE_PROCESS", "Terminate related process", "Model stopping the process associated with the privileged activity.", "Removes process-dependent privileged activity.", "Medium")
    ],
    PRIVILEGE_ESCALATION: [
        response("REVOKE_PRIVILEGES", "Revoke elevated privileges", "Model removing privileges gained during the escalation stage.", "Removes the modeled privilege-escalation condition.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate endpoint", "Model containing the endpoint after privilege escalation is detected.", "Prevents network-dependent continuation of the escalation path.", "High")
    ],
    PROCESS_ANOMALY: [
        response("TERMINATE_PROCESS", "Terminate anomalous process", "Model stopping the process responsible for the abnormal process activity.", "Removes the process anomaly from the modeled state.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint while the process anomaly is investigated.", "Prevents network-dependent continuation.", "High")
    ],
    SUSPICIOUS_PROCESS_EXECUTION: [
        response("TERMINATE_PROCESS", "Terminate suspicious process", "Model stopping the suspicious executable or interpreter.", "Removes the suspicious execution condition from the modeled state.", "Medium"),
        response("QUARANTINE_EXECUTABLE", "Quarantine executable", "Model quarantining the executable associated with the suspicious process.", "Prevents the modeled executable from continuing to execute.", "Medium")
    ],
    LIVING_OFF_THE_LAND: [
        response("TERMINATE_PROCESS", "Terminate LOL process", "Model stopping the living-off-the-land process chain.", "Removes the modeled LOL execution activity.", "Medium"),
        response("RESTRICT_EXECUTION", "Restrict execution", "Model restricting the execution technique used by the observed LOL activity.", "Reduces continuation of the modeled execution path.", "Medium")
    ],
    RANSOMWARE_LIKE_ACTIVITY: [
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model immediately containing the endpoint during ransomware-like file activity.", "Stops network-dependent continuation and spread.", "High"),
        response("TERMINATE_PROCESS", "Terminate ransomware process", "Model stopping the process associated with the file modification activity.", "Removes process-dependent ransomware activity.", "High")
    ],
    NETWORK_SCANNING: [
        response("BLOCK_SOURCE_IP", "Block scanning source", "Model blocking the source generating the reconnaissance activity.", "Stops further source-dependent scanning.", "Low"),
        response("ISOLATE_ENDPOINT", "Isolate endpoint", "Model containing the endpoint while scanning activity is investigated.", "Prevents further network-dependent continuation.", "High")
    ],
    NETWORK_ANOMALY: [
        response("BLOCK_SOURCE_IP", "Block network source", "Model blocking the source associated with the network anomaly.", "Removes source-dependent network activity.", "Low"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint during the network anomaly.", "Removes network-dependent continuation.", "High")
    ],
    SUSPICIOUS_C2_COMMUNICATION: [
        response("BLOCK_DESTINATION", "Block C2 destination", "Model blocking the destination associated with suspicious command-and-control communication.", "Stops the modeled C2 communication channel.", "Low"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint to interrupt C2 communication.", "Stops network-dependent command-and-control activity.", "High")
    ],
    DATA_EXFILTRATION_ANOMALY: [
        response("RESTRICT_OUTBOUND", "Restrict outbound traffic", "Model restricting outbound communication responsible for the anomalous transfer.", "Stops the modeled outbound transfer path.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint during the suspected exfiltration.", "Interrupts outbound transfer activity.", "High")
    ],
    DATA_EXFILTRATION: [
        response("RESTRICT_OUTBOUND", "Restrict outbound traffic", "Model restricting outbound communication for the transfer activity.", "Stops the modeled exfiltration path.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint during data exfiltration.", "Interrupts outbound transfer activity.", "High")
    ],
    LATERAL_MOVEMENT: [
        response("BLOCK_SOURCE_IP", "Block lateral-movement source", "Model blocking the source associated with the lateral movement.", "Stops source-dependent lateral movement.", "Low"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint to stop lateral movement.", "Prevents further network-dependent movement.", "High")
    ],
    SUSPICIOUS_SERVICE_ACTIVITY: [
        response("STOP_SERVICE", "Stop suspicious service", "Model stopping the service involved in the suspicious lifecycle or persistence activity.", "Removes the modeled service activity.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint while the suspicious service is investigated.", "Prevents network-dependent continuation.", "High")
    ],
    ABNORMAL_FILE_SYSTEM_ACTIVITY: [
        response("QUARANTINE_FILES", "Quarantine affected files", "Model quarantining files involved in the abnormal file activity.", "Removes the affected file activity from the modeled state.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint during abnormal file activity.", "Prevents further network-dependent activity.", "High")
    ],
    MALWARE: [
        response("TERMINATE_PROCESS", "Terminate malware process", "Model stopping the process associated with the malware activity.", "Removes process-dependent malware activity.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate infected endpoint", "Model containing the endpoint to stop malware communication.", "Interrupts network-dependent malware activity.", "High")
    ],
    TROJAN: [
        response("TERMINATE_PROCESS", "Terminate trojan process", "Model stopping the process associated with the trojan activity.", "Removes process-dependent trojan activity.", "Medium"),
        response("ISOLATE_ENDPOINT", "Isolate infected endpoint", "Model containing the endpoint to prevent further trojan communication.", "Interrupts network-dependent trojan activity.", "High")
    ],
    RANSOMWARE: [
        response("TERMINATE_PROCESS", "Terminate ransomware process", "Model stopping the process associated with ransomware activity.", "Removes process-dependent ransomware activity.", "High"),
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint to interrupt ransomware spread.", "Stops network-dependent ransomware continuation.", "High")
    ],
    LOG_ANOMALY: [
        response("ISOLATE_ENDPOINT", "Isolate affected endpoint", "Model containing the endpoint while the abnormal log activity is investigated.", "Prevents network-dependent continuation while preserving the dry-run boundary.", "High"),
        response("RESTRICT_EXECUTION", "Restrict suspicious execution", "Model restricting execution associated with the abnormal log activity.", "Reduces continuation of the modeled activity.", "Medium")
    ]
};

const aliases = {
    ACCOUNT_MODIFICATION: "USER_ACCOUNT_MODIFICATION",
    USER_ACCOUNT: "USER_ACCOUNT_MODIFICATION",
    ACCOUNT_COMPROMISED: "ACCOUNT_COMPROMISE",
    COMPROMISED_ACCOUNT: "ACCOUNT_COMPROMISE",
    ACCOUNT_TAKEOVER: "ACCOUNT_COMPROMISE",
    CREDENTIAL_COMPROMISED: "CREDENTIAL_COMPROMISE",
    COMPROMISED_CREDENTIALS: "CREDENTIAL_COMPROMISE",
    PRIVILEGED: "PRIVILEGED_ACTIVITY",
    PRIVILEGE: "PRIVILEGE_ESCALATION",
    SUSPICIOUS_PROCESS: "SUSPICIOUS_PROCESS_EXECUTION",
    RANSOMWARE_LIKE: "RANSOMWARE_LIKE_ACTIVITY",
    C2_LIKE_COMMUNICATION: "SUSPICIOUS_C2_COMMUNICATION",
    DATA_EXFILTRATION: "DATA_EXFILTRATION_ANOMALY",
    NETWORK_SCAN: "NETWORK_SCANNING",
    SERVICE_ACTIVITY: "SUSPICIOUS_SERVICE_ACTIVITY",
    FILE_SYSTEM_ACTIVITY: "ABNORMAL_FILE_SYSTEM_ACTIVITY"
};

function normalize(value) {
    const key = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[-\s]+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
    return aliases[key] || key;
}

function getResponseModels(attackType) {
    return RESPONSE_MODELS[normalize(attackType)] || [];
}

function buildResponseScenarios(attackType, evidence = []) {
    return getResponseModels(attackType).map(model => ({
        ...model,
        status: "SUPPORTED",
        reason: `Modeled specifically for the observed ${normalize(attackType).replace(/_/g, " ").toLowerCase()} stage.`,
        evidence
    }));
}

function applyModel(findings, attackType, action) {
    const selected = normalize(attackType);
    const removeTypes = new Set([selected]);

    const actionTargets = {
        DISABLE_ACCOUNT: ["USER_ACCOUNT_MODIFICATION", "USER_ACCOUNT_MANIPULATION", "ACCOUNT_COMPROMISE", "CREDENTIAL_COMPROMISE", "AUTHENTICATION_FAILURE", "BRUTE_FORCE", "PASSWORD_SPRAYING"],
        REVOKE_SESSIONS: ["ACCOUNT_COMPROMISE", "CREDENTIAL_COMPROMISE"],
        REVERT_ACCOUNT_CHANGES: ["USER_ACCOUNT_MODIFICATION", "USER_ACCOUNT_MANIPULATION"],
        REVOKE_PRIVILEGES: ["PRIVILEGED_ACTIVITY", "PRIVILEGE_ESCALATION"],
        TERMINATE_PROCESS: ["PROCESS_ANOMALY", "SUSPICIOUS_PROCESS_EXECUTION", "LIVING_OFF_THE_LAND", "MALWARE", "TROJAN", "RANSOMWARE", "RANSOMWARE_LIKE_ACTIVITY", "PRIVILEGED_ACTIVITY"],
        QUARANTINE_EXECUTABLE: ["SUSPICIOUS_PROCESS_EXECUTION", "LIVING_OFF_THE_LAND"],
        RESTRICT_EXECUTION: ["LIVING_OFF_THE_LAND", "SUSPICIOUS_PROCESS_EXECUTION", "LOG_ANOMALY"],
        BLOCK_SOURCE_IP: ["AUTHENTICATION_FAILURE", "BRUTE_FORCE", "PASSWORD_SPRAYING", "NETWORK_ANOMALY", "NETWORK_SCANNING", "LATERAL_MOVEMENT"],
        BLOCK_DESTINATION: ["SUSPICIOUS_C2_COMMUNICATION", "DATA_EXFILTRATION_ANOMALY"],
        RESTRICT_OUTBOUND: ["SUSPICIOUS_C2_COMMUNICATION", "DATA_EXFILTRATION_ANOMALY", "DATA_EXFILTRATION"],
        ISOLATE_ENDPOINT: ["NETWORK_ANOMALY", "NETWORK_SCANNING", "SUSPICIOUS_C2_COMMUNICATION", "DATA_EXFILTRATION_ANOMALY", "DATA_EXFILTRATION", "LATERAL_MOVEMENT", "RANSOMWARE_LIKE_ACTIVITY", "RANSOMWARE", "MALWARE", "TROJAN", "PROCESS_ANOMALY", "PRIVILEGE_ESCALATION", "SUSPICIOUS_PROCESS_EXECUTION", "SUSPICIOUS_SERVICE_ACTIVITY", "ABNORMAL_FILE_SYSTEM_ACTIVITY", "LOG_ANOMALY"],
        STOP_SERVICE: ["SUSPICIOUS_SERVICE_ACTIVITY"],
        QUARANTINE_FILES: ["RANSOMWARE_LIKE_ACTIVITY", "ABNORMAL_FILE_SYSTEM_ACTIVITY"]
    };

    for (const type of actionTargets[action] || []) removeTypes.add(type);

    return findings.filter(f => !removeTypes.has(normalize(f.type))).map(f => ({ ...f }));
}

function buildSimulatedProgression(progression, attackType) {
    const selected = normalize(attackType);
    return (Array.isArray(progression) ? progression : [])
        .filter(stage => normalize(stage) !== selected);
}

function buildPaths(progression) {
    if (!progression.length) return [];
    return [{
        id: "Path-1",
        name: "Modeled attack path",
        stages: progression.map((label, index) => ({
            order: index + 1,
            label,
            type: normalize(label)
        })),
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

    const actualFindings = Array.isArray(context?.actual?.findings)
        ? context.actual.findings
        : [];

    const simulatedFindings = applyModel(actualFindings, attackType, action);
    const simulatedRisk = calculateRiskScore(simulatedFindings);
    const actualProgression = Array.isArray(context?.actual?.attackProgression)
        ? context.actual.attackProgression
        : [];
    const simulatedProgression = buildSimulatedProgression(actualProgression, attackType);
    const simulatedPaths = buildPaths(simulatedProgression);
    const riskReduction = Number(context?.actual?.riskScore || 0) - Number(simulatedRisk.score || 0);

    const securityState = score =>
        score >= 60 ? "COMPROMISED" : score >= 25 ? "SUSPICIOUS" : "NORMAL";

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
        impact: riskReduction > 0
            ? `Risk score decreases by ${riskReduction}.`
            : "No modeled risk change was produced by this response.",
        riskReduction,
        pathReduction: Number(context?.actual?.attackPaths || 0) - simulatedPaths.length,
        responseScenario: scenario
    };
}

module.exports = {
    buildResponseScenarios,
    simulateModeledResponse,
    getResponseModels
};