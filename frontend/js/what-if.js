/* =========================================================
   CYBERTWINX
   WHAT-IF / COUNTERFACTUAL ANALYSIS
========================================================= */

const WHAT_IF_API = "http://localhost:5000/api/what-if";


/* =========================================================
   STATE
========================================================= */

const whatIfState = {
    context: null,
    selectedAttack: null,
    selectedResponse: null,
    simulation: null,
    loading: false,
    simulating: false
};


/* =========================================================
   DOM ELEMENTS
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


    contextIncidentId:
        document.getElementById("contextIncidentId"),

    contextIncidentType:
        document.getElementById("contextIncidentType"),

    contextEndpoint:
        document.getElementById("contextEndpoint"),

    contextSecurityState:
        document.getElementById("contextSecurityState"),

    contextRisk:
        document.getElementById("contextRisk"),

    contextConfidence:
        document.getElementById("contextConfidence"),


    observedAttackList:
        document.getElementById("observedAttackList"),


    selectedAttackTitle:
        document.getElementById("selectedAttackTitle"),

    selectedAttackSeverity:
        document.getElementById("selectedAttackSeverity"),

    selectedAttackCount:
        document.getElementById("selectedAttackCount"),

    selectedAttackConfidence:
        document.getElementById("selectedAttackConfidence"),

    selectedAttackEvidenceStatus:
        document.getElementById(
            "selectedAttackEvidenceStatus"
        ),

    selectedAttackDescription:
        document.getElementById(
            "selectedAttackDescription"
        ),


    whatIfEvidenceList:
        document.getElementById(
            "whatIfEvidenceList"
        ),


    responseScenarioGrid:
        document.getElementById(
            "responseScenarioGrid"
        ),

    responseLimit:
        document.getElementById(
            "responseLimit"
        ),

    selectedResponseName:
        document.getElementById(
            "selectedResponseName"
        ),

    simulateScenario:
        document.getElementById(
            "simulateScenario"
        ),


    simulationResultSubtitle:
        document.getElementById(
            "simulationResultSubtitle"
        ),

    simulationCalculatedBadge:
        document.getElementById(
            "simulationCalculatedBadge"
        ),

    actualPathList:
        document.getElementById(
            "actualPathList"
        ),

    whatIfPathList:
        document.getElementById(
            "whatIfPathList"
        ),

    modeledPathTitle:
        document.getElementById(
            "modeledPathTitle"
        ),

    simulationImpact:
        document.getElementById(
            "simulationImpact"
        ),


    currentRiskKpi:
        document.getElementById(
            "currentRiskKpi"
        ),

    simulatedRiskKpi:
        document.getElementById(
            "simulatedRiskKpi"
        ),

    riskReductionKpi:
        document.getElementById(
            "riskReductionKpi"
        ),

    attackPathsKpi:
        document.getElementById(
            "attackPathsKpi"
        ),

    securityStateKpi:
        document.getElementById(
            "securityStateKpi"
        ),


    modelReadingPrimary:
        document.getElementById(
            "modelReadingPrimary"
        ),

    modelReadingRemain:
        document.getElementById(
            "modelReadingRemain"
        ),


    approvalResponseName:
        document.getElementById(
            "approvalResponseName"
        ),

    approvalExplanation:
        document.getElementById(
            "approvalExplanation"
        ),

    approvalStatus:
        document.getElementById(
            "approvalStatus"
        ),

    approveResponse:
        document.getElementById(
            "approveResponse"
        ),

    rejectResponse:
        document.getElementById(
            "rejectResponse"
        ),

    decisionRecorded:
        document.getElementById(
            "decisionRecorded"
        ),


    whatIfStateMessage:
        document.getElementById(
            "whatIfStateMessage"
        ),

    stateMessageTitle:
        document.getElementById(
            "stateMessageTitle"
        ),

    stateMessageText:
        document.getElementById(
            "stateMessageText"
        ),

    retryWhatIf:
        document.getElementById(
            "retryWhatIf"
        ),

    incidentSelector:
        document.getElementById(
            "incidentSelector"
        )
};


/* =========================================================
   HELPERS
========================================================= */

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "--"
            : String(value);
}


function safeNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function formatLabel(value) {

    return String(value || "")
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );
}


function formatNodeName(node) {

    const value =
        typeof node === "object"
            ? (
                node?.label ||
                node?.name ||
                node?.type ||
                ""
            )
            : String(node || "");

    return value
        .replace(
            /^Endpoint:\s*/i,
            ""
        )
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim() ||
        "Unknown";
}


