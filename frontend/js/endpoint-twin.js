/* =========================================================
   CYBERTWIN
   ENDPOINT TWIN — DYNAMIC FRONTEND
   ========================================================= */

const API_URL =
    "http://localhost:5000/api/endpoint-twin";

const REFRESH_INTERVAL = 5000;

const HISTORY_STORAGE_KEY =
    "cybertwin.endpointTwin.stateHistory";


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const endpointTwinState = {

    endpoint: {

        endpointId: "Unknown",

        hostname: "Unknown",

        operatingSystem: "Unknown",

        ipAddress: "Unknown",

        telemetryAgent: "UNKNOWN"

    },


    incident: {

        id: "NO ACTIVE INCIDENT"

    },


    security: {

        state: "UNKNOWN",

        riskScore: 0,

        riskLevel: "LOW",

        stateConfidence: 0,

        riskBreakdown: []

    },


    evidence: {

        supporting: 0,

        missing: 0

    },


    telemetry: {

        authenticationEvents: 0,

        processCount: 0,

        networkConnections: 0,

        fileEvents: 0,

        logCount: 0

    },


    system: {

        telemetryStatus: "UNKNOWN",

        systemStatus: "UNKNOWN"

    },


    lastUpdated: null

};

/* =========================================================
   ALERT RUNTIME STATE
   ========================================================= */

const endpointAlertState = {
    initialized: false,
    previous: null,
    lastHistoryId: null
};


/* =========================================================
   DOM REFERENCES
   ========================================================= */

const elements = {


    /* TOPBAR */

    topbarEndpoint:
        document.getElementById(
            "topbarEndpoint"
        ),

    topbarIncident:
        document.getElementById(
            "topbarIncident"
        ),

    topbarState:
        document.getElementById(
            "topbarState"
        ),

    topbarRisk:
        document.getElementById(
            "topbarRisk"
        ),

    topbarSystemStatus:
        document.getElementById(
            "topbarSystemStatus"
        ),


    /* SIDEBAR */

    sidebarSystemStatus:
        document.getElementById(
            "sidebarSystemStatus"
        ),


    /* PAGE STATUS */

    telemetryStatus:
        document.getElementById(
            "telemetryStatus"
        ),

    lastUpdated:
        document.getElementById(
            "lastUpdated"
        ),


    /* FEATURE 01 */

    hostname:
        document.getElementById(
            "hostname"
        ),

    hostnameStatus:
        document.getElementById(
            "hostnameStatus"
        ),

    operatingSystem:
        document.getElementById(
            "operatingSystem"
        ),

    ipAddress:
        document.getElementById(
            "ipAddress"
        ),

    telemetryAgent:
        document.getElementById(
            "telemetryAgent"
        ),


    /* FEATURE 02 */

    securityState:
        document.getElementById(
            "securityState"
        ),

    stateDescription:
        document.getElementById(
            "stateDescription"
        ),

    riskLevel:
        document.getElementById(
            "riskLevel"
        ),

    riskScore:
        document.getElementById(
            "riskScore"
        ),

    riskBar:
        document.getElementById(
            "riskBar"
        ),

    riskGauge:
        document.getElementById(
            "riskGauge"
        ),

    riskGaugeValue:
        document.getElementById(
            "riskGaugeValue"
        ),

    stateConfidence:
        document.getElementById(
            "stateConfidence"
        ),

    confidenceBar:
        document.getElementById(
            "confidenceBar"
        ),

    supportingEvidence:
        document.getElementById(
            "supportingEvidence"
        ),

    missingEvidence:
        document.getElementById(
            "missingEvidence"
        ),


    /* FEATURE 03 */

    authenticationEvents:
        document.getElementById(
            "authenticationEvents"
        ),

    authenticationStatus:
        document.getElementById(
            "authenticationStatus"
        ),

    authenticationBar:
        document.getElementById(
            "authenticationBar"
        ),

    processCount:
        document.getElementById(
            "processCount"
        ),

    processBar:
        document.getElementById(
            "processBar"
        ),

    networkConnections:
        document.getElementById(
            "networkConnections"
        ),

    networkStatus:
        document.getElementById(
            "networkStatus"
        ),

    networkBar:
        document.getElementById(
            "networkBar"
        ),

    logEvents:
        document.getElementById(
            "logEvents"
        ),

    logBar:
        document.getElementById(
            "logBar"
        ),


    /* FEATURE 04 */

    securityActivity:
        document.getElementById(
            "securityActivity"
        ),

    securityActivityCount:
        document.getElementById(
            "securityActivityCount"
        ),

    securityActivityRisk:
        document.getElementById(
            "securityActivityRisk"
        ),


    /* FEATURE 05 */

    stateHistory:
        document.getElementById(
            "stateHistory"
        ),

    historyCurrentState:
        document.getElementById(
            "historyCurrentState"
        ),

    historyCurrentRisk:
        document.getElementById(
            "historyCurrentRisk"
        ),

    historyCurrentConfidence:
        document.getElementById(
            "historyCurrentConfidence"
        ),

    historyStateCount:
        document.getElementById(
            "historyStateCount"
        ),


    /* ALERTS */

    attentionAlert:
        document.getElementById("attentionAlert"),

    attentionAlertSeverity:
        document.getElementById("attentionAlertSeverity"),

    attentionAlertTime:
        document.getElementById("attentionAlertTime"),

    attentionAlertTitle:
        document.getElementById("attentionAlertTitle"),

    attentionAlertMessage:
        document.getElementById("attentionAlertMessage"),

    attentionAlertMeta:
        document.getElementById("attentionAlertMeta"),

    attentionAlertAction:
        document.getElementById("attentionAlertAction"),

    attentionAlertDismiss:
        document.getElementById("attentionAlertDismiss"),

    stateChangeAlert:
        document.getElementById("stateChangeAlert"),

    stateChangeAlertTime:
        document.getElementById("stateChangeAlertTime"),

    stateChangeAlertTitle:
        document.getElementById("stateChangeAlertTitle"),

    stateChangeAlertMessage:
        document.getElementById("stateChangeAlertMessage"),

    stateChangeAlertDetails:
        document.getElementById("stateChangeAlertDetails"),

    stateChangeAlertDismiss:
        document.getElementById("stateChangeAlertDismiss"),


    /* FEATURE 06 */

    linkedIncident:
        document.getElementById(
            "linkedIncident"
        ),

    linkedIncidentDescription:
        document.getElementById(
            "linkedIncidentDescription"
        ),

    sharedEvidenceCount:
        document.getElementById(
            "sharedEvidenceCount"
        ),

    sharedEvidenceDescription:
        document.getElementById(
            "sharedEvidenceDescription"
        )

};


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }

    element.textContent =
        value ?? "Unknown";

}


