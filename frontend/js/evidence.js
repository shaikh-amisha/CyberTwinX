/* =========================================================
   CYBERTWIN
   EVIDENCE INVESTIGATION JAVASCRIPT
   ========================================================= */


/* =========================================================
   01. EVIDENCE STATE
========================================================= */

const evidenceState = {

    endpoint: "SERVER-01",

    incident: "INC-001",

    incidentData: null,

    securityState: "UNKNOWN",

    riskScore: 0,

    riskLevel: "LOW",

    confidence: 0,

    sufficiency: 0,

    supportingEvidence: 0,

    missingEvidence: 0,

    evidence: {},

    evidenceRecords: [],

    timeline: [],

    missingEvidenceRecords: [],

    systemStatus: "ONLINE",

    incidents: [],

    incidentSelectorOpen: false,

    loading: false

};


/* =========================================================
   02. API
========================================================= */

const INCIDENT_API_URL =
    "http://localhost:5000/api/incident-twin";

const EVIDENCE_API_URL =
    "http://localhost:5000/api/evidence";


/* =========================================================
   03. DOM REFERENCES
========================================================= */

const elements = {

    topbarEndpoint:
        document.getElementById("topbarEndpoint"),

    topbarIncident:
        document.getElementById("topbarIncident"),

    topbarState:
        document.getElementById("topbarState"),

    topbarRisk:
        document.getElementById("topbarRisk"),

    topbarSystemStatus:
        document.getElementById("topbarSystemStatus"),

    sidebarSystemStatus:
        document.getElementById("sidebarSystemStatus"),

    evidenceHeaderSufficiency:
        document.getElementById("evidenceHeaderSufficiency"),

    supportingEvidence:
        document.getElementById("supportingEvidence"),

    missingEvidence:
        document.getElementById("missingEvidence"),

    evidenceSufficiency:
        document.getElementById("evidenceSufficiency"),

    evidenceProgress:
        document.getElementById("evidenceProgress"),

    currentState:
        document.getElementById("currentState"),

    evidenceTimeline:
        document.getElementById("evidenceTimeline"),

    evidenceDetails:
        document.getElementById("evidenceDetails"),

    evidenceList:
        document.getElementById("evidenceList"),

    missingEvidenceList:
        document.getElementById("missingEvidenceList"),

    incidentSelector:
        document.getElementById("incidentSelector"),

    selectedIncidentLabel:
        document.getElementById("selectedIncidentLabel"),

    incidentSelectorPanel:
        document.getElementById("incidentSelectorPanel"),

    reevaluateButton:
        document.getElementById("reevaluateButton"),

    reevaluationMessage:
        document.getElementById("reevaluationMessage")

};


/* =========================================================
   04. SAFE TEXT
========================================================= */

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent =
        value ?? "";

}


/* =========================================================
   05. NORMALIZE CATEGORY
========================================================= */

function normalizeEvidenceCategory(category) {

    return String(category || "")
        .trim()
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/ /g, "_");

}


/* =========================================================
   06. FORMAT DATE
========================================================= */