/* =========================================================
   API
========================================================= */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                ...options,

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );


    let payload = null;

    try {

        payload =
            await response.json();

    } catch {

        payload = null;
    }


    if (!response.ok) {

        throw new Error(
            payload?.message ||
            `Request failed with status ${response.status}`
        );
    }


    if (
        payload &&
        payload.success === false
    ) {

        throw new Error(
            payload.message ||
            "CyberTwinX API request failed."
        );
    }


    return payload;
}


/* =========================================================
   INCIDENT ID
========================================================= */

function getIncidentId(
    explicitIncidentId = null
) {

    if (explicitIncidentId) {
        return explicitIncidentId;
    }

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    return (
        urlParams.get("incidentId") ||

        whatIfState.context
            ?.incident
            ?.incidentId
    );
}


/* =========================================================
   LOAD CONTEXT
========================================================= */

/* =========================================================
   LOAD INCIDENT LIST
   ========================================================= */

async function loadIncidentList() {

    if (!elements.incidentSelector) {

        return;

    }


    try {

        elements.incidentSelector.innerHTML = `
            <option value="">
                Loading incidents...
            </option>
        `;


        const payload =
            await apiRequest(
                `${WHAT_IF_API}/incidents`
            );


        const incidents =
            Array.isArray(
                payload?.data
            )
                ? payload.data
                : [];


        elements.incidentSelector.innerHTML = "";


        if (!incidents.length) {

            elements.incidentSelector.innerHTML = `
                <option value="">
                    No incidents available
                </option>
            `;

            return;

        }


        incidents.forEach(
            incident => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    incident.incidentId;


                option.textContent =
                    `${incident.incidentId} — ${formatLabel(
                        incident.incidentType
                    )}`;


                elements.incidentSelector.appendChild(
                    option
                );

            }
        );


        const currentIncidentId =
            whatIfState.context
                ?.incident
                ?.incidentId;


        const urlIncidentId =
            new URLSearchParams(
                window.location.search
            ).get(
                "incidentId"
            );


        const selectedIncidentId =
            urlIncidentId ||
            currentIncidentId ||
            incidents[0]?.incidentId;


        if (selectedIncidentId) {

            elements.incidentSelector.value =
                selectedIncidentId;

        }

    }

    catch (error) {

        console.error(
            "[CyberTwin] Failed to load incident list:",
            error
        );


        elements.incidentSelector.innerHTML = `
            <option value="">
                Unable to load incidents
            </option>
        `;

    }

}

async function loadWhatIfContext(
    attackType = null,
    incidentId = null
) {

    whatIfState.loading = true;

    hideStateMessage();


    try {

        const params =
            new URLSearchParams();


        const resolvedIncidentId =
            getIncidentId(
                incidentId
            );


        if (!resolvedIncidentId) {

            throw new Error(
                "No Incident ID was supplied."
            );
        }


        params.set(
            "incidentId",
            resolvedIncidentId
        );


        if (
            attackType &&
            attackType !== "ALL"
        ) {

            params.set(
                "attackType",
                attackType
            );
        }


        const payload =
            await apiRequest(
                `${WHAT_IF_API}?${params.toString()}`
            );


        const context =
            payload?.data;


        if (!context) {

            throw new Error(
                "What-If context is empty."
            );
        }


        whatIfState.context =
            context;


        whatIfState.selectedAttack =
            context.selectedAttack ||
            attackType ||
            null;


        whatIfState.selectedResponse =
            null;


        whatIfState.simulation =
            null;


        updatePageFromContext();


        if (
            context.incident?.incidentId
        ) {

            const url =
                new URL(
                    window.location.href
                );


            url.searchParams.set(
                "incidentId",
                context.incident.incidentId
            );


            if (
                whatIfState.selectedAttack &&
                whatIfState.selectedAttack !== "ALL"
            ) {

                url.searchParams.set(
                    "attackType",
                    whatIfState.selectedAttack
                );

            } else {

                url.searchParams.delete(
                    "attackType"
                );

            }


            window.history.replaceState(
                {},
                "",
                url
            );


            if (elements.incidentSelector) {

                elements.incidentSelector.value =
                    context.incident.incidentId;

            }

        }

    } catch (error) {

        console.error(
            "[CyberTwin] What-If context failed:",
            error
        );


        showStateMessage(
            "Unable to load What-If analysis",
            error.message
        );

    } finally {

        whatIfState.loading = false;
    }
}


/* =========================================================
   PAGE UPDATE
========================================================= */

function updatePageFromContext() {

    const context =
        whatIfState.context;


    if (!context) {
        return;
    }


    updateTopbar(
        context
    );


    updateIncidentContext(
        context
    );


    renderObservedAttacks(
        context
    );


    renderSelectedAttack(
        context
    );


    renderEvidence(
        context
    );


    renderResponseScenarios(
        context
    );


    renderActualPath(
        context
    );


    resetSimulation();
}