function numberOrZero(
    value
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function clamp(
    value
) {

    return Math.max(
        0,
        Math.min(
            Number(value) || 0,
            100
        )
    );

}


function normalizeState(
    state
) {

    return String(
        state || "UNKNOWN"
    ).toUpperCase();

}


/* =========================================================
   MINI BAR SCALING
   ========================================================= */

function scaleToBar(
    value,
    softMax
) {

    /*
     * Produces a 0-100 width for a mini bar
     * indicator. Uses a soft ceiling so a
     * single spike doesn't flatten the rest
     * of the bars — anything above softMax
     * still reads as "nearly full" rather
     * than clipping hard.
     */

    const number =
        Math.max(
            0,
            numberOrZero(value)
        );

    if (softMax <= 0) {
        return 0;
    }

    const ratio =
        number / softMax;

    // Compress values above the soft max instead of hard clipping
    const eased =
        ratio <= 1
            ? ratio
            : 1 + Math.log10(ratio) * 0.15;

    return clamp(
        eased * 100
    );

}


/* =========================================================
   SECURITY STATE DESCRIPTION
   ========================================================= */

function stateDescription(
    state,
    score
) {

    const normalized =
        normalizeState(state);


    if (
        normalized === "COMPROMISED"
    ) {

        return (
            "The endpoint shows sufficient " +
            "indicators of compromise. " +
            `Current risk score: ${score}/100.`
        );

    }


    if (
        normalized === "SUSPICIOUS"
    ) {

        return (
            "The endpoint shows suspicious " +
            "activity requiring investigation. " +
            `Current risk score: ${score}/100.`
        );

    }


    if (
        normalized === "NORMAL"
    ) {

        return (
            "The endpoint is currently operating " +
            "within the calculated security posture. " +
            `Current risk score: ${score}/100.`
        );

    }


    return (
        "The endpoint security state is " +
        "currently unavailable."
    );

}


/* =========================================================
   RISK LEVEL
   ========================================================= */

function deriveRiskLevel(
    score
) {

    if (score >= 60) {
        return "HIGH";
    }

    if (score >= 25) {
        return "MEDIUM";
    }

    return "LOW";

}


function formatRiskLevel(
    level
) {

    const text =
        String(
            level || "LOW"
        ).toUpperCase();


    if (
        text.includes("HIGH")
    ) {
        return "HIGH RISK";
    }


    if (
        text.includes("MEDIUM")
    ) {
        return "MEDIUM RISK";
    }


    if (
        text.includes("LOW")
    ) {
        return "LOW RISK";
    }


    return text;

}


/* =========================================================
   RISK TONE (used to color the gauge + mini bars)
   ========================================================= */

function riskTone(
    level
) {

    const text =
        String(
            level || "LOW"
        ).toUpperCase();

    if (text.includes("HIGH")) {
        return "danger";
    }

    if (text.includes("MEDIUM")) {
        return "warning";
    }

    return "success";

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function setStatusBadge(
    element,
    value
) {

    if (!element) {
        return;
    }


    const text =
        String(
            value ?? "UNKNOWN"
        );


    setText(
        element,
        text
    );


    element.classList.remove(
        "critical",
        "warning",
        "success"
    );


    const normalized =
        text.toUpperCase();


    if (

        normalized.includes(
            "COMPROMISED"
        ) ||

        normalized.includes(
            "HIGH"
        ) ||

        normalized.includes(
            "ANOMALY"
        ) ||

        normalized.includes(
            "ERROR"
        ) ||

        normalized.includes(
            "OFFLINE"
        )

    ) {

        element.classList.add(
            "critical"
        );

        return;
    }


    if (

        normalized.includes(
            "SUSPICIOUS"
        ) ||

        normalized.includes(
            "MEDIUM"
        ) ||

        normalized.includes(
            "WARNING"
        )

    ) {

        element.classList.add(
            "warning"
        );

        return;
    }


    if (

        normalized.includes(
            "NORMAL"
        ) ||

        normalized.includes(
            "LOW"
        ) ||

        normalized.includes(
            "ACTIVE"
        ) ||

        normalized.includes(
            "LIVE"
        ) ||

        normalized.includes(
            "MONITORED"
        ) ||

        normalized.includes(
            "CLEAR"
        ) ||

        normalized.includes(
            "SUCCESS"
        )

    ) {

        element.classList.add(
            "success"
        );

    }

}


/* =========================================================
   STATE CSS CLASS
   ========================================================= */

function applyStateClass(
    element,
    state
) {

    if (!element) {
        return;
    }


    element.classList.remove(
        "normal",
        "suspicious",
        "compromised",
        "critical",
        "warning",
        "success"
    );


    const normalized =
        normalizeState(state);


    if (
        normalized === "COMPROMISED"
    ) {

        element.classList.add(
            "compromised",
            "critical"
        );

    }

    else if (
        normalized === "SUSPICIOUS"
    ) {

        element.classList.add(
            "suspicious",
            "warning"
        );

    }

    else if (
        normalized === "NORMAL"
    ) {

        element.classList.add(
            "normal",
            "success"
        );

    }

}


/* =========================================================
   SEVERITY CLASS
   ========================================================= */

function severityClass(
    severity
) {

    switch (
        String(
            severity || ""
        ).toUpperCase()
    ) {

        case "HIGH":
            return "critical";

        case "MEDIUM":
            return "warning";

        case "LOW":
            return "success";

        default:
            return "";

    }

}


/* =========================================================
   FINDING NAME
   ========================================================= */

function formatFindingType(
    type
) {

    return String(
        type || "UNKNOWN"
    )
        .toLowerCase()
        .split("_")
        .map(
            word =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(" ");

}


/* =========================================================
   FINDING ICON
   ========================================================= */

function findingIcon(
    severity
) {

    switch (
        String(
            severity || ""
        ).toUpperCase()
    ) {

        case "HIGH":
            return '<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>'; // warning triangle

        case "MEDIUM":
            return '<i class="bi bi-record-circle-fill" aria-hidden="true"></i>'; // dot

        case "LOW":
            return '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>'; // check

        default:
            return '<i class="bi bi-dot" aria-hidden="true"></i>';

    }

}


/* =========================================================
   AUTHENTICATION SIGNAL CALCULATION
   ========================================================= */

function calculateAuthenticationSignals(
    findings
) {

    const authenticationTypes = [

        "AUTHENTICATION_FAILURE",

        "BRUTE_FORCE",

        "SUSPICIOUS_LOGIN",

        "USER_ACCOUNT_MODIFICATION",

        "PRIVILEGED_ACTIVITY"

    ];


    return findings

        .filter(
            finding =>
                authenticationTypes.includes(
                    String(
                        finding.type || ""
                    ).toUpperCase()
                )
        )

        .reduce(
            (
                total,
                finding
            ) => {

                return total +
                    numberOrZero(
                        finding.count
                    );

            },
            0
        );

}


/* =========================================================
   MISSING EVIDENCE
   ========================================================= */

function calculateMissingEvidence(
    data
) {

    /*
     * Current EndpointTwin API does not expose
     * a real evidence-gap model.
     *
     * Therefore do not invent missing evidence.
     */

    return 0;

}


/* =========================================================
   DATE / TIME
   ========================================================= */

function formatDateTime(
    value
) {

    if (!value) {
        return "Unknown";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unknown";

    }


    return date.toLocaleString();

}


function formatShortTime(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   FEATURE 04
   SECURITY ACTIVITY
   ========================================================= */

function updateSecurityActivity() {

    if (!elements.securityActivity) {
        return;
    }


    const findings =
        Array.isArray(
            endpointTwinState.security
                .riskBreakdown
        )
            ? endpointTwinState.security
                .riskBreakdown
            : [];


    /*
     * ACTIVE FINDINGS KPI
     */

    setText(
        elements.securityActivityCount,
        findings.length
    );


    /*
     * TOTAL RISK CONTRIBUTION
     */

    const totalRisk =
        findings.reduce(
            (
                total,
                finding
            ) => {

                return total +
                    numberOrZero(
                        finding.score
                    );

            },
            0
        );


    setText(
        elements.securityActivityRisk,
        `+${totalRisk}`
    );


    /*
     * NO FINDINGS
     */

    if (
        findings.length === 0
    ) {

        elements.securityActivity.innerHTML = `

            <article class="dashboard-card finding-card success">

                <div class="card-header">

                    <span class="finding-icon success">&#10003;</span>

                    <span class="severity-badge success">
                        CLEAR
                    </span>

                </div>

                <h3>
                    No Active Security Findings
                </h3>

                <p>
                    The Security State Engine has not
                    reported a security finding for the
                    current endpoint telemetry.
                </p>

                <div class="risk-footer">

                    <span>
                        Risk Contribution
                    </span>

                    <strong>
                        +0
                    </strong>

                </div>

            </article>

        `;

        return;
    }


    /*
     * DYNAMIC FINDING CARDS
     */

    elements.securityActivity.innerHTML =
        findings
            .map(
                (
                    finding,
                    index
                ) => {

                    const severity =
                        String(
                            finding.severity ||
                            "UNKNOWN"
                        ).toUpperCase();


                    const score =
                        numberOrZero(
                            finding.score
                        );


                    const count =
                        numberOrZero(
                            finding.count
                        );


                    const findingName =
                        formatFindingType(
                            finding.type
                        );


                    const description =
                        finding.description ||
                        "Security finding reported by the Security State Engine.";


                    const badgeClass =
                        severityClass(
                            severity
                        );


                    const icon =
                        findingIcon(
                            severity
                        );


                    return `

                        <article class="dashboard-card finding-card ${badgeClass}">

                            <div class="card-header">

                                <span class="finding-icon ${badgeClass}">${icon}</span>

                                <span
                                    class="severity-badge ${badgeClass}"
                                >
                                    ${escapeHtml(
                                        severity
                                    )}
                                </span>

                            </div>


                            <h3>
                                ${escapeHtml(
                                    findingName
                                )}
                            </h3>


                            <p>
                                ${escapeHtml(
                                    description
                                )}
                            </p>


                            <div class="risk-footer">

                                <span>
                                    EVENTS
                                </span>

                                <strong>
                                    ${count}
                                </strong>

                            </div>


                            <div class="risk-footer">

                                <span>
                                    RISK CONTRIBUTION
                                </span>

                                <strong>
                                    +${score}
                                </strong>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   FEATURE 05
   STATE HISTORY STORAGE
   ========================================================= */

function readStateHistory() {

    try {

        const stored =
            sessionStorage.getItem(
                HISTORY_STORAGE_KEY
            );


        const history =
            stored
                ? JSON.parse(
                    stored
                )
                : [];


        return Array.isArray(
            history
        )
            ? history
            : [];

    }

    catch (error) {

        console.warn(
            "[CyberTwin] Could not read state history:",
            error
        );

        return [];

    }

}


/* =========================================================
   SAVE STATE HISTORY
   ========================================================= */

function saveStateHistory(
    history
) {

    try {

        sessionStorage.setItem(

            HISTORY_STORAGE_KEY,

            JSON.stringify(
                history.slice(-10)
            )

        );

    }

    catch (error) {

        console.warn(
            "[CyberTwin] Could not save state history:",
            error
        );

    }

}


/* =========================================================
   RECORD STATE
   ========================================================= */

function recordState(
    state,
    score,
    confidence,
    timestamp,
    activityCount
) {

    const normalized =
        normalizeState(
            state
        );


    if (
        normalized === "UNKNOWN"
    ) {

        return;

    }


    const history =
        readStateHistory();


    const last =
        history[
            history.length - 1
        ];


    /*
     * Only create a new history record when
     * the actual security state changes.
     *
     * Example:
     *
     * NORMAL -> NORMAL
     * does NOT create another record.
     *
     * NORMAL -> SUSPICIOUS
     * creates a new record.
     *
     * SUSPICIOUS -> COMPROMISED
     * creates a new record.
     */

    if (
        !last ||
        last.state !== normalized
    ) {

        history.push({

            state:
                normalized,

            score:
                numberOrZero(
                    score
                ),

            confidence:
                numberOrZero(
                    confidence
                ),

            activityCount:
                numberOrZero(
                    activityCount
                ),

            timestamp:
                timestamp ||
                new Date().toISOString()

        });


        saveStateHistory(
            history
        );

    }


    renderStateHistory();

}


/* =========================================================
   RENDER STATE HISTORY
   Rendered as a visual timeline (reuses the existing
   .timeline / .timeline-item CSS already defined for
   the Attack Path page) instead of stacked full cards.
   ========================================================= */

function renderStateHistory() {

    if (
        !elements.stateHistory
    ) {

        return;

    }


    const history =
        readStateHistory();


    /*
     * OBSERVED STATES KPI
     */

    setText(
        elements.historyStateCount,
        history.length
    );


    /*
     * EMPTY STATE
     */

    if (
        history.length === 0
    ) {

        elements.stateHistory.innerHTML = `

            <article class="dashboard-card">

                <span class="card-label">
                    STATE HISTORY
                </span>

                <h3>
                    No State Transitions Observed
                </h3>

                <p>
                    The current endpoint state will be
                    recorded when the Endpoint Twin reports
                    its first valid security state.
                </p>

            </article>

        `;

        return;

    }


    /*
     * NEWEST STATE FIRST
     */

    const displayHistory =
        [...history].reverse();


    elements.stateHistory.innerHTML = `

        <div class="timeline">

            ${displayHistory
                .map(
                    (
                        item,
                        reverseIndex
                    ) => {

                        const state =
                            normalizeState(
                                item.state
                            );


                        const score =
                            numberOrZero(
                                item.score
                            );


                        const confidence =
                            numberOrZero(
                                item.confidence
                            );


                        const activityCount =
                            numberOrZero(
                                item.activityCount
                            );


                        const riskLevel =
                            deriveRiskLevel(
                                score
                            );


                        const tone =
                            state === "COMPROMISED"
                                ? "critical"
                                : state === "SUSPICIOUS"
                                    ? "warning"
                                    : state === "NORMAL"
                                        ? "success"
                                        : "";


                        const isCurrent =
                            reverseIndex === 0;


                        return `

                            <div class="timeline-item ${isCurrent ? "is-current" : ""}">

                                <div class="timeline-time">
                                    ${escapeHtml(
                                        formatShortTime(
                                            item.timestamp
                                        )
                                    )}
                                </div>

                                <div class="timeline-marker ${tone}"></div>

                                <div class="timeline-content">

                                    <div class="timeline-heading">

                                        <span class="severity-badge ${tone}">
                                            ${escapeHtml(state)}
                                        </span>

                                        <span class="timeline-tag">
                                            RISK ${score}/100 · ${escapeHtml(formatRiskLevel(riskLevel))}
                                        </span>

                                        <span class="timeline-tag">
                                            CONF ${confidence}%
                                        </span>

                                        <span class="timeline-tag">
                                            ${activityCount} FINDING${activityCount === 1 ? "" : "S"}
                                        </span>

                                    </div>

                                    <p>
                                        ${
                                            isCurrent
                                                ? "Most recently observed endpoint state."
                                                : "Previously observed endpoint security state."
                                        }
                                        ${escapeHtml(formatDateTime(item.timestamp))}
                                    </p>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


/* =========================================================
   FEATURE 05
   UPDATE CURRENT HISTORY STATE
   ========================================================= */

function updateStateHistory() {

    const state =
        endpointTwinState.security.state;


    const score =
        endpointTwinState.security.riskScore;


    const confidence =
        endpointTwinState.security.stateConfidence;


    const activityCount =
        endpointTwinState.security
            .riskBreakdown.length;


    /*
     * CURRENT STATE
     */

    setText(
        elements.historyCurrentState,
        state
    );


    applyStateClass(
        elements.historyCurrentState,
        state
    );


    /*
     * CURRENT RISK
     */

    setText(
        elements.historyCurrentRisk,
        `${score} / 100`
    );


    /*
     * CURRENT CONFIDENCE
     */

    setText(
        elements.historyCurrentConfidence,
        `${confidence}%`
    );


    /*
     * RECORD OBSERVATION
     */

    recordState(

        state,

        score,

        confidence,

        endpointTwinState.lastUpdated,

        activityCount

    );

}


/* =========================================================
   FEATURE 01
   ENDPOINT OVERVIEW
   ========================================================= */

function updateEndpointOverview() {

    setText(
        elements.hostname,
        endpointTwinState.endpoint
            .hostname
    );


    setText(
        elements.operatingSystem,
        endpointTwinState.endpoint
            .operatingSystem
    );


    setText(
        elements.ipAddress,
        endpointTwinState.endpoint
            .ipAddress
    );


    setText(
        elements.telemetryAgent,
        endpointTwinState.endpoint
            .telemetryAgent
    );


    setText(
        elements.lastUpdated,
        formatDateTime(
            endpointTwinState.lastUpdated
        )
    );


    setStatusBadge(

        elements.hostnameStatus,

        endpointTwinState.endpoint
            .telemetryAgent === "ACTIVE"
                ? "MONITORED"
                : "NOT ACTIVE"

    );


    setStatusBadge(

        elements.telemetryStatus,

        endpointTwinState.endpoint
            .telemetryAgent === "ACTIVE"
                ? "LIVE"
                : "OFFLINE"

    );


    if (
        elements.telemetryAgent
    ) {

        elements.telemetryAgent.classList.remove(
            "status-success"
        );


        if (
            endpointTwinState.endpoint
                .telemetryAgent === "ACTIVE"
        ) {

            elements.telemetryAgent.classList.add(
                "status-success"
            );

        }

    }

}


/* =========================================================
   FEATURE 02
   SECURITY STATE
   ========================================================= */

function updateSecurityState() {

    const state =
        endpointTwinState.security.state;


    const score =
        endpointTwinState.security.riskScore;


    const confidence =
        endpointTwinState.security
            .stateConfidence;


    const riskLevel =
        endpointTwinState.security
            .riskLevel;


    const tone =
        riskTone(
            riskLevel
        );


    setText(
        elements.securityState,
        state
    );


    setText(
        elements.stateDescription,

        stateDescription(
            state,
            score
        )

    );


    setText(
        elements.riskScore,
        `${score} / 100`
    );


    setText(
        elements.riskLevel,
        formatRiskLevel(
            riskLevel
        )
    );


    if (
        elements.riskBar
    ) {

        elements.riskBar.style.width =
            `${clamp(score)}%`;

    }


    /*
     * RISK GAUGE (circular indicator)
     */

    if (
        elements.riskGauge
    ) {

        elements.riskGauge.style.setProperty(
            "--pct",
            clamp(score)
        );

        elements.riskGauge.classList.remove(
            "success",
            "warning",
            "danger"
        );

        elements.riskGauge.classList.add(
            tone
        );

    }


    setText(
        elements.riskGaugeValue,
        score
    );


    setText(
        elements.stateConfidence,
        `${clamp(confidence)}%`
    );


    if (
        elements.confidenceBar
    ) {

        elements.confidenceBar.style.width =
            `${clamp(confidence)}%`;

    }


    applyStateClass(
        elements.securityState,
        state
    );


    setStatusBadge(
        elements.riskLevel,
        riskLevel
    );

}


/* =========================================================
   FEATURE 03
   TELEMETRY
   ========================================================= */

function updateTelemetry() {

    const authCount =
        endpointTwinState.telemetry
            .authenticationEvents;


    const processCount =
        endpointTwinState.telemetry
            .processCount;


    const networkCount =
        endpointTwinState.telemetry
            .networkConnections;


    const logCount =
        endpointTwinState.telemetry
            .logCount;


    setText(
        elements.authenticationEvents,
        authCount
    );


    setText(
        elements.processCount,
        processCount
    );


    setText(
        elements.networkConnections,
        networkCount
    );


    setText(
        elements.logEvents,
        logCount
    );


    /*
     * MINI BAR INDICATORS
     * Soft-max values are tuned to typical
     * single-endpoint telemetry volumes so the
     * bars stay visually meaningful.
     */

    if (elements.authenticationBar) {

        elements.authenticationBar.style.width =
            `${scaleToBar(authCount, 20)}%`;

    }

    if (elements.processBar) {

        elements.processBar.style.width =
            `${scaleToBar(processCount, 250)}%`;

    }

    if (elements.networkBar) {

        elements.networkBar.style.width =
            `${scaleToBar(networkCount, 15)}%`;

    }

    if (elements.logBar) {

        elements.logBar.style.width =
            `${scaleToBar(logCount, 150)}%`;

    }


    const authFinding =
        endpointTwinState.security
            .riskBreakdown
            .some(
                finding => {

                    const type =
                        String(
                            finding.type || ""
                        ).toUpperCase();


                    return [

                        "AUTHENTICATION_FAILURE",

                        "BRUTE_FORCE",

                        "SUSPICIOUS_LOGIN",

                        "USER_ACCOUNT_MODIFICATION",

                        "PRIVILEGED_ACTIVITY"

                    ].includes(
                        type
                    );

                }
            );


    setStatusBadge(

        elements.authenticationStatus,

        authFinding
            ? "ANOMALY DETECTED"
            : "NO ACTIVE FINDING"

    );


    setStatusBadge(

        elements.networkStatus,

        networkCount > 0
            ? "MONITORED"
            : "NO DATA"

    );

}


/* =========================================================
   FEATURE 06
   SHARED TWIN
   ========================================================= */

function updateSharedTwin() {

    /*
     * The current EndpointTwin API does not expose
     * an incident ID.
     *
     * Therefore we do not invent one.
     */

    setText(
        elements.linkedIncident,
        "NO ACTIVE INCIDENT"
    );


    setText(

        elements.linkedIncidentDescription,

        `Endpoint ${
            endpointTwinState.endpoint.hostname
        } is currently ${
            endpointTwinState.security.state
        }. No incident identifier is exposed by the current Endpoint Twin API.`

    );


    const findings =
        endpointTwinState.security
            .riskBreakdown;


    const evidenceCount =
        findings.length;


    setText(
        elements.sharedEvidenceCount,
        evidenceCount
    );


    const types =
        findings.map(
            finding =>
                formatFindingType(
                    finding.type
                )
        );


    setText(

        elements.sharedEvidenceDescription,

        evidenceCount > 0

            ? `Current supporting findings: ${types.join(", ")}.`

            : "No supporting security findings are currently reported."

    );

}


/* =========================================================
   ALERT SYSTEM
   ========================================================= */

function alertSnapshot(data) {

    const findings =
        Array.isArray(data.riskBreakdown)
            ? data.riskBreakdown
            : [];

    return {
        state: normalizeState(data.securityState),
        riskScore: numberOrZero(data.riskScore),
        riskLevel: String(
            data.riskLevel ||
            deriveRiskLevel(numberOrZero(data.riskScore))
        ).toUpperCase(),
        findings: findings.map(finding => ({
            type: String(finding.type || "UNKNOWN").toUpperCase(),
            severity: String(finding.severity || "UNKNOWN").toUpperCase(),
            score: numberOrZero(finding.score),
            count: numberOrZero(finding.count),
            description: String(finding.description || "")
        })),
        timestamp:
            data.lastUpdated ||
            data.updatedAt ||
            new Date().toISOString()
    };

}


function findingKey(finding) {

    return [
        finding.type,
        finding.severity,
        finding.score,
        finding.description
    ].join("|");

}


function newFindings(previous, current) {

    const previousKeys =
        new Set(
            (previous?.findings || []).map(
                findingKey
            )
        );

    return (current.findings || []).filter(
        finding =>
            !previousKeys.has(
                findingKey(finding)
            )
    );

}


function stateRank(state) {

    switch (normalizeState(state)) {
        case "NORMAL":
            return 0;
        case "SUSPICIOUS":
            return 1;
        case "COMPROMISED":
            return 2;
        default:
            return -1;
    }

}


function revealAlert(element) {

    if (!element) return;

    element.hidden = false;
    element.classList.remove("alert-enter");

    void element.offsetWidth;

    element.classList.add("alert-enter");

}


function hideAlert(element) {

    if (!element) return;

    element.hidden = true;
    element.classList.remove("alert-enter");

}


function showStateChangeAlert(previous, current) {

    if (
        !previous ||
        !elements.stateChangeAlert ||
        previous.state === current.state
    ) {
        return;
    }

    const before = normalizeState(previous.state);
    const after = normalizeState(current.state);

    const tone =
        after === "COMPROMISED"
            ? "compromised"
            : after === "SUSPICIOUS"
                ? "suspicious"
                : after === "NORMAL"
                    ? "normal"
                    : "";

    setText(
        elements.stateChangeAlertTime,
        formatShortTime(current.timestamp)
    );

    setText(
        elements.stateChangeAlertTitle,
        "Endpoint state changed"
    );

    setText(
        elements.stateChangeAlertMessage,
        `${before} → ${after}. Risk changed from ${previous.riskScore}/100 to ${current.riskScore}/100.`
    );

    if (elements.stateChangeAlertDetails) {
        elements.stateChangeAlertDetails.innerHTML = `
            <span class="state-before">
                ${escapeHtml(before)}
            </span>
            <span class="state-arrow"><i class="bi bi-arrow-right" aria-hidden="true"></i></span>
            <span class="state-after">
                ${escapeHtml(after)}
            </span>
        `;
    }

    elements.stateChangeAlert.classList.remove(
        "normal",
        "suspicious",
        "compromised"
    );

    if (tone) {
        elements.stateChangeAlert.classList.add(tone);
    }

    revealAlert(elements.stateChangeAlert);

}


function showAttentionAlert(previous, current, addedFindings) {

    if (!elements.attentionAlert) {
        return;
    }

    const stateWorsened =
        previous &&
        stateRank(current.state) >
        stateRank(previous.state);

    const riskIncrease =
        previous
            ? current.riskScore - previous.riskScore
            : 0;

    const significantRiskIncrease =
        riskIncrease >= 10;

    const highFinding =
        addedFindings.find(
            finding =>
                finding.severity === "HIGH"
        );

    const criticalState =
        current.state === "COMPROMISED";

    const highRisk =
        current.riskScore >= 60;

    const suspiciousTransition =
        previous &&
        previous.state !== current.state &&
        current.state === "SUSPICIOUS";

    if (
        !stateWorsened &&
        !significantRiskIncrease &&
        !highFinding &&
        !criticalState &&
        !highRisk &&
        !suspiciousTransition
    ) {
        return;
    }

    let severity = "MEDIUM";
    let title = "Security attention required";
    let message =
        `Endpoint risk is now ${current.riskScore}/100.`;

    if (
        criticalState ||
        highRisk ||
        highFinding
    ) {
        severity = "HIGH";
    }

    if (
        previous &&
        current.state === "COMPROMISED"
    ) {
        severity = "CRITICAL";
    }

    if (stateWorsened) {
        title = "Endpoint security state worsened";
        message =
            `State changed from ${previous.state} to ${current.state}. Risk is now ${current.riskScore}/100.`;
    }

    else if (highFinding) {
        title = "High-severity security finding detected";
        message =
            `${formatFindingType(highFinding.type)} was newly observed. Risk contribution: +${highFinding.score}.`;
    }

    else if (significantRiskIncrease) {
        title = "Endpoint risk increased";
        message =
            `Risk increased from ${previous.riskScore}/100 to ${current.riskScore}/100.`;
    }

    setText(
        elements.attentionAlertSeverity,
        severity
    );

    setText(
        elements.attentionAlertTime,
        formatShortTime(current.timestamp)
    );

    setText(
        elements.attentionAlertTitle,
        title
    );

    setText(
        elements.attentionAlertMessage,
        message
    );

    if (elements.attentionAlertMeta) {

        const meta = [];

        if (stateWorsened || suspiciousTransition) {
            meta.push("STATE CHANGE");
        }

        if (riskIncrease > 0) {
            meta.push("RISK INCREASE");
        }

        if (addedFindings.length) {
            meta.push(
                `${addedFindings.length} NEW FINDING${addedFindings.length === 1 ? "" : "S"}`
            );
        }

        elements.attentionAlertMeta.innerHTML =
            meta.map(
                item =>
                    `<span>${escapeHtml(item)}</span>`
            ).join("");

    }

    elements.attentionAlert.classList.toggle(
        "critical",
        severity === "HIGH" ||
        severity === "CRITICAL"
    );

    revealAlert(elements.attentionAlert);

}


function processEndpointAlerts(data) {

    const current = alertSnapshot(data);
    const transition = data.stateTransition;

    if (!transition || !transition.id) {
        endpointAlertState.previous = current;
        return;
    }

    const historyId = String(transition.id);

    if (!endpointAlertState.initialized) {
        endpointAlertState.previous = current;
        endpointAlertState.lastHistoryId = historyId;
        endpointAlertState.initialized = true;

        console.log(
            "[CyberTwin] Alert baseline established:",
            transition
        );

        return;
    }

    if (endpointAlertState.lastHistoryId === historyId) {
        endpointAlertState.previous = current;
        return;
    }

    console.log(
        "[CyberTwin] NEW SECURITY HISTORY EVENT:",
        transition
    );

    const previous = {
        state: normalizeState(
            transition.previousState ||
            endpointAlertState.previous?.state
        ),
        riskScore: numberOrZero(
            transition.previousRiskScore
        ),
        riskLevel: String(
            transition.previousRiskLevel || ""
        ).toUpperCase(),
        findings: []
    };

    const eventCurrent = {
        state: normalizeState(transition.currentState),
        riskScore: numberOrZero(transition.currentRiskScore),
        riskLevel: String(
            transition.currentRiskLevel || ""
        ).toUpperCase(),
        findings: Array.isArray(transition.findings)
            ? transition.findings.map(finding => ({
                type: String(finding.type || "UNKNOWN").toUpperCase(),
                severity: String(finding.severity || "UNKNOWN").toUpperCase(),
                score: numberOrZero(finding.score),
                count: numberOrZero(finding.count),
                description: String(finding.description || "")
            }))
            : [],
        timestamp: transition.changedAt
    };

    const addedFindings =
        newFindings(previous, eventCurrent);

    showStateChangeAlert(previous, eventCurrent);

    showAttentionAlert(
        previous,
        eventCurrent,
        addedFindings
    );

    endpointAlertState.lastHistoryId = historyId;
    endpointAlertState.previous = current;
}


function setupAlertControls() {

    /*
     * Dismiss controls
     * ----------------
     * Use direct listeners plus a delegated fallback.
     * This keeps the close button reliable even if the
     * alert markup is changed or re-rendered.
     */

    if (elements.attentionAlertDismiss) {
        elements.attentionAlertDismiss.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                hideAlert(elements.attentionAlert);
            }
        );
    }

    if (elements.stateChangeAlertDismiss) {
        elements.stateChangeAlertDismiss.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                hideAlert(elements.stateChangeAlert);
            }
        );
    }

    /*
     * Fallback event delegation for any alert dismiss button.
     */
    document.addEventListener(
        "click",
        (event) => {

            const dismissButton =
                event.target.closest(".alert-dismiss");

            if (!dismissButton) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const alert =
                dismissButton.closest(".cybertwin-alert");

            if (alert) {
                hideAlert(alert);
            }
        }
    );

    if (elements.attentionAlertAction) {
        elements.attentionAlertAction.addEventListener(
            "click",
            () => {
                window.location.href =
                    "./incident-twin.html";
            }
        );
    }

}


/* =========================================================
   APPLY BACKEND DATA
   ========================================================= */

function applyEndpointTwinData(
    data
) {

    processEndpointAlerts(data);

    const telemetry =
        data.telemetry || {};


    const riskBreakdown =
        Array.isArray(
            data.riskBreakdown
        )

            ? data.riskBreakdown

            : [];


    const state =
        normalizeState(
            data.securityState
        );


    const score =
        numberOrZero(
            data.riskScore
        );


    const confidence =
        numberOrZero(
            data.evidenceConfidence
        );


    const status =
        String(
            data.status ||
            "UNKNOWN"
        ).toUpperCase();


    /*
     * ENDPOINT
     */

    endpointTwinState.endpoint.endpointId =
        data.endpointId ||
        "Unknown";


    endpointTwinState.endpoint.hostname =
        data.hostname ||
        "Unknown";


    endpointTwinState.endpoint.operatingSystem =
        data.os ||
        "Unknown";


    endpointTwinState.endpoint.ipAddress =
        data.ip ||
        "Unknown";


    endpointTwinState.endpoint.telemetryAgent =
        status;


    /*
     * SECURITY
     */

    endpointTwinState.security.state =
        state;


    endpointTwinState.security.riskScore =
        score;


    endpointTwinState.security.riskLevel =
        String(
            data.riskLevel ||
            deriveRiskLevel(score)
        ).toUpperCase();


    endpointTwinState.security.stateConfidence =
        confidence;


    endpointTwinState.security.riskBreakdown =
        riskBreakdown;


    /*
     * EVIDENCE
     */

    endpointTwinState.evidence.supporting =
        riskBreakdown.length;


    endpointTwinState.evidence.missing =
        calculateMissingEvidence(
            data
        );


    /*
     * TELEMETRY
     */

    endpointTwinState.telemetry.processCount =
        numberOrZero(
            telemetry.processes
        );


    endpointTwinState.telemetry.networkConnections =
        numberOrZero(
            telemetry.connections
        );


    endpointTwinState.telemetry.logCount =
        numberOrZero(
            telemetry.logs
        );


    endpointTwinState.telemetry.authenticationEvents =
        calculateAuthenticationSignals(
            riskBreakdown
        );


    /*
     * Current EndpointTwin API does not expose
     * file event count.
     */

    endpointTwinState.telemetry.fileEvents =
        0;


    /*
     * SYSTEM
     */

    endpointTwinState.system.telemetryStatus =
        status === "ACTIVE"
            ? "ACTIVE"
            : "INACTIVE";


    endpointTwinState.system.systemStatus =
        status === "ACTIVE"
            ? "ONLINE"
            : "OFFLINE";


    /*
     * LAST UPDATE
     */

    endpointTwinState.lastUpdated =
        data.lastUpdated ||
        data.updatedAt ||
        null;


    /*
     * UPDATE EVERYTHING
     */

    updateTopbar();

    updateEndpointOverview();

    updateSecurityState();

    updateTelemetry();

    updateSecurityActivity();

    updateEvidence();

    updateSharedTwin();

    updateStateHistory();

}


/* =========================================================
   TOPBAR
   ========================================================= */

function updateTopbar() {

    setText(
        elements.topbarEndpoint,
        endpointTwinState.endpoint.hostname
    );


    setText(
        elements.topbarIncident,
        endpointTwinState.incident.id
    );


    setStatusBadge(
        elements.topbarState,
        endpointTwinState.security.state
    );


    setText(
        elements.topbarRisk,
        endpointTwinState.security.riskScore
    );


    setText(
        elements.topbarSystemStatus,
        endpointTwinState.system.systemStatus
    );


    setText(

        elements.sidebarSystemStatus,

        endpointTwinState.system.systemStatus ===
            "ONLINE"

            ? "SYSTEM ONLINE"

            : "SYSTEM OFFLINE"

    );

}


/* =========================================================
   EVIDENCE
   ========================================================= */

function updateEvidence() {

    setText(

        elements.supportingEvidence,

        endpointTwinState.evidence.supporting

    );


    setText(

        elements.missingEvidence,

        endpointTwinState.evidence.missing

    );

}


/* =========================================================
   FETCH ENDPOINT TWIN
   ========================================================= */

async function fetchEndpointTwin() {

    try {

        console.log(
            "[CyberTwin] Fetching Endpoint Twin..."
        );


        const response =
            await fetch(

                `${API_URL}?_=${Date.now()}`,

                {

                    method: "GET",

                    cache: "no-store"

                }

            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.data
        ) {

            throw new Error(
                "Invalid Endpoint Twin response"
            );

        }


        applyEndpointTwinData(
            result.data
        );


        console.log(
            "[CyberTwin] Endpoint Twin updated:",
            result.data
        );

    }

    catch (error) {

        console.error(

            "[CyberTwin] Endpoint Twin fetch failed:",

            error

        );


        setStatusBadge(

            elements.telemetryStatus,

            "BACKEND ERROR"

        );

    }

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {


        /*
         * Render existing locally observed
         * state history first.
         */

        renderStateHistory();

        setupAlertControls();


        /*
         * Fetch current backend state.
         */

        fetchEndpointTwin();


        /*
         * Keep the page synchronized
         * every 5 seconds.
         */

        setInterval(

            fetchEndpointTwin,

            REFRESH_INTERVAL

        );

    }

);