function formatEventTime(value) {

    if (!value) {
        return "TIME UNKNOWN";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "TIME UNKNOWN";
    }

    return date.toLocaleString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


/* =========================================================
   07. BUILD EVIDENCE MAP
========================================================= */

function buildEvidenceMap(
    evidenceRecords = []
) {

    const map = {};

    evidenceRecords.forEach(
        evidence => {

            const category =
                normalizeEvidenceCategory(
                    evidence.category
                );

            const status =
                String(
                    evidence.status || ""
                ).toUpperCase();

            if (
                category &&
                status === "SUPPORTING"
            ) {

                map[category] = true;

            }

        }
    );

    return map;

}


/* =========================================================
   08. UPDATE TOPBAR
========================================================= */

function updateTopbar() {

    setText(
        elements.topbarEndpoint,
        evidenceState.endpoint
    );

    setText(
        elements.topbarIncident,
        evidenceState.incident
    );

    setText(
        elements.topbarState,
        evidenceState.securityState
    );

    setText(
        elements.topbarRisk,
        evidenceState.riskScore
    );

    setText(
        elements.topbarSystemStatus,
        evidenceState.systemStatus
    );

    setText(
        elements.sidebarSystemStatus,
        evidenceState.systemStatus
    );


    if (elements.topbarState) {

        elements.topbarState.classList.remove(
            "normal",
            "suspicious",
            "compromised",
            "contained",
            "resolved"
        );

        elements.topbarState.classList.add(
            String(
                evidenceState.securityState ||
                ""
            ).toLowerCase()
        );

    }

}


/* =========================================================
   09. UPDATE SUMMARY
========================================================= */

function updateEvidenceSummary() {

    setText(
        elements.supportingEvidence,
        evidenceState.supportingEvidence
    );

    setText(
        elements.missingEvidence,
        evidenceState.missingEvidence
    );

    setText(
        elements.evidenceSufficiency,
        `${evidenceState.sufficiency}%`
    );

    setText(
        elements.evidenceHeaderSufficiency,
        `${evidenceState.sufficiency}% SUFFICIENT`
    );

    setText(
        elements.currentState,
        evidenceState.securityState
    );


    if (elements.evidenceProgress) {

        const percentage =
            Math.min(
                Math.max(
                    Number(
                        evidenceState.sufficiency
                    ) || 0,
                    0
                ),
                100
            );

        elements.evidenceProgress.style.width =
            `${percentage}%`;

    }


    if (elements.currentState) {

        elements.currentState.classList.remove(
            "normal",
            "suspicious",
            "compromised",
            "contained",
            "resolved"
        );

        elements.currentState.classList.add(
            String(
                evidenceState.securityState ||
                ""
            ).toLowerCase()
        );

    }

}


/* =========================================================
   10. UPDATE INCIDENT SELECTOR LABEL
========================================================= */

function updateIncidentSelectorLabel() {

    const incident =
        evidenceState.incidentData;

    if (!incident) {

        setText(
            elements.selectedIncidentLabel,
            "No incident selected"
        );

        return;

    }


    setText(
        elements.selectedIncidentLabel,
        `${incident.incidentId || "UNKNOWN"} — ${
            incident.incidentType || "Unknown Incident"
        }`
    );

}


/* =========================================================
   11. RENDER INCIDENT SELECTOR
========================================================= */

function renderIncidentSelector() {

    const panel =
        elements.incidentSelectorPanel;


    if (!panel) {
        return;
    }


    panel.innerHTML = "";


    if (!evidenceState.incidents.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "incident-selector-empty";

        empty.textContent =
            "No incidents available.";

        panel.appendChild(
            empty
        );

        return;

    }


    evidenceState.incidents.forEach(
        incident => {

            const item =
                document.createElement("div");

            item.className =
                "incident-selector-item";


            if (
                incident.incidentId ===
                evidenceState.incident
            ) {

                item.classList.add(
                    "selected"
                );

            }


            const header =
                document.createElement("div");

            header.className =
                "incident-selector-item-header";


            const id =
                document.createElement("strong");

            id.textContent =
                incident.incidentId ||
                "UNKNOWN";


            const state =
                document.createElement("span");

            state.className =
                `incident-selector-state ${
                    String(
                        incident.currentState ||
                        "DETECTED"
                    ).toLowerCase()
                }`;

            state.textContent =
                incident.currentState ||
                "DETECTED";


            header.append(
                id,
                state
            );


            const type =
                document.createElement("div");

            type.className =
                "incident-selector-item-type";

            type.textContent =
                incident.incidentType ||
                "Unknown Incident";


            const endpoint =
                document.createElement("div");

            endpoint.className =
                "incident-selector-item-endpoint";

            endpoint.textContent =
                incident.endpointHostname ||
                incident.endpointId ||
                "Unknown Endpoint";


            const risk =
                document.createElement("div");

            risk.className =
                "incident-selector-item-risk";

            risk.textContent =
                `RISK ${incident.riskScore ?? 0}/100 · ${
                    incident.riskLevel || "LOW"
                }`;


            item.append(
                header,
                type,
                endpoint,
                risk
            );


            item.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    await selectIncident(
                        incident
                    );

                }
            );


            panel.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   12. OPEN SELECTOR
========================================================= */

function openIncidentSelector() {

    if (!elements.incidentSelector) {
        return;
    }


    evidenceState.incidentSelectorOpen =
        true;


    elements.incidentSelector
        .classList.add("open");


    if (elements.incidentSelectorPanel) {

        elements.incidentSelectorPanel
            .classList.add("open");

    }

}


/* =========================================================
   13. CLOSE SELECTOR
========================================================= */

function closeIncidentSelector() {

    if (!elements.incidentSelector) {
        return;
    }


    evidenceState.incidentSelectorOpen =
        false;


    elements.incidentSelector
        .classList.remove("open");


    if (elements.incidentSelectorPanel) {

        elements.incidentSelectorPanel
            .classList.remove("open");

    }

}


/* =========================================================
   14. TOGGLE SELECTOR
========================================================= */

function toggleIncidentSelector() {

    if (
        evidenceState.incidentSelectorOpen
    ) {

        closeIncidentSelector();

    } else {

        openIncidentSelector();

    }

}


/* =========================================================
   15. INITIALIZE SELECTOR
========================================================= */

function initializeIncidentSelector() {

    if (!elements.incidentSelector) {
        return;
    }


    elements.incidentSelector
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        ".incident-selector-item"
                    )
                ) {

                    return;

                }

                toggleIncidentSelector();

            }
        );


    document.addEventListener(
        "click",
        event => {

            if (
                !elements.incidentSelector.contains(
                    event.target
                )
            ) {

                closeIncidentSelector();

            }

        }
    );

}


