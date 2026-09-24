/* =========================================================
   CYBERTWINX
   INCIDENT TWIN JAVASCRIPT
   API-DRIVEN VERSION
   ========================================================= */


/* =========================================================
   01. CONFIGURATION
   ========================================================= */

const API_BASE_URL =
    "http://localhost:5000/api/incident-twin";


const urlParams =
    new URLSearchParams(window.location.search);

const incidentId =
    urlParams.get("incidentId");


let allIncidents = [];

let currentIncidentId =
    incidentId || null;


/* =========================================================
   02. DOM REFERENCES
   ========================================================= */

const elements = {

    /* Topbar */

    topbarEndpoint:
        document.getElementById("topbarEndpoint"),

    topbarIncident:
        document.getElementById("topbarIncident"),

    topbarState:
        document.getElementById("topbarState"),

    topbarRisk:
        document.getElementById("topbarRisk"),


    /* Overview */

    incidentId:
        document.getElementById("incidentId"),

    incidentType:
        document.getElementById("incidentType"),

    incidentSeverity:
        document.getElementById("incidentSeverity"),

    incidentRisk:
        document.getElementById("incidentRisk"),

    incidentRiskBar:
        document.getElementById("incidentRiskBar"),

    incidentRiskLabel:
        document.getElementById("incidentRiskLabel"),


    /* State */

    incidentState:
        document.getElementById("incidentState"),

    incidentConfidence:
        document.getElementById("incidentConfidence"),

    incidentConfidenceBar:
        document.getElementById("incidentConfidenceBar"),

    incidentLifecycle:
        document.getElementById("incidentLifecycle"),


    /* Evidence */

    incidentEvidence:
        document.getElementById("incidentEvidence"),


    /* Timeline */

    incidentTimeline:
        document.getElementById(
            "incidentTimeline"
        ),


    /* Endpoint */

    linkedEndpoint:
        document.getElementById(
            "linkedEndpoint"
        ),

    linkedEndpointState:
        document.getElementById(
            "linkedEndpointState"
        ),


    /* Incident Selector */

    incidentSelector:
        document.getElementById(
            "incidentSelector"
        ),

    incidentSelectorButton:
        document.getElementById(
            "incidentSelectorButton"
        ),

    incidentSelectorMenu:
        document.getElementById(
            "incidentSelectorMenu"
        ),

    incidentSelectorArrow:
        document.getElementById(
            "incidentSelectorArrow"
        ),

    incidentSearch:
        document.getElementById(
            "incidentSearch"
        ),

    incidentSelectorList:
        document.getElementById(
            "incidentSelectorList"
        ),

    incidentSelectorEmpty:
        document.getElementById(
            "incidentSelectorEmpty"
        ),

    incidentSelectorCount:
        document.getElementById(
            "incidentSelectorCount"
        ),

    selectedIncidentSummary:
        document.getElementById(
            "selectedIncidentSummary"
        )

};


/* =========================================================
   03. SAFE DOM UPDATE
   ========================================================= */

function setText(
    element,
    value
) {

    if (!element) {
        return;
    }

    element.textContent =
        value !== undefined &&
        value !== null &&
        value !== ""
            ? value
            : "—";

}


/* =========================================================
   LIVE PAGE FEEDBACK
   ========================================================= */

function markIncidentLiveUpdate() {

    const targets = [

        elements.topbarSystemStatus,

        elements.topbarEndpoint,

        elements.topbarIncident,

        elements.topbarState,

        elements.topbarRisk,

        elements.incidentState,

        elements.incidentRisk,

        elements.incidentConfidence

    ];


    targets.forEach(
        element => {

            if (!element) {
                return;
            }


            element.classList.remove(
                "live-update-pulse"
            );


            void element.offsetWidth;


            element.classList.add(
                "live-update-pulse"
            );

        }
    );

}


function setIncidentLiveStatus(
    status
) {

    const topbar =
        elements.topbarSystemStatus;


    if (!topbar) {
        return;
    }


    topbar.classList.remove(
        "live",
        "online",
        "loading",
        "offline",
        "error"
    );


    const normalized =
        String(
            status || ""
        ).toUpperCase();


    if (
        normalized === "ONLINE"
    ) {

        topbar.classList.add(
            "live",
            "online"
        );

    }

    else if (
        normalized === "LOADING"
    ) {

        topbar.classList.add(
            "loading"
        );

    }

    else {

        topbar.classList.add(
            "offline",
            "error"
        );

    }

}


