/* Modeled What-If responses used only when the backend does not return enough scenarios. */
window.CYBERTWIN_WHAT_IF_FALLBACKS = {
    ACCOUNT_MODIFICATION: [
        { action: "DISABLE_ACCOUNT", name: "Disable account", expectedEffect: "Stops further use of the affected account.", impact: "Medium", riskDelta: 23, pathDelta: 1, state: "Contained", whatRemains: "Existing processes or activity already running on the endpoint can remain until investigated." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Cuts the endpoint off from network-dependent attack activity.", impact: "High", riskDelta: 31, pathDelta: 1, state: "Contained", whatRemains: "Local malicious processes may remain until they are removed." }
    ],
    USER_ACCOUNT_MODIFICATION: [
        { action: "DISABLE_ACCOUNT", name: "Disable account", expectedEffect: "Stops further use of the affected account.", impact: "Medium", riskDelta: 23, pathDelta: 1, state: "Contained", whatRemains: "Existing processes or activity already running on the endpoint can remain until investigated." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Cuts the endpoint off from network-dependent attack activity.", impact: "High", riskDelta: 31, pathDelta: 1, state: "Contained", whatRemains: "Local malicious processes may remain until they are removed." }
    ],
    PRIVILEGED_ACTIVITY: [
        { action: "DISABLE_ACCOUNT", name: "Disable account", expectedEffect: "Removes the affected account's ability to continue privileged activity.", impact: "Medium", riskDelta: 24, pathDelta: 1, state: "Contained", whatRemains: "Other privileged processes already running may remain." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Prevents the privileged activity from reaching other systems.", impact: "High", riskDelta: 30, pathDelta: 1, state: "Contained", whatRemains: "Local activity remains available for forensic review." }
    ],
    PRIVILEGE_ESCALATION: [
        { action: "DISABLE_ACCOUNT", name: "Disable account", expectedEffect: "Blocks continued use of the account used for escalation.", impact: "Medium", riskDelta: 25, pathDelta: 1, state: "Contained", whatRemains: "A compromised process or alternate account can still require investigation." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Prevents the escalated process from continuing network-dependent activity.", impact: "High", riskDelta: 34, pathDelta: 1, state: "Contained", whatRemains: "Local privilege remains a forensic concern until the process is removed." },
        { action: "TERMINATE_PROCESS", name: "Terminate process", expectedEffect: "Stops the process associated with the escalation activity.", impact: "Medium", riskDelta: 29, pathDelta: 1, state: "Contained", whatRemains: "Persistence mechanisms outside the terminated process may remain." }
    ],
    ACCOUNT_MANIPULATION: [
        { action: "DISABLE_ACCOUNT", name: "Disable account", expectedEffect: "Stops continued manipulation through the affected account.", impact: "Medium", riskDelta: 22, pathDelta: 1, state: "Contained", whatRemains: "Other compromised accounts can still be used." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Stops network-dependent account manipulation from spreading.", impact: "High", riskDelta: 29, pathDelta: 1, state: "Contained", whatRemains: "Local account changes remain for investigation." }
    ],
    RANSOMWARE: [
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Stops network-dependent ransomware activity and lateral spread.", impact: "High", riskDelta: 36, pathDelta: 1, state: "Contained", whatRemains: "Files already encrypted or local ransomware processes can remain." },
        { action: "TERMINATE_PROCESS", name: "Terminate process", expectedEffect: "Stops the ransomware process associated with the observed activity.", impact: "Medium", riskDelta: 32, pathDelta: 1, state: "Suspicious", whatRemains: "Persistence and damage already caused by the ransomware can remain." }
    ],
    MALWARE: [
        { action: "TERMINATE_PROCESS", name: "Terminate process", expectedEffect: "Stops the malicious process from continuing execution.", impact: "Medium", riskDelta: 28, pathDelta: 1, state: "Contained", whatRemains: "Persistence mechanisms may remain." },
        { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Prevents the malware from communicating with other systems.", impact: "High", riskDelta: 34, pathDelta: 1, state: "Contained", whatRemains: "The local malicious process can remain until removed." }
    ]
};

window.CYBERTWIN_WHAT_IF_FALLBACK_DEFAULT = [
    { action: "ISOLATE_ENDPOINT", name: "Isolate endpoint", expectedEffect: "Restricts network-dependent attack activity from continuing.", impact: "High", riskDelta: 28, pathDelta: 1, state: "Contained", whatRemains: "Local malicious activity may remain." },
    { action: "TERMINATE_PROCESS", name: "Terminate process", expectedEffect: "Stops the process associated with the observed activity.", impact: "Medium", riskDelta: 21, pathDelta: 1, state: "Suspicious", whatRemains: "Other persistence or attacker activity can remain." }
];