/* =========================================================
   TOPBAR
========================================================= */

function updateTopbar(
    context
) {

    const endpoint =
        context.endpoint || {};

    const incident =
        context.incident || {};

    const actual =
        context.actual || {};


    const systemStatus =
        endpoint.status ||
        "UNKNOWN";


    setText(
        elements.topbarEndpoint,
        endpoint.hostname ||
        endpoint.endpointId ||
        "Unknown"
    );


    setText(
        elements.topbarIncident,
        incident.incidentId
    );


    setText(
        elements.topbarState,
        actual.securityState ||
        endpoint.securityState ||
        incident.currentState ||
        "UNKNOWN"
    );


    setText(
        elements.topbarRisk,
        actual.riskScore ??
        endpoint.riskScore ??
        incident.riskScore ??
        0
    );


    setText(
        elements.topbarSystemStatus,
        systemStatus
    );


    setText(
        elements.sidebarSystemStatus,
        `SYSTEM ${systemStatus}`
    );
}


/* =========================================================
   INCIDENT CONTEXT
========================================================= */

function updateIncidentContext(
    context
) {

    const incident =
        context.incident || {};

    const endpoint =
        context.endpoint || {};

    const actual =
        context.actual || {};


    setText(
        elements.contextIncidentId,
        incident.incidentId
    );


    setText(
        elements.contextIncidentType,
        incident.incidentType
    );


    setText(
        elements.contextEndpoint,
        endpoint.hostname ||
        endpoint.endpointId
    );


    setText(
        elements.contextSecurityState,
        actual.securityState ||
        endpoint.securityState ||
        incident.currentState
    );


    setText(
        elements.contextRisk,
        `${safeNumber(
            actual.riskScore ??
            endpoint.riskScore ??
            incident.riskScore
        )}/100`
    );


    setText(
        elements.contextConfidence,
        `${safeNumber(
            endpoint.evidenceConfidence ??
            incident.confidence
        )}%`
    );
}


/* =========================================================
   OBSERVED ATTACKS
========================================================= */

function getObservedAttacks(
    context
) {

    const observed =
        Array.isArray(
            context?.observedAttacks
        )
            ? context.observedAttacks
            : (
                Array.isArray(
                    context?.incident
                        ?.observedAttacks
                )
                    ? context.incident
                        .observedAttacks
                    : []
            );


    return observed.filter(
        attack => {

            const normalized =
                normalize(attack);

            return (
                normalized &&
                !normalized.startsWith(
                    "endpoint"
                )
            );
        }
    );
}