function startIncidentLiveHeartbeat() {

    setIncidentLiveStatus(
        "ONLINE"
    );


    window.setInterval(
        () => {

            const topbar =
                elements.topbarSystemStatus;


            if (!topbar) {
                return;
            }


            if (
                topbar.textContent
                    .trim()
                    .toUpperCase() ===
                "ONLINE"
            ) {

                topbar.classList.remove(
                    "live-update-pulse"
                );


                void topbar.offsetWidth;


                topbar.classList.add(
                    "live-update-pulse"
                );

            }

        },
        3000
    );

}


/* =========================================================
   04. FETCH ALL INCIDENTS
   ========================================================= */

async function fetchAllIncidents() {

    const response =
        await fetch(
            API_BASE_URL
        );


    if (!response.ok) {

        throw new Error(
            `Failed to fetch incidents (${response.status})`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "Failed to retrieve incidents"
        );

    }


    return result.data || [];

}


/* =========================================================
   05. FETCH ONE INCIDENT
   ========================================================= */

async function fetchIncident(
    id
) {

    const response =
        await fetch(
            `${API_BASE_URL}/${encodeURIComponent(id)}`
        );


    if (!response.ok) {

        throw new Error(
            `Failed to fetch Incident Twin (${response.status})`
        );

    }


    const result =
        await response.json();


    if (!result.success) {

        throw new Error(
            result.message ||
            "Failed to retrieve Incident Twin"
        );

    }


    return result.data;

}


/* =========================================================
   06. INCIDENT SELECTOR
   ========================================================= */

function formatIncidentDate(
    dateValue
) {

    if (!dateValue) {
        return "Unknown date";
    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unknown date";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatIncidentTime(
    dateValue
) {

    if (!dateValue) {
        return "--:--";
    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "--:--";

    }


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );

}


function getIncidentSearchText(
    incident
) {

    return [

        incident.incidentId,

        incident.incidentType,

        incident.endpointId,

        incident.endpointHostname,

        incident.severity,

        incident.currentState,

        incident.riskLevel,

        incident.currentObjective,

        ...(incident.attackProgression || []),

        ...(incident.evidence || [])
            .map(
                evidence =>
                    `${evidence.type || ""} ${
                        evidence.description || ""
                    }`
            )

    ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

}


function getIncidentDate(
    incident
) {

    return new Date(

        incident.updatedAt ||

        incident.createdAt ||

        0

    );

}


function sortIncidents(
    incidents
) {

    return [
        ...incidents
    ].sort(
        (a, b) =>
            getIncidentDate(b) -
            getIncidentDate(a)
    );

}


function renderIncidentSelector(
    incidents = allIncidents
) {

    if (
        !elements.incidentSelectorList
    ) {

        return;

    }


    const sortedIncidents =
        sortIncidents(
            incidents
        );


    if (
        !sortedIncidents.length
    ) {

        elements.incidentSelectorList.innerHTML =
            "";


        if (
            elements.incidentSelectorEmpty
        ) {

            elements.incidentSelectorEmpty.hidden =
                false;

        }


        return;

    }


    if (
        elements.incidentSelectorEmpty
    ) {

        elements.incidentSelectorEmpty.hidden =
            true;

    }


    elements.incidentSelectorList.innerHTML =
        sortedIncidents.map(
            incident => {

                const severity =
                    String(
                        incident.severity ||
                        "LOW"
                    ).toLowerCase();


                const dateValue =
                    incident.updatedAt ||
                    incident.createdAt;


                const endpoint =
                    incident.endpointHostname ||
                    incident.endpointId ||
                    "Unknown endpoint";


                const type =
                    incident.incidentType ||
                    "Unknown Incident";


                const state =
                    incident.currentState ||
                    "DETECTED";


                const risk =
                    incident.riskScore ??
                    0;


                return `

                    <button
                        type="button"
                        class="incident-selector-item ${
                            incident.incidentId ===
                            currentIncidentId
                                ? "active"
                                : ""
                        }"
                        data-incident-id="${
                            escapeHTML(
                                incident.incidentId ||
                                ""
                            )
                        }"
                    >

                        <div
                            class="incident-selector-item-main"
                        >

                            <span
                                class="incident-selector-item-title"
                            >

                                ${escapeHTML(
                                    type
                                )}

                            </span>


                            <span
                                class="incident-selector-item-meta"
                            >

                                <span>
                                    ${escapeHTML(
                                        endpoint
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        state
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    Risk
                                    ${escapeHTML(
                                        String(risk)
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        formatIncidentDate(
                                            dateValue
                                        )
                                    )}

                                    ${escapeHTML(
                                        formatIncidentTime(
                                            dateValue
                                        )
                                    )}
                                </span>

                            </span>

                        </div>


                        <span
                            class="incident-selector-severity ${severity}"
                        >

                            ${escapeHTML(
                                incident.severity ||
                                "LOW"
                            )}

                        </span>

                    </button>

                `;

            }
        ).join("");


    elements.incidentSelectorList
        .querySelectorAll(
            ".incident-selector-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        selectIncident(
                            item.dataset.incidentId
                        );

                    }
                );

            }
        );

}