/* =========================================================
   16. SELECT INCIDENT
========================================================= */

async function selectIncident(
    incident
) {

    if (!incident) {
        return;
    }


    evidenceState.incidentData =
        incident;

    evidenceState.incident =
        incident.incidentId ||
        "UNKNOWN";

    evidenceState.endpoint =
        incident.endpointHostname ||
        incident.endpointId ||
        "UNKNOWN";

    evidenceState.securityState =
        incident.currentState ||
        "UNKNOWN";

    evidenceState.riskScore =
        incident.riskScore ?? 0;

    evidenceState.riskLevel =
        incident.riskLevel ||
        "LOW";

    evidenceState.confidence =
        incident.confidence ?? 0;


    updateIncidentSelectorLabel();

    updateTopbar();

    renderIncidentSelector();

    closeIncidentSelector();


    const url =
        new URL(
            window.location.href
        );


    url.searchParams.set(
        "incidentId",
        evidenceState.incident
    );


    window.history.replaceState(
        {},
        "",
        url
    );


    await loadEvidenceInvestigation(
        evidenceState.incident
    );

}


/* =========================================================
   17. LOAD INCIDENTS
========================================================= */

async function loadIncidents() {

    try {

        setText(
            elements.selectedIncidentLabel,
            "Loading incidents..."
        );


        const response =
            await fetch(
                INCIDENT_API_URL
            );


        if (!response.ok) {

            throw new Error(
                `Incident API returned ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !Array.isArray(result.data)
        ) {

            throw new Error(
                "Invalid incident API response"
            );

        }


        evidenceState.incidents =
            result.data;


        if (
            !evidenceState.incidents.length
        ) {

            setText(
                elements.selectedIncidentLabel,
                "No incidents available"
            );

            renderIncidentSelector();

            return;

        }


        const params =
            new URLSearchParams(
                window.location.search
            );


        const requestedIncidentId =
            params.get(
                "incidentId"
            );


        const requestedIncident =
            evidenceState.incidents.find(
                incident =>
                    incident.incidentId ===
                    requestedIncidentId
            );


        const selectedIncident =
            requestedIncident ||
            [...evidenceState.incidents].sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.updatedAt ||
                            a.createdAt ||
                            0
                        );

                    const dateB =
                        new Date(
                            b.updatedAt ||
                            b.createdAt ||
                            0
                        );

                    return dateB - dateA;

                }
            )[0];


        evidenceState.incidentData =
            selectedIncident;

        evidenceState.incident =
            selectedIncident.incidentId ||
            "UNKNOWN";

        evidenceState.endpoint =
            selectedIncident.endpointHostname ||
            selectedIncident.endpointId ||
            "UNKNOWN";

        evidenceState.securityState =
            selectedIncident.currentState ||
            "UNKNOWN";

        evidenceState.riskScore =
            selectedIncident.riskScore ?? 0;

        evidenceState.riskLevel =
            selectedIncident.riskLevel ||
            "LOW";

        evidenceState.confidence =
            selectedIncident.confidence ?? 0;


        renderIncidentSelector();

        updateIncidentSelectorLabel();

        updateTopbar();


        await loadEvidenceInvestigation(
            evidenceState.incident
        );

    }

    catch (error) {

        console.error(
            "[CyberTwin] Failed to load incidents:",
            error
        );


        setText(
            elements.selectedIncidentLabel,
            "Unable to load incidents"
        );

    }

}


/* =========================================================
   18. LOAD EVIDENCE INVESTIGATION
========================================================= */

async function loadEvidenceInvestigation(
    incidentId
) {

    if (!incidentId) {
        return;
    }


    evidenceState.loading =
        true;


    try {

        const response =
            await fetch(
                `${EVIDENCE_API_URL}/${encodeURIComponent(incidentId)}`
            );


        if (!response.ok) {

            throw new Error(
                `Evidence API returned ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result.success ||
            !result.data
        ) {

            throw new Error(
                result.message ||
                "Invalid evidence API response"
            );

        }


        applyEvidenceInvestigationData(
            result.data
        );


        console.log(
            "[CyberTwin] Evidence investigation loaded:",
            result.data
        );

    }

    catch (error) {

        console.error(
            "[CyberTwin] Failed to load evidence investigation:",
            error
        );


        setText(
            elements.reevaluationMessage,
            `Unable to load investigation: ${error.message}`
        );

    }

    finally {

        evidenceState.loading =
            false;

    }

}


/* =========================================================
   19. APPLY BACKEND DATA
========================================================= */

function applyEvidenceInvestigationData(
    data
) {

    const incident =
        data.incident ||
        {};

    const summary =
        data.summary ||
        {};


    evidenceState.incidentData =
        incident;

    evidenceState.incident =
        incident.incidentId ||
        evidenceState.incident;

    evidenceState.endpoint =
        incident.endpointHostname ||
        incident.endpointId ||
        evidenceState.endpoint;

    evidenceState.securityState =
        summary.currentState ||
        incident.currentState ||
        incident.endpointState ||
        "UNKNOWN";

    evidenceState.riskScore =
        summary.riskScore ??
        incident.riskScore ??
        0;

    evidenceState.riskLevel =
        summary.riskLevel ||
        incident.riskLevel ||
        "LOW";

    evidenceState.confidence =
        summary.confidence ??
        incident.confidence ??
        0;

    evidenceState.supportingEvidence =
        Number(
            summary.supportingCount ??
            0
        );

    evidenceState.missingEvidence =
        Number(
            summary.missingCount ??
            0
        );

    evidenceState.sufficiency =
        Number(
            summary.sufficiency ??
            0
        );

    evidenceState.evidenceRecords =
        Array.isArray(
            data.evidence
        )
            ? data.evidence
            : [];

    evidenceState.timeline =
        Array.isArray(
            data.timeline
        )
            ? data.timeline
            : [];

    evidenceState.missingEvidenceRecords =
        Array.isArray(
            data.missingEvidence
        )
            ? data.missingEvidence
            : [];

    evidenceState.evidence =
        buildEvidenceMap(
            evidenceState.evidenceRecords
        );


    updateIncidentSelectorLabel();

    updateTopbar();

    updateEvidenceSummary();

    renderEvidenceTimeline();

    renderEvidenceDetails();

    renderMissingEvidence();

}


/* =========================================================
   20. RENDER EVIDENCE TIMELINE
========================================================= */

function renderEvidenceTimeline() {

    const container =
        elements.evidenceTimeline;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!evidenceState.timeline.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "timeline-item";


        const time =
            document.createElement("span");

        time.className =
            "timeline-time";

        time.textContent =
            "—";


        const marker =
            document.createElement("div");

        marker.className =
            "timeline-marker";


        const content =
            document.createElement("div");


        const title =
            document.createElement("strong");

        title.textContent =
            "No timeline events";


        const description =
            document.createElement("p");

        description.textContent =
            "No evidence timeline events are currently available.";


        content.append(
            title,
            description
        );


        empty.append(
            time,
            marker,
            content
        );


        container.appendChild(
            empty
        );

        return;

    }


    const orderedTimeline =
        [...evidenceState.timeline]
            .filter(
                event =>
                    event &&
                    event.time
            )
            .sort(
                (a, b) =>
                    new Date(a.time) -
                    new Date(b.time)
            );


    orderedTimeline.forEach(
        (event, index) => {

            const item =
                document.createElement("div");

            item.className =
                "timeline-item";


            if (
                index ===
                orderedTimeline.length - 1
            ) {

                item.classList.add(
                    "active"
                );

            }


            const time =
                document.createElement("span");

            time.className =
                "timeline-time";

            time.textContent =
                formatEventTime(
                    event.time
                );


            const marker =
                document.createElement("div");

            marker.className =
                "timeline-marker";


            const content =
                document.createElement("div");


            const title =
                document.createElement("strong");

            title.textContent =
                event.title ||
                "Evidence Event";


            const description =
                document.createElement("p");

            description.textContent =
                event.description ||
                "No description available.";


            content.append(
                title,
                description
            );


            if (
                event.evidenceId ||
                event.tag
            ) {

                const tag =
                    document.createElement("span");

                tag.className =
                    "evidence-tag";

                tag.textContent =
                    event.tag ||
                    event.evidenceId;

                content.appendChild(
                    tag
                );

            }


            item.append(
                time,
                marker,
                content
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   21. RENDER EVIDENCE DETAILS
========================================================= */

function renderEvidenceDetails() {

    const container =
        elements.evidenceList;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !evidenceState.evidenceRecords.length
    ) {

        const empty =
            document.createElement("div");

        empty.className =
            "evidence-empty";

        empty.textContent =
            "No evidence is currently linked to this incident.";

        container.appendChild(
            empty
        );

        return;

    }


    evidenceState.evidenceRecords.forEach(
        evidence => {

            const card =
                document.createElement("article");

            card.className =
                "dashboard-card evidence-card";


            const header =
                document.createElement("div");

            header.className =
                "evidence-item-header";


            const title =
                document.createElement("strong");

            title.textContent =
                evidence.type ||
                evidence.evidenceId ||
                "Evidence";


            const status =
                document.createElement("strong");

            const statusValue =
                String(
                    evidence.status ||
                    "SUPPORTING"
                ).toUpperCase();

            status.className =
                `evidence-status ${
                    statusValue.toLowerCase()
                }`;

            status.textContent =
                statusValue;


            header.append(
                title,
                status
            );


            const category =
                document.createElement("div");

            category.className =
                "evidence-card-category";

            category.textContent =
                evidence.category ||
                "OTHER";


            const description =
                document.createElement("p");

            description.textContent =
                evidence.description ||
                "No description available.";


            const meta =
                document.createElement("div");

            meta.className =
                "evidence-item-meta";


            const severity =
                document.createElement("span");

            severity.textContent =
                `Severity: ${
                    evidence.severity ||
                    "LOW"
                }`;


            const timestamp =
                document.createElement("span");

            timestamp.textContent =
                `Time: ${
                    formatEventTime(
                        evidence.timestamp
                    )
                }`;


            const telemetry =
                document.createElement("span");

            telemetry.textContent =
                `Telemetry: ${
                    evidence.telemetryId ||
                    "N/A"
                }`;


            meta.append(
                severity,
                timestamp,
                telemetry
            );


            card.append(
                header,
                category,
                description,
                meta
            );


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   22. RENDER MISSING EVIDENCE
========================================================= */

function renderMissingEvidence() {

    const container =
        elements.missingEvidenceList;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !evidenceState.missingEvidenceRecords.length
    ) {

        const item =
            document.createElement("div");

        item.className =
            "missing-item";


        const content =
            document.createElement("div");


        const title =
            document.createElement("strong");

        title.textContent =
            "Evidence coverage complete";


        const description =
            document.createElement("p");

        description.textContent =
            "No additional evidence is currently required for this investigation.";


        content.append(
            title,
            description
        );


        item.appendChild(
            content
        );


        container.appendChild(
            item
        );

        return;

    }


    evidenceState.missingEvidenceRecords.forEach(
        missing => {

            const item =
                document.createElement("div");

            item.className =
                "missing-item";


            const content =
                document.createElement("div");


            const title =
                document.createElement("strong");

            title.textContent =
                missing.label ||
                missing.category ||
                "Missing Evidence";


            const description =
                document.createElement("p");

            description.textContent =
                missing.description ||
                "Additional evidence is required.";


            content.append(
                title,
                description
            );


            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "card-button request-evidence";

            button.dataset.evidence =
                String(
                    missing.category ||
                    ""
                )
                    .toLowerCase()
                    .replace(/_/g, "-");

            button.textContent =
                "Request Evidence";


            button.addEventListener(
                "click",
                () => {

                    handleEvidenceRequest(
                        missing
                    );

                }
            );


            item.append(
                content,
                button
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   23. REQUEST EVIDENCE
========================================================= */

async function handleEvidenceRequest(
    missing
) {

    const category =
        missing?.category ||
        "UNKNOWN";


    if (!evidenceState.incident) {
        return;
    }


    try {

        const response =
            await fetch(
                `${EVIDENCE_API_URL}/${encodeURIComponent(evidenceState.incident)}/evidence/request`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        category
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Evidence request returned ${response.status}`
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Evidence request failed"
            );

        }


        setText(
            elements.reevaluationMessage,
            `${missing.label || category} evidence has been requested.`
        );

    }

    catch (error) {

        console.error(
            "[CyberTwin] Evidence request failed:",
            error
        );


        setText(
            elements.reevaluationMessage,
            `Unable to request evidence: ${error.message}`
        );

    }

}


/* =========================================================
   24. RE-EVALUATE
========================================================= */

async function reevaluateSecurityState() {

    if (!evidenceState.incident) {
        return;
    }


    const response =
        await fetch(
            `${EVIDENCE_API_URL}/${encodeURIComponent(evidenceState.incident)}/reevaluate`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `Re-evaluation returned ${response.status}`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "Re-evaluation failed"
        );

    }


    await loadEvidenceInvestigation(
        evidenceState.incident
    );

}


/* =========================================================
   25. INITIALIZE RE-EVALUATION
========================================================= */

function initializeReevaluation() {

    if (!elements.reevaluateButton) {
        return;
    }


    elements.reevaluateButton.addEventListener(
        "click",
        async function () {

            this.disabled = true;

            this.textContent =
                "RE-EVALUATING...";


            setText(
                elements.reevaluationMessage,
                "Re-evaluating security state..."
            );


            try {

                await reevaluateSecurityState();


                setText(
                    elements.reevaluationMessage,
                    `Security state re-evaluated for ${evidenceState.incident}.`
                );

            }

            catch (error) {

                console.error(
                    "[CyberTwin] Re-evaluation failed:",
                    error
                );


                setText(
                    elements.reevaluationMessage,
                    `Unable to re-evaluate security state: ${error.message}`
                );

            }

            finally {

                this.disabled = false;

                this.textContent =
                    "RE-EVALUATE STATE";

            }

        }
    );

}


/* =========================================================
   26. NAVIGATION
========================================================= */

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                function () {

                    navItems.forEach(
                        nav => {

                            nav.classList.remove(
                                "active"
                            );

                        }
                    );


                    this.classList.add(
                        "active"
                    );

                }
            );

        }
    );

}


/* =========================================================
   27. VISIBILITY REFRESH
========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        function () {

            if (!document.hidden) {

                loadEvidenceInvestigation(
                    evidenceState.incident
                );

            }

        }
    );

}


/* =========================================================
   28. AUTO REFRESH
========================================================= */

function initializeAutoRefresh() {

    setInterval(
        () => {

            if (
                !document.hidden &&
                evidenceState.incident &&
                !evidenceState.loading
            ) {

                loadEvidenceInvestigation(
                    evidenceState.incident
                );

            }

        },
        30000
    );

}


/* =========================================================
   29. INITIALIZE PAGE
========================================================= */

function initializeEvidencePage() {

    console.log(
        "[CyberTwin] Evidence Investigation initializing..."
    );


    initializeIncidentSelector();

    initializeReevaluation();

    initializeNavigation();

    initializeVisibilityHandler();

    initializeAutoRefresh();

    loadIncidents();


    console.log(
        "[CyberTwin] Evidence Investigation initialized."
    );

}


/* =========================================================
   30. START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeEvidencePage
);