function renderObservedAttacks(
    context
) {

    const container =
        elements.observedAttackList;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const attacks =
        getObservedAttacks(
            context
        );


    if (!attacks.length) {

        container.innerHTML =
            `
            <div class="whatif-empty">
                No observed attack stages are available.
            </div>
            `;

        return;
    }


    attacks.forEach(
        (
            attack,
            index
        ) => {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "observed-attack-item";


            if (
                normalize(attack) ===
                normalize(
                    whatIfState.selectedAttack
                )
            ) {

                item.classList.add(
                    "selected"
                );
            }


            item.innerHTML = `
                <span class="observed-attack-order">
                    STAGE ${index + 1}
                </span>

                <span class="observed-attack-name">
                    ${escapeHtml(
                        formatLabel(attack)
                    )}
                </span>

                <span class="observed-attack-meta">
                    Observed in Incident Twin
                </span>
            `;


            item.addEventListener(
                "click",
                () =>
                    handleAttackSelection(
                        attack
                    )
            );


            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   ATTACK SELECTION
========================================================= */

async function handleAttackSelection(
    attack
) {

    if (!attack) {
        return;
    }


    whatIfState.selectedAttack =
        attack;


    whatIfState.selectedResponse =
        null;


    whatIfState.simulation =
        null;


    await loadWhatIfContext(
        attack
    );
}


/* =========================================================
   SELECTED ATTACK
========================================================= */

function findSelectedFinding(
    context
) {

    const findings =
        Array.isArray(
            context?.actual?.findings
        )
            ? context.actual.findings
            : [];


    if (!whatIfState.selectedAttack) {
        return null;
    }


    return findings.find(
        finding =>
            normalize(
                finding.type
            ) ===
            normalize(
                whatIfState.selectedAttack
            )
    ) || null;
}


function renderSelectedAttack(
    context
) {

    const finding =
        findSelectedFinding(
            context
        );


    const incident =
        context.incident || {};


    setText(
        elements.selectedAttackTitle,
        whatIfState.selectedAttack
            ? formatLabel(
                whatIfState.selectedAttack
            )
            : "Select an observed attack"
    );


    if (finding) {

        setText(
            elements.selectedAttackSeverity,
            finding.severity
        );


        setText(
            elements.selectedAttackCount,
            finding.count
        );


        setText(
            elements.selectedAttackConfidence,
            `${safeNumber(
                incident.confidence
            )}%`
        );


        setText(
            elements.selectedAttackEvidenceStatus,
            "SUPPORTING"
        );


        setText(
            elements.selectedAttackDescription,
            finding.description ||
            "Observed activity associated with this incident."
        );

    } else {

        setText(
            elements.selectedAttackSeverity,
            "--"
        );


        setText(
            elements.selectedAttackCount,
            "--"
        );


        setText(
            elements.selectedAttackConfidence,
            `${safeNumber(
                incident.confidence
            )}%`
        );


        setText(
            elements.selectedAttackEvidenceStatus,
            "--"
        );


        setText(
            elements.selectedAttackDescription,
            "No direct finding was returned for this selected stage."
        );
    }
}


/* =========================================================
   EVIDENCE
========================================================= */

function getEvidenceForAttack(
    context
) {

    const evidence =
        Array.isArray(
            context?.incident?.evidence
        )
            ? context.incident.evidence
            : [];


    if (!whatIfState.selectedAttack) {
        return [];
    }


    const selected =
        normalize(
            whatIfState.selectedAttack
        );


    return evidence.filter(
        item => {

            const searchable = [
                item?.type,
                item?.category,
                item?.description
            ]
                .filter(Boolean)
                .map(normalize)
                .join(" ");


            return searchable.includes(
                selected
            );
        }
    );
}


function renderEvidence(
    context
) {

    const container =
        elements.whatIfEvidenceList;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const evidence =
        getEvidenceForAttack(
            context
        );


    if (!evidence.length) {

        /*
         * Current Incident Twin may expose
         * findings without individual evidence
         * records. Show the finding itself rather
         * than inventing evidence.
         */

        const finding =
            findSelectedFinding(
                context
            );


        if (!finding) {

            container.innerHTML =
                `
                <div class="whatif-empty">
                    No supporting evidence is available.
                </div>
                `;

            return;
        }


        const item =
            createEvidenceItem({
                type: finding.type,
                category: finding.severity,
                description:
                    finding.description,
                status: "SUPPORTING"
            });


        container.appendChild(
            item
        );

        return;
    }


    evidence.forEach(
        item => {

            container.appendChild(
                createEvidenceItem(
                    item
                )
            );
        }
    );
}


function createEvidenceItem(
    evidence
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "evidence-context-item";


    item.innerHTML = `
        <span class="evidence-context-dot"></span>

        <div class="evidence-context-main">

            <strong>
                ${escapeHtml(
                    formatLabel(
                        evidence.type ||
                        evidence.category ||
                        "Evidence"
                    )
                )}
            </strong>

            <p>
                ${escapeHtml(
                    evidence.description ||
                    "Supporting evidence associated with the selected finding."
                )}
            </p>

        </div>

        <span class="evidence-context-type">
            ${escapeHtml(
                evidence.status ||
                evidence.severity ||
                "SUPPORTING"
            )}
        </span>
    `;


    return item;
}


/* =========================================================
   RESPONSE SCENARIOS
========================================================= */

function getResponseScenarios(
    context
) {

    /*
     * New backend contract:
     *
     * context.responseScenarios
     *
     * Each scenario contains:
     *
     * action
     * name
     * status
     * reason
     * expectedEffect
     * duration
     * disruption
     * reversibility
     */

    if (
        Array.isArray(
            context?.responseScenarios
        )
    ) {

        return context.responseScenarios;
    }


    /*
     * Temporary compatibility with the
     * existing backend while the new service
     * is being implemented.
     */

    if (
        Array.isArray(
            context?.recommendations
        )
    ) {

        return context.recommendations.map(
            recommendation => ({
                action:
                    recommendation.action,

                name:
                    recommendation.name ||
                    formatLabel(
                        recommendation.action
                    ),

                status:
                    "SUPPORTED",

                reason:
                    recommendation.reason,

                expectedEffect:
                    recommendation.expectedEffect,

                duration:
                    recommendation.duration,

                disruption:
                    recommendation.disruption,

                reversibility:
                    recommendation.reversibility
            })
        );
    }


    return [];
}


function renderResponseScenarios(
    context
) {

    const container =
        elements.responseScenarioGrid;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const scenarios =
        getResponseScenarios(
            context
        );


    if (!scenarios.length) {

        container.innerHTML =
            `
            <div class="whatif-empty">
                No response scenarios are currently modeled for this observed attack.
            </div>
            `;

        updateResponseSelectionUI();

        return;
    }


    scenarios.forEach(
        scenario => {

            container.appendChild(
                createResponseCard(
                    scenario
                )
            );
        }
    );


    updateResponseSelectionUI();
}


function getScenarioStatus(
    scenario
) {

    return String(
        scenario?.status ||
        "NOT_APPLICABLE"
    )
        .trim()
        .toUpperCase();
}


function createResponseCard(
    scenario
) {

    const card =
        document.createElement(
            "article"
        );


    const status =
        getScenarioStatus(
            scenario
        );


    const supported =
        status === "SUPPORTED";


    const selected =
        whatIfState.selectedResponse ===
        scenario.action;


    card.className =
        "response-scenario-card";


    if (!supported) {

        card.classList.add(
            "disabled"
        );
    }


    if (selected) {

        card.classList.add(
            "selected"
        );
    }


    const statusClass =
        status === "SUPPORTED"
            ? "supported"
            : status === "INSUFFICIENT_EVIDENCE"
                ? "insufficient"
                : "unavailable";


    const statusLabel =
        status === "SUPPORTED"
            ? "SUPPORTED"
            : status === "INSUFFICIENT_EVIDENCE"
                ? "INSUFFICIENT EVIDENCE"
                : "NOT APPLICABLE";


    card.innerHTML = `
        <div class="response-scenario-top">

            <div class="response-scenario-icon">
                ${getResponseIcon(
                    scenario.action
                )}
            </div>

            <span class="response-scenario-status ${statusClass}">
                ${statusLabel}
            </span>

        </div>

        <h4>
            ${escapeHtml(
                scenario.name ||
                formatLabel(
                    scenario.action
                )
            )}
        </h4>

        <p>
            ${escapeHtml(
                scenario.reason ||
                "No explanation was returned."
            )}
        </p>

        <div class="response-scenario-meta">

            ${
                scenario.duration
                    ? `
                        <span class="response-meta-tag">
                            ${escapeHtml(
                                scenario.duration
                            )}
                        </span>
                    `
                    : ""
            }

            ${
                scenario.disruption
                    ? `
                        <span class="response-meta-tag">
                            ${escapeHtml(
                                formatLabel(
                                    scenario.disruption
                                )
                            )} impact
                        </span>
                    `
                    : ""
            }

            ${
                scenario.reversibility
                    ? `
                        <span class="response-meta-tag">
                            ${escapeHtml(
                                formatLabel(
                                    scenario.reversibility
                                )
                            )} reversibility
                        </span>
                    `
                    : ""
            }

        </div>
    `;


    if (supported) {

        card.addEventListener(
            "click",
            () =>
                selectResponse(
                    scenario.action
                )
        );
    }


    return card;
}


/* =========================================================
   RESPONSE ICON
========================================================= */

function getResponseIcon(
    action
) {

    const normalized =
        normalize(action);


    if (
        normalized.includes(
            "isolate"
        )
    ) {

        return "◈";
    }


    if (
        normalized.includes(
            "disable"
        )
    ) {

        return "⊘";
    }


    if (
        normalized.includes(
            "block"
        )
    ) {

        return "◉";
    }


    if (
        normalized.includes(
            "terminate"
        )
    ) {

        return "×";
    }


    return "◆";
}


/* =========================================================
   RESPONSE SELECTION
========================================================= */

function selectResponse(
    action
) {

    if (!action) {
        return;
    }


    const scenarios =
        getResponseScenarios(
            whatIfState.context
        );


    const scenario =
        scenarios.find(
            item =>
                item.action === action
        );


    if (!scenario) {
        return;
    }


    if (
        getScenarioStatus(
            scenario
        ) !== "SUPPORTED"
    ) {

        return;
    }


    whatIfState.selectedResponse =
        action;


    whatIfState.simulation =
        null;


    updateResponseCards();

    updateResponseSelectionUI();

    resetSimulation();
}


function updateResponseCards() {

    const cards =
        document.querySelectorAll(
            ".response-scenario-card"
        );


    cards.forEach(
        card => {

            card.classList.toggle(
                "selected",
                card.querySelector(
                    "h4"
                ) &&
                normalize(
                    card.querySelector(
                        "h4"
                    ).textContent
                ) ===
                normalize(
                    getSelectedResponseName()
                )
            );
        }
    );
}


function getSelectedResponseName() {

    if (
        !whatIfState.selectedResponse
    ) {

        return "";
    }


    const scenarios =
        getResponseScenarios(
            whatIfState.context
        );


    const scenario =
        scenarios.find(
            item =>
                item.action ===
                whatIfState.selectedResponse
        );


    return (
        scenario?.name ||
        formatLabel(
            whatIfState.selectedResponse
        )
    );
}


function updateResponseSelectionUI() {

    const name =
        getSelectedResponseName();


    setText(
        elements.selectedResponseName,
        name || "None"
    );


    if (elements.responseLimit) {

        elements.responseLimit.textContent =
            name
                ? "1 RESPONSE SELECTED"
                : "SELECT ONE";
    }


    if (elements.simulateScenario) {

        elements.simulateScenario.disabled =
            !whatIfState.selectedResponse ||
            whatIfState.simulating;
    }
}


/* =========================================================
   ACTUAL PATH
========================================================= */

function extractPathNodes(
    source
) {

    if (!source) {
        return [];
    }


    if (
        Array.isArray(
            source.paths
        ) &&
        source.paths.length
    ) {

        const path =
            source.paths[0];


        if (
            Array.isArray(
                path.stages
            )
        ) {

            return path.stages.map(
                stage =>
                    formatNodeName(
                        stage
                    )
            );
        }


        if (
            Array.isArray(
                path.nodes
            )
        ) {

            return path.nodes.map(
                node =>
                    formatNodeName(
                        node
                    )
            );
        }
    }


    if (
        Array.isArray(
            source.attackProgression
        )
    ) {

        return source.attackProgression.map(
            node =>
                formatNodeName(
                    node
                )
        );
    }


    return [];
}


function renderActualPath(
    context
) {

    const nodes =
        extractPathNodes(
            context.actual ||
            {}
        );


    renderPathList(
        elements.actualPathList,
        nodes,
        "No observed attack path is available."
    );
}


function renderPathList(
    container,
    nodes,
    emptyText
) {

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(nodes) ||
        !nodes.length
    ) {

        const empty =
            document.createElement(
                "li"
            );


        empty.className =
            "path-empty";


        empty.textContent =
            emptyText;


        container.appendChild(
            empty
        );


        return;
    }


    nodes.forEach(
        (
            node,
            index
        ) => {

            const item =
                document.createElement(
                    "li"
                );


            item.textContent =
                `${index + 1}. ${node}`;


            container.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   SIMULATION
========================================================= */

async function runSimulation() {

    if (
        !whatIfState.selectedResponse ||
        !whatIfState.context ||
        whatIfState.simulating
    ) {

        return;
    }


    whatIfState.simulating =
        true;


    updateResponseSelectionUI();


    if (elements.simulateScenario) {

        elements.simulateScenario.textContent =
            "Simulating...";
    }


    hideStateMessage();


    try {

        const incidentId =
            getIncidentId();


        const payload =
            await apiRequest(
                `${WHAT_IF_API}/simulate`,
                {
                    method: "POST",

                    body:
                        JSON.stringify({

                            incidentId,

                            endpointId:
                                whatIfState
                                    .context
                                    ?.endpoint
                                    ?.endpointId,

                            attackType:
                                whatIfState
                                    .selectedAttack,

                            action:
                                whatIfState
                                    .selectedResponse
                        })
                }
            );


        const result =
            payload?.data;


        if (!result) {

            throw new Error(
                "Simulation response is empty."
            );
        }


        whatIfState.simulation =
            result;


        renderSimulation(
            result
        );


    } catch (error) {

        console.error(
            "[CyberTwin] What-If simulation failed:",
            error
        );


        showStateMessage(
            "Simulation failed",
            error.message
        );

    } finally {

        whatIfState.simulating =
            false;


        if (elements.simulateScenario) {

            elements.simulateScenario.textContent =
                "Run Simulation";
        }


        updateResponseSelectionUI();
    }
}


/* =========================================================
   SIMULATION RENDERING
========================================================= */

function renderSimulation(
    result
) {

    const actual =
        result.actual ||
        whatIfState.context?.actual ||
        {};


    const simulation =
        result.simulation ||
        {};


    renderActualPath({
        actual
    });


    renderModeledPath(
        simulation
    );


    updateSimulationKpis(
        actual,
        simulation
    );


    updateModelReading(
        result,
        simulation
    );


    updateApproval(
        result,
        simulation
    );


    const currentRisk =
        safeNumber(
            actual.riskScore
        );


    const selectedAttack =
        whatIfState.selectedAttack
            ? ` · ${formatLabel(
                whatIfState.selectedAttack
            )}`
            : "";


    setText(
        elements.simulationResultSubtitle,
        `Model output against current risk ${currentRisk}/100${selectedAttack}`
    );


    if (
        elements.simulationCalculatedBadge
    ) {

        elements.simulationCalculatedBadge.hidden =
            false;
    }


    setText(
        elements.simulationImpact,
        result.impact ||
        simulation.impact ||
        result.explanation?.progression ||
        "Counterfactual simulation completed. No real endpoint action was taken."
    );
}


/* =========================================================
   MODELED PATH
========================================================= */

function renderModeledPath(
    simulation
) {

    const responseName =
        getSelectedResponseName();


    setText(
        elements.modeledPathTitle,
        responseName
            ? responseName.toUpperCase()
            : "WHAT-IF"
    );


    renderPathList(
        elements.whatIfPathList,
        extractPathNodes(
            simulation
        ),
        "No modeled path was returned."
    );
}


/* =========================================================
   KPIs
========================================================= */

function updateSimulationKpis(
    actual,
    simulation
) {

    const currentRisk =
        safeNumber(
            actual.riskScore
        );


    const simulatedRisk =
        safeNumber(
            simulation.riskScore
        );


    const riskChange =
        simulatedRisk -
        currentRisk;


    setText(
        elements.currentRiskKpi,
        `${currentRisk}/100`
    );


    setText(
        elements.simulatedRiskKpi,
        `${simulatedRisk}/100`
    );


    if (
        riskChange < 0
    ) {

        setText(
            elements.riskReductionKpi,
            `${riskChange}`
        );

    } else if (
        riskChange > 0
    ) {

        setText(
            elements.riskReductionKpi,
            `+${riskChange}`
        );

    } else {

        setText(
            elements.riskReductionKpi,
            "0"
        );
    }


    setText(
        elements.attackPathsKpi,
        `${safeNumber(
            actual.attackPaths
        )} → ${safeNumber(
            simulation.attackPaths
        )}`
    );


    setText(
        elements.securityStateKpi,
        `${actual.securityState || "--"} → ${
            simulation.securityState || "--"
        }`
    );
}


/* =========================================================
   MODEL READING
========================================================= */

function updateModelReading(
    result,
    simulation
) {

    const primary =
        result?.explanation?.progression ||

        result?.impact ||

        simulation?.impact ||

        result?.verdict?.recommendation ||

        simulation?.explanation?.progression ||

        "The selected response was modeled against the current incident state.";


    const remain =
        result?.explanation?.limitation ||

        simulation?.explanation?.limitation ||

        firstDescription(
            simulation?.whatRemains
        ) ||

        "";


    setText(
        elements.modelReadingPrimary,
        primary
    );


    if (
        elements.modelReadingRemain
    ) {

        elements.modelReadingRemain.textContent =
            remain;


        elements.modelReadingRemain.hidden =
            !remain;
    }
}


function firstDescription(
    items
) {

    if (
        !Array.isArray(items) ||
        !items.length
    ) {

        return "";
    }


    return (
        items[0]?.description ||
        formatLabel(
            items[0]?.type
        )
    );
}


/* =========================================================
   APPROVAL
========================================================= */

function updateApproval(
    result,
    simulation
) {

    const responseName =
        getSelectedResponseName();


    setText(
        elements.approvalResponseName,
        responseName || "--"
    );


    setText(
        elements.approvalExplanation,

        result?.impact ||

        simulation?.impact ||

        result?.explanation?.progression ||

        "The selected response has been modeled against the current incident."
    );


    setText(
        elements.approvalStatus,
        "PENDING"
    );


    if (
        elements.approveResponse
    ) {

        elements.approveResponse.disabled =
            false;
    }


    if (
        elements.rejectResponse
    ) {

        elements.rejectResponse.disabled =
            false;
    }


    if (
        elements.decisionRecorded
    ) {

        elements.decisionRecorded.hidden =
            true;

        elements.decisionRecorded.textContent =
            "";
    }
}


function recordDecision(
    message
) {

    if (
        !whatIfState.simulation
    ) {

        return;
    }


    setText(
        elements.approvalStatus,
        "DECISION RECORDED"
    );


    if (
        elements.decisionRecorded
    ) {

        elements.decisionRecorded.hidden =
            false;

        elements.decisionRecorded.textContent =
            message;
    }


    if (
        elements.approveResponse
    ) {

        elements.approveResponse.disabled =
            true;
    }


    if (
        elements.rejectResponse
    ) {

        elements.rejectResponse.disabled =
            true;
    }
}


function handleApproveResponse() {

    recordDecision(
        "Selected response marked for consideration."
    );
}


function handleRejectResponse() {

    recordDecision(
        "Selected response marked as not proceeding."
    );
}


/* =========================================================
   RESET
========================================================= */

function resetSimulation() {

    const actual =
        whatIfState.context
            ?.actual || {};


    whatIfState.simulation =
        null;


    setText(
        elements.simulationResultSubtitle,
        `Run a response simulation to calculate the modeled outcome.`
    );


    if (
        elements.simulationCalculatedBadge
    ) {

        elements.simulationCalculatedBadge.hidden =
            true;
    }


    setText(
        elements.modeledPathTitle,
        "NOT SIMULATED"
    );


    renderPathList(
        elements.whatIfPathList,
        [],
        "Select a response and run the simulation."
    );


    setText(
        elements.simulationImpact,
        "Select a response to model its consequences."
    );


    setText(
        elements.currentRiskKpi,
        actual.riskScore !== undefined
            ? `${actual.riskScore}/100`
            : "--"
    );


    setText(
        elements.simulatedRiskKpi,
        "--"
    );


    setText(
        elements.riskReductionKpi,
        "--"
    );


    setText(
        elements.attackPathsKpi,
        actual.attackPaths !== undefined
            ? `${actual.attackPaths} → --`
            : "--"
    );


    setText(
        elements.securityStateKpi,
        actual.securityState
            ? `${actual.securityState} → --`
            : "--"
    );


    setText(
        elements.modelReadingPrimary,
        "Select a response to evaluate its modeled consequences."
    );


    if (
        elements.modelReadingRemain
    ) {

        elements.modelReadingRemain.textContent =
            "";

        elements.modelReadingRemain.hidden =
            true;
    }


    setText(
        elements.approvalResponseName,
        getSelectedResponseName() ||
        "--"
    );


    setText(
        elements.approvalExplanation,
        "Run the counterfactual model before making a decision."
    );


    setText(
        elements.approvalStatus,
        "PENDING"
    );


    if (
        elements.approveResponse
    ) {

        elements.approveResponse.disabled =
            true;
    }


    if (
        elements.rejectResponse
    ) {

        elements.rejectResponse.disabled =
            true;
    }


    if (
        elements.decisionRecorded
    ) {

        elements.decisionRecorded.hidden =
            true;

        elements.decisionRecorded.textContent =
            "";
    }


    updateResponseSelectionUI();
}


/* =========================================================
   STATE MESSAGE
========================================================= */

function showStateMessage(
    title,
    message
) {

    if (
        !elements.whatIfStateMessage
    ) {

        return;
    }


    setText(
        elements.stateMessageTitle,
        title
    );


    setText(
        elements.stateMessageText,
        message
    );


    elements.whatIfStateMessage.hidden =
        false;
}


function hideStateMessage() {

    if (
        elements.whatIfStateMessage
    ) {

        elements.whatIfStateMessage.hidden =
            true;
    }
}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(
    value
) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   INCIDENT CHANGE
========================================================= */

async function handleIncidentChange() {

    if (!elements.incidentSelector) {
        return;
    }


    const incidentId =
        elements.incidentSelector.value;


    if (!incidentId) {
        return;
    }


    whatIfState.context =
        null;

    whatIfState.selectedAttack =
        null;

    whatIfState.selectedResponse =
        null;

    whatIfState.simulation =
        null;


    const url =
        new URL(
            window.location.href
        );


    url.searchParams.set(
        "incidentId",
        incidentId
    );

    url.searchParams.delete(
        "attackType"
    );


    window.history.replaceState(
        {},
        "",
        url
    );


    await loadWhatIfContext(
        null,
        incidentId
    );
}


/* =========================================================
   EVENTS
========================================================= */

function initializeEventListeners() {

    if (
        elements.incidentSelector
    ) {

        elements.incidentSelector.addEventListener(
            "change",
            handleIncidentChange
        );
    }


    if (
        elements.simulateScenario
    ) {

        elements.simulateScenario.addEventListener(
            "click",
            runSimulation
        );
    }


    if (
        elements.approveResponse
    ) {

        elements.approveResponse.addEventListener(
            "click",
            handleApproveResponse
        );
    }


    if (
        elements.rejectResponse
    ) {

        elements.rejectResponse.addEventListener(
            "click",
            handleRejectResponse
        );
    }


    if (
        elements.retryWhatIf
    ) {

        elements.retryWhatIf.addEventListener(
            "click",
            () =>
                loadWhatIfContext(
                    whatIfState.selectedAttack,
                    getIncidentId()
                )
        );
    }
}


/* =========================================================
   NAVIGATION
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
                        nav =>
                            nav.classList.remove(
                                "active"
                            )
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
   VISIBILITY
========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        () => {

            if (
                !document.hidden &&
                !whatIfState.simulating
            ) {

                loadWhatIfContext(
                    whatIfState.selectedAttack,
                    getIncidentId()
                );
            }
        }
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeWhatIf() {

    console.log(
        "[CyberTwin] What-If Analysis initializing..."
    );


    initializeEventListeners();

    initializeNavigation();

    initializeVisibilityHandler();


    await loadIncidentList();

    await loadWhatIfContext();


    console.log(
        "[CyberTwin] What-If Analysis initialized successfully."
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeWhatIf,
        {
            once: true
        }
    );

} else {

    initializeWhatIf();
}