function updateSelectedIncident(
    incident
) {

    if (
        !elements.selectedIncidentSummary
    ) {

        return;

    }


    if (!incident) {

        elements.selectedIncidentSummary.textContent =
            "No incident selected";

        return;

    }


    const endpoint =
        incident.endpointHostname ||
        incident.endpointId ||
        "Unknown endpoint";


    elements.selectedIncidentSummary.textContent =
        `${
            incident.incidentType ||
            "Incident"
        } — ${
            endpoint
        } — ${
            incident.severity ||
            "LOW"
        } — Risk ${
            incident.riskScore ??
            0
        }`;

}


async function selectIncident(
    id
) {

    if (!id) {
        return;
    }


    try {

        if (
            elements.selectedIncidentSummary
        ) {

            elements.selectedIncidentSummary.textContent =
                "Loading incident...";

        }


        const incident =
            await fetchIncident(
                id
            );


        currentIncidentId =
            incident.incidentId;


        renderIncidentTwin(
            incident
        );


        updateSelectedIncident(
            incident
        );


        renderIncidentSelector(
            allIncidents
        );


        if (
            elements.incidentSelector
        ) {

            elements.incidentSelector
                .classList
                .remove("open");

        }


        if (
            elements.incidentSelectorMenu
        ) {

            elements.incidentSelectorMenu.hidden =
                true;

        }


        if (
            elements.incidentSelectorButton
        ) {

            elements.incidentSelectorButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        const url =
            new URL(
                window.location.href
            );


        url.searchParams.set(
            "incidentId",
            incident.incidentId
        );


        window.history.replaceState(
            {},
            "",
            url
        );

    }

    catch (error) {

        console.error(
            "[CyberTwinX] Failed to select incident:",
            error
        );


        if (
            elements.selectedIncidentSummary
        ) {

            elements.selectedIncidentSummary.textContent =
                "Unable to load incident";

        }

    }

}


function initializeIncidentSelector() {

    if (
        !elements.incidentSelectorButton ||
        !elements.incidentSelectorMenu
    ) {

        return;

    }


    elements.incidentSelectorButton.addEventListener(
        "click",
        () => {

            const isOpen =
                !elements.incidentSelectorMenu.hidden;


            elements.incidentSelectorMenu.hidden =
                isOpen;


            elements.incidentSelector
                .classList
                .toggle(
                    "open",
                    !isOpen
                );


            elements.incidentSelectorButton.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );


            if (
                !isOpen &&
                elements.incidentSearch
            ) {

                setTimeout(
                    () =>
                        elements.incidentSearch.focus(),
                    50
                );

            }

        }
    );


    if (
        elements.incidentSearch
    ) {

        elements.incidentSearch.addEventListener(
            "input",
            event => {

                const query =
                    event.target.value
                        .trim()
                        .toLowerCase();


                const filtered =
                    query

                        ? allIncidents.filter(
                            incident =>
                                getIncidentSearchText(
                                    incident
                                ).includes(
                                    query
                                )
                        )

                        : allIncidents;


                renderIncidentSelector(
                    filtered
                );

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            if (
                !elements.incidentSelector
            ) {

                return;

            }


            if (
                !elements.incidentSelector.contains(
                    event.target
                )
            ) {

                elements.incidentSelectorMenu.hidden =
                    true;


                elements.incidentSelector
                    .classList
                    .remove("open");


                elements.incidentSelectorButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        }
    );

}


/* =========================================================
   07. LOAD INCIDENT DATA
   ========================================================= */

async function loadIncidentTwin() {

    try {

        allIncidents =
            sortIncidents(
                await fetchAllIncidents()
            );


        if (
            !allIncidents.length
        ) {

            showEmptyState();

            renderIncidentSelector([]);

            return;

        }


        if (
            elements.incidentSelectorCount
        ) {

            elements.incidentSelectorCount.textContent =
                `${
                    allIncidents.length
                } INCIDENT${
                    allIncidents.length === 1
                        ? ""
                        : "S"
                }`;

        }


        let incident =
            currentIncidentId

                ? allIncidents.find(
                    item =>
                        item.incidentId ===
                        currentIncidentId
                )

                : null;


        /*
           If requested incident doesn't exist,
           automatically fall back to newest.
        */

        if (!incident) {

            incident =
                allIncidents[0];


            currentIncidentId =
                incident.incidentId;

        }


        renderIncidentSelector(
            allIncidents
        );


        renderIncidentTwin(
            incident
        );


        updateSelectedIncident(
            incident
        );

    }

    catch (error) {

        console.error(
            "[CyberTwinX] Incident Twin error:",
            error
        );


        showErrorState(
            error.message
        );

    }

}


/* =========================================================
   08. RENDER COMPLETE INCIDENT TWIN
   ========================================================= */

function renderIncidentTwin(
    incident
) {

    if (!incident) {

        showEmptyState();

        return;

    }


    updateTopbar(
        incident
    );


    updateOverview(
        incident
    );


    updateState(
        incident
    );


    renderLifecycle(
        incident.lifecycle
    );


    renderEvidence(
        incident.evidence
    );


    renderTimeline(
        incident.timeline
    );


    updateLinkedEndpoint(
        incident
    );

}


/* =========================================================
   09. UPDATE TOPBAR
   ========================================================= */

function updateTopbar(
    incident
) {

    setText(
        elements.topbarEndpoint,

        incident.endpointHostname ||
        incident.endpointId
    );


    setText(
        elements.topbarIncident,

        incident.incidentId
    );


    setText(
        elements.topbarState,

        incident.currentState
    );


    setText(
        elements.topbarRisk,

        `${incident.riskScore ?? 0} / 100`
    );

}


/* =========================================================
   10. UPDATE OVERVIEW
   ========================================================= */

function updateOverview(
    incident
) {

    setText(
        elements.incidentId,

        incident.incidentId
    );


    setText(
        elements.incidentType,

        incident.incidentType
    );


    setText(
        elements.incidentSeverity,

        incident.severity
    );


    const riskScore =
        Number(
            incident.riskScore
        ) || 0;


    setText(
        elements.incidentRisk,

        `${riskScore} / 100`
    );


    setText(
        elements.incidentRiskLabel,

        `Risk Level: ${
            incident.riskLevel ||
            calculateRiskLevel(
                riskScore
            )
        }`
    );


    if (
        elements.incidentRiskBar
    ) {

        elements.incidentRiskBar.style.width =
            `${Math.min(
                Math.max(
                    riskScore,
                    0
                ),
                100
            )}%`;

    }

}


/* =========================================================
   11. CALCULATE RISK LEVEL
   ========================================================= */

function calculateRiskLevel(
    score
) {

    if (score >= 75) {
        return "CRITICAL";
    }


    if (score >= 60) {
        return "HIGH";
    }


    if (score >= 25) {
        return "MEDIUM";
    }


    return "LOW";

}


/* =========================================================
   12. UPDATE INCIDENT STATE
   ========================================================= */

function updateState(
    incident
) {

    setText(
        elements.incidentState,

        incident.currentState
    );


    const confidence =
        Number(
            incident.confidence
        ) || 0;


    setText(
        elements.incidentConfidence,

        `${confidence}% CONFIDENCE`
    );


    if (
        elements.incidentConfidenceBar
    ) {

        elements.incidentConfidenceBar.style.width =
            `${Math.min(
                Math.max(
                    confidence,
                    0
                ),
                100
            )}%`;

    }

}


/* =========================================================
   13. RENDER LIFECYCLE
   ========================================================= */

function renderLifecycle(
    lifecycle = []
) {

    if (
        !elements.incidentLifecycle
    ) {

        return;

    }


    if (!lifecycle.length) {

        elements.incidentLifecycle.innerHTML = `

            <div class="timeline-item">

                <span class="timeline-time">
                    —
                </span>

                <div class="timeline-marker"></div>

                <div>

                    <strong>
                        No lifecycle data
                    </strong>

                    <p>
                        No incident state transitions
                        are currently available.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    elements.incidentLifecycle.innerHTML =
        lifecycle.map(
            item => {

                const time =
                    formatDate(
                        item.time
                    );


                return `

                    <div class="timeline-item">

                        <span class="timeline-time">
                            ${escapeHTML(time)}
                        </span>

                        <div class="timeline-marker"></div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    item.state
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    item.description ||
                                    ""
                                )}
                            </p>

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   14. RENDER EVIDENCE
   ========================================================= */

function getEvidenceSeverityClass(
    severity
) {

    const normalized =
        String(
            severity ||
            "LOW"
        ).toUpperCase();


    if (
        normalized ===
        "CRITICAL"
    ) {

        return "critical";

    }


    if (
        normalized ===
        "HIGH"
    ) {

        return "high";

    }


    if (
        normalized ===
        "MEDIUM"
    ) {

        return "medium";

    }


    return "low";

}


function getEvidenceStatusClass(
    status
) {

    return String(
        status ||
        ""
    )
        .trim()
        .toLowerCase() ===
        "supporting"

        ? "supporting"

        : "";

}


function renderEvidence(
    evidence = []
) {

    if (
        !elements.incidentEvidence
    ) {

        return;

    }


    if (!evidence.length) {

        elements.incidentEvidence.innerHTML = `

            <article class="dashboard-card">

                <span class="card-label">
                    EVIDENCE
                </span>

                <h4>
                    No evidence available
                </h4>

                <p>
                    No evidence is currently associated
                    with this incident.
                </p>

            </article>

        `;

        return;

    }


    elements.incidentEvidence.innerHTML =
        evidence.map(
            item => {

                const telemetryId =
                    item.telemetryId ||
                    null;


                const telemetryDisplay =
                    telemetryId
                        ? telemetryId
                        : "Not linked";


                return `

                    <article class="dashboard-card">

                        <span class="card-label">
                            ${escapeHTML(
                                item.evidenceId ||
                                "EVIDENCE"
                            )}
                        </span>


                        <h4>
                            ${escapeHTML(
                                item.type ||
                                "Unknown Evidence"
                            )}
                        </h4>


                        <p>
                            ${escapeHTML(
                                item.description ||
                                ""
                            )}
                        </p>


                        <span
                            class="severity-badge evidence-${getEvidenceSeverityClass(
                                item.severity
                            )}"
                        >

                            ${escapeHTML(
                                item.severity ||
                                "LOW"
                            )}

                        </span>


                        <p>

                            STATUS:

                            <strong
                                class="evidence-status ${getEvidenceStatusClass(
                                    item.status
                                )}"
                            >

                                ${escapeHTML(
                                    item.status ||
                                    "UNKNOWN"
                                )}

                            </strong>

                        </p>


                        <p class="evidence-telemetry">

                            TELEMETRY ID:

                            <strong>
                                ${escapeHTML(
                                    telemetryDisplay
                                )}
                            </strong>

                        </p>

                    </article>

                `;

            }
        ).join("");

}


/* =========================================================
   15. RENDER TIMELINE
   ========================================================= */

function renderTimeline(
    timeline = []
) {

    if (
        !elements.incidentTimeline
    ) {

        return;

    }


    if (
        !Array.isArray(timeline) ||
        !timeline.length
    ) {

        elements.incidentTimeline.innerHTML = `

            <div class="timeline-item">

                <span class="timeline-time">
                    —
                </span>

                <div class="timeline-marker"></div>

                <div>

                    <strong>
                        No timeline events
                    </strong>

                    <p>
                        No incident events are currently available.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    const orderedTimeline =
        [...timeline]

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


    if (
        !orderedTimeline.length
    ) {

        elements.incidentTimeline.innerHTML = `

            <div class="timeline-item">

                <span class="timeline-time">
                    —
                </span>

                <div class="timeline-marker"></div>

                <div>

                    <strong>
                        No valid timeline events
                    </strong>

                    <p>
                        Timeline events do not contain valid timestamps.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    elements.incidentTimeline.innerHTML =
        orderedTimeline.map(
            event => {

                const date =
                    new Date(
                        event.time
                    );


                const fullDate =
                    date.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    );


                const time =
                    date.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false
                        }
                    );


                return `

                    <div class="timeline-item">

                        <span class="timeline-time">

                            ${escapeHTML(
                                fullDate
                            )}

                            <br>

                            <strong>
                                ${escapeHTML(
                                    time
                                )}
                            </strong>

                        </span>


                        <div class="timeline-marker"></div>


                        <div>

                            <strong>
                                ${escapeHTML(
                                    event.title ||
                                    "Incident Event"
                                )}
                            </strong>


                            <p>
                                ${escapeHTML(
                                    event.description ||
                                    ""
                                )}
                            </p>

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   16. UPDATE LINKED ENDPOINT
   ========================================================= */

function updateLinkedEndpoint(
    incident
) {

    setText(

        elements.linkedEndpoint,

        incident.endpointHostname ||
        incident.endpointId

    );


    setText(

        elements.linkedEndpointState,

        incident.endpointState

    );

}


/* =========================================================
   17. FORMAT DATE
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "—";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString();

}


/* =========================================================
   18. ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* =========================================================
   19. EMPTY STATE
   ========================================================= */

function showEmptyState() {

    setText(
        elements.topbarEndpoint,
        "—"
    );


    setText(
        elements.topbarIncident,
        "NO INCIDENT"
    );


    setText(
        elements.topbarState,
        "—"
    );


    setText(
        elements.topbarRisk,
        "0 / 100"
    );


    setText(
        elements.incidentId,
        "—"
    );


    setText(
        elements.incidentType,
        "No Incident Twin"
    );


    setText(
        elements.incidentSeverity,
        "—"
    );


    setText(
        elements.incidentRisk,
        "0 / 100"
    );


    setText(
        elements.incidentRiskLabel,
        "Risk Level: —"
    );


    setText(
        elements.incidentState,
        "—"
    );


    setText(
        elements.incidentConfidence,
        "0% CONFIDENCE"
    );


    if (
        elements.incidentRiskBar
    ) {

        elements.incidentRiskBar.style.width =
            "0%";

    }


    if (
        elements.incidentConfidenceBar
    ) {

        elements.incidentConfidenceBar.style.width =
            "0%";

    }


    if (
        elements.selectedIncidentSummary
    ) {

        elements.selectedIncidentSummary.textContent =
            "No incident selected";

    }


    if (
        elements.incidentTimeline
    ) {

        elements.incidentTimeline.innerHTML = `

            <div class="timeline-item">

                <span class="timeline-time">
                    —
                </span>

                <div class="timeline-marker"></div>

                <div>

                    <strong>
                        No incident data
                    </strong>

                    <p>
                        Create an Incident Twin in MongoDB to populate the timeline.
                    </p>

                </div>

            </div>

        `;

    }


    if (
        elements.incidentEvidence
    ) {

        elements.incidentEvidence.innerHTML = `

            <article class="dashboard-card">

                <span class="card-label">
                    EVIDENCE
                </span>

                <h4>
                    No incident data
                </h4>

                <p>
                    Create an Incident Twin in MongoDB
                    to display evidence.
                </p>

            </article>

        `;

    }

}


/* =========================================================
   20. ERROR STATE
   ========================================================= */

function showErrorState(
    message
) {

    console.error(
        "[CyberTwinX] API Error:",
        message
    );


    setText(
        elements.topbarIncident,
        "API ERROR"
    );


    setText(
        elements.topbarState,
        "UNAVAILABLE"
    );


    if (
        elements.selectedIncidentSummary
    ) {

        elements.selectedIncidentSummary.textContent =
            "Unable to load incidents";

    }


    if (
        elements.incidentTimeline
    ) {

        elements.incidentTimeline.innerHTML = `

            <div class="timeline-item">

                <span class="timeline-time">
                    —
                </span>

                <div class="timeline-marker"></div>

                <div>

                    <strong>
                        Timeline unavailable
                    </strong>

                    <p>
                        Unable to retrieve incident timeline data.
                    </p>

                </div>

            </div>

        `;

    }


    if (
        elements.incidentEvidence
    ) {

        elements.incidentEvidence.innerHTML = `

            <article class="dashboard-card">

                <span class="card-label">
                    INCIDENT TWIN
                </span>

                <h4>
                    Unable to load incident
                </h4>

                <p>
                    ${escapeHTML(
                        message
                    )}
                </p>

            </article>

        `;

    }

}


/* =========================================================
   21. PAGE VISIBILITY
   ========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                !document.hidden
            ) {

                loadIncidentTwin();

            }

        }
    );

}


/* =========================================================
   22. INITIALIZE
   ========================================================= */

async function initializeIncidentTwin() {

    console.log(
        "[CyberTwinX] Incident Twin initializing..."
    );


    await loadIncidentTwin();


    initializeIncidentSelector();


    initializeVisibilityHandler();


    startIncidentLiveHeartbeat();


    console.log(
        "[CyberTwinX] Incident Twin initialized."
    );

}


/* =========================================================
   23. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeIncidentTwin
);