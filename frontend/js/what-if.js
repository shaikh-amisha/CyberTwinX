const WHAT_IF_API = "http://localhost:5000/api/what-if";

const S = {
    context: null,
    incidents: [],
    incidentId: null,
    stage: null,
    response: null,
    simulation: null,
    options: [],
    fallback: false
};

const $ = id => document.getElementById(id);

const E = {
    stage: $("stageTimeline"),
    details: $("stageDetails"),
    bar: $("actionBarCard"),
    results: $("resultsCard"),
    eCount: $("evidenceEventCount"),
    confidence: $("evidenceConfidence"),
    evidence: $("evidenceList"),
    interpretation: $("modelInterpretation"),
    responses: $("responseOptions"),
    modeled: $("modeledDataBadge"),
    selection: $("actionSelectionText"),
    run: $("runSimulation"),
    reject: $("rejectResponse"),
    approve: $("approveResponse"),
    error: $("actionError"),
    confirm: $("decisionConfirmation"),
    risk: $("riskChangeMetric"),
    paths: $("attackPathsMetric"),
    state: $("securityStateMetric"),
    actual: $("actualPath"),
    whatif: $("whatIfPath"),
    changes: $("whatChanges"),
    remains: $("whatRemains"),
    message: $("stateMessage"),
    messageText: $("stateMessageText"),
    retry: $("retryWhatIf"),
    incidents: $("incidentSelector"),
    incidentLine: $("incidentContextLine"),
    topEndpoint: $("topbarEndpoint"),
    topState: $("topbarState"),
    topRisk: $("topbarRisk"),
    topStatus: $("topbarSystemStatus"),
    sideStatus: $("sidebarSystemStatus")
};

const n = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const key = v => String(v || "").trim().toUpperCase().replace(/[-\s]+/g, "_").replace(/[^A-Z0-9_]/g, "");
const canon = v => ({
    ACCOUNT_MODIFICATION: "USER_ACCOUNT_MODIFICATION",
    USER_ACCOUNT: "USER_ACCOUNT_MODIFICATION",
    PRIVILEGED: "PRIVILEGED_ACTIVITY",
    PRIVILEGE: "PRIVILEGE_ESCALATION"
}[key(v)] || key(v));
const pretty = v => String(v || "").replace(/^Endpoint:\s*/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const show = x => x?.classList.remove("hidden");
const hide = x => x?.classList.add("hidden");

async function api(url, opt = {}) {
    const r = await fetch(url, {
        ...opt,
        headers: { "Content-Type": "application/json", ...(opt.headers || {}) }
    });
    let p = null;
    try { p = await r.json(); } catch {}
    if (!r.ok || p?.success === false) throw Error(p?.message || `Request failed with status ${r.status}`);
    return p;
}

async function loadIncidents() {
    if (!E.incidents) return [];

    const p = await api(`${WHAT_IF_API}/incidents`);
    const incidents = Array.isArray(p.data) ? p.data : [];
    S.incidents = incidents;

    E.incidents.innerHTML = incidents.length
        ? incidents.map(i => `<option value="${esc(i.incidentId)}">${esc(i.incidentId)} · ${esc(pretty(i.incidentType || "Incident"))}</option>`).join("")
        : '<option value="">No incidents available</option>';

    const requestedId = new URLSearchParams(location.search).get("incidentId");
    const selectedId = requestedId && incidents.some(i => i.incidentId === requestedId)
        ? requestedId
        : incidents[0]?.incidentId || null;

    S.incidentId = selectedId;
    if (selectedId) E.incidents.value = selectedId;
    return incidents;
}

function updateUrl(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set("incidentId", id);
    else u.searchParams.delete("incidentId");
    history.replaceState({}, "", u);
}

async function loadContext(id = S.incidentId) {
    hide(E.message);
    const q = new URLSearchParams();
    if (id) q.set("incidentId", id);

    const p = await api(`${WHAT_IF_API}?${q}`);
    if (!p.data) throw Error("What-If context is empty.");

    S.context = p.data;
    S.incidentId = p.data.incident?.incidentId || id;
    S.stage = null;
    S.response = null;
    S.simulation = null;

    if (E.incidents && S.incidentId) E.incidents.value = S.incidentId;
    renderTop();
    renderStages();
    resetBelow();
}

function getIncidentConfidence() {
    return n(
        S.context?.incident?.confidence ??
        S.context?.endpoint?.evidenceConfidence,
        0
    );
}

function renderTop() {
    const c = S.context || {};
    const e = c.endpoint || {};
    const a = c.actual || {};
    const incident = c.incident || {};
    const state = a.securityState || e.securityState || incident.currentState || "UNKNOWN";
    const risk = n(a.riskScore ?? e.riskScore ?? incident.riskScore);
    const incidentId = incident.incidentId || S.incidentId || "Unknown incident";
    const incidentType = pretty(incident.incidentType || incident.type || "Incident");

    if (E.topEndpoint) E.topEndpoint.textContent = e.hostname || e.endpointId || "Unknown";
    if (E.topState) {
        E.topState.textContent = pretty(state) || "Unknown";
        E.topState.className = `state-badge ${key(state).toLowerCase() || "unknown"}`;
    }
    if (E.topRisk) E.topRisk.textContent = risk;
    if (E.topStatus) E.topStatus.textContent = "ONLINE";
    if (E.sideStatus) E.sideStatus.textContent = `SYSTEM ${e.status || "UNKNOWN"}`;

    if (E.incidentLine) {
        E.incidentLine.textContent = S.stage
            ? `${incidentId} · ${incidentType} · ${getIncidentConfidence()}% confidence`
            : `${incidentId} · ${incidentType}`;
    }
}

function stages() {
    return [...new Set(
        (S.context?.incident?.attackProgression || S.context?.actual?.attackProgression || [])
            .filter(Boolean)
    )];
}

function finding(stage) {
    return (S.context?.actual?.findings || []).find(f => canon(f.type) === canon(stage));
}

function evidence(stage) {
    const a = Array.isArray(S.context?.evidence) ? S.context.evidence : [];
    const matches = a.filter(x => [x.type, x.category, x.description].some(v => canon(v) === canon(stage)));
    if (matches.length) return matches;

    const f = finding(stage);
    return f ? [{
        source: "Endpoint Twin",
        type: f.type,
        severity: f.severity,
        description: f.description,
        count: f.count
    }] : [];
}

function renderStages() {
    const a = stages();
    E.stage.innerHTML = a.length
        ? a.map((s, i) => `<button type="button" class="stage-item" data-i="${i}" aria-pressed="false"><span class="stage-number">${i + 1}</span><span class="stage-name">${esc(pretty(s))}</span></button>`).join("")
        : '<div class="whatif-empty">No observed stages recorded for this incident.</div>';

    E.stage.querySelectorAll(".stage-item").forEach(b => {
        b.onclick = () => selectStage(Number(b.dataset.i));
    });
}

function selectStage(i) {
    const a = stages();
    if (!a[i]) return;

    S.stage = { index: i, value: a[i] };
    S.response = null;
    S.simulation = null;

    E.stage.querySelectorAll(".stage-item").forEach((b, j) => {
        const selected = i === j;
        b.classList.toggle("selected", selected);
        b.setAttribute("aria-pressed", String(selected));
    });

    renderTop();
    renderEvidence(a[i]);
    renderResponses(a[i]);
    show(E.details);
    show(E.bar);
    resetSimulation();
}

function renderEvidence(stage) {
    const a = evidence(stage);
    const f = finding(stage);
    const count = a.reduce((sum, x) => sum + Math.max(1, n(x.count, 1)), 0);
    const conf = getIncidentConfidence();

    E.eCount.textContent = count;
    E.confidence.textContent = `${conf}%`;
    E.evidence.innerHTML = a.slice(0, 3).map(x => `
        <li class="evidence-item">
            <strong>${esc(pretty(x.type || x.category || "Evidence"))}</strong>
            <span>${esc(x.description || `${pretty(x.source || "Recorded evidence")} · ${pretty(x.severity || "Supporting")}`)}</span>
        </li>
    `).join("") || '<li class="whatif-empty">No evidence recorded for this stage</li>';

    E.interpretation.textContent = f?.description ||
        `The Incident Twin recorded ${pretty(stage)} as an observed stage with ${count} supporting event${count === 1 ? "" : "s"}.`;
}

function normalizeResponse(x, fallback = false) {
    const impact = String(x.impact || x.disruption || "Medium").toLowerCase();
    return {
        action: x.action,
        name: x.name || x.action,
        effect: x.expectedEffect || x.description || "Models the effect of this response at the selected stage.",
        impact: impact.charAt(0).toUpperCase() + impact.slice(1),
        risk: x.simulatedRisk ?? null,
        paths: x.simulatedAttackPaths ?? null,
        state: x.simulatedSecurityState || x.state || null,
        remains: x.whatRemains || "Activity outside the response scope can still remain.",
        riskDelta: x.riskDelta,
        pathDelta: x.pathDelta,
        fallback
    };
}

async function renderResponses(stage) {
    const backend = (S.context?.responseScenarios || [])
        .filter(x => x?.status !== "NOT_APPLICABLE")
        .map(x => normalizeResponse(x));

    const fallback = (window.CYBERTWIN_WHAT_IF_FALLBACKS?.[canon(stage)] || window.CYBERTWIN_WHAT_IF_FALLBACK_DEFAULT || [])
        .map(x => normalizeResponse(x, true));

    const map = new Map(backend.map(x => [x.action, x]));
    fallback.forEach(x => {
        if (!map.has(x.action)) map.set(x.action, x);
    });

    S.options = [...map.values()].slice(0, 3);
    S.fallback = backend.length < 2 || S.options.some(x => x.fallback);
    E.modeled.classList.toggle("hidden", !S.fallback);

    E.responses.innerHTML = S.options.length
        ? S.options.map((x, i) => `
            <button type="button" class="response-option" data-i="${i}" aria-pressed="false">
                <span class="response-option-head">
                    <span class="response-option-name">${esc(x.name)}</span>
                    <span class="impact-tag impact-${x.impact.toLowerCase()}">${esc(x.impact)}</span>
                </span>
                <span class="response-effect">${esc(x.effect)}</span>
            </button>
        `).join("")
        : '<div class="whatif-empty">No response options are available for this stage.</div>';

    E.responses.querySelectorAll(".response-option").forEach(b => {
        b.onclick = () => selectResponse(Number(b.dataset.i));
    });
}

function selectResponse(i) {
    if (!S.options[i]) return;
    S.response = S.options[i];
    S.simulation = null;

    E.responses.querySelectorAll(".response-option").forEach((b, j) => {
        const selected = i === j;
        b.classList.toggle("selected", selected);
        b.setAttribute("aria-pressed", String(selected));
    });

    E.selection.textContent = `Selected: ${S.response.name}`;
    resetSimulation();
}

function resetBelow() {
    hide(E.details);
    hide(E.bar);
    resetSimulation();
    if (E.incidentLine) renderTop();
}

function resetSimulation() {
    hide(E.results);
    hide(E.reject);
    hide(E.approve);
    show(E.run);
    E.selection.textContent = S.response ? `Selected: ${S.response.name}` : "Choose a response";
    hide(E.error);
    hide(E.confirm);
}

const currentRisk = () => n(S.context?.actual?.riskScore ?? S.context?.endpoint?.riskScore ?? S.context?.incident?.riskScore);
const currentPaths = () => n(S.context?.actual?.attackPaths);
const currentState = () => S.context?.actual?.securityState || S.context?.endpoint?.securityState || S.context?.incident?.currentState || "Unknown";

function localSimulation(x) {
    const r = currentRisk();
    const p = currentPaths();
    const sr = Math.max(0, r - n(x.riskDelta, 15));
    return {
        actual: { riskScore: r, attackPaths: p, securityState: currentState() },
        simulation: {
            riskScore: sr,
            attackPaths: Math.max(0, p - n(x.pathDelta, 1)),
            securityState: x.state || (sr >= 60 ? "Compromised" : sr >= 25 ? "Suspicious" : "Normal")
        },
        riskReduction: r - sr,
        impact: x.effect,
        responseScenario: { whatRemains: x.remains }
    };
}

async function run() {
    if (!S.response) {
        E.error.textContent = "Choose a response first";
        show(E.error);
        return;
    }

    hide(E.error);

    try {
        const p = await api(`${WHAT_IF_API}/simulate`, {
            method: "POST",
            body: JSON.stringify({
                endpointId: S.context?.endpoint?.endpointId,
                incidentId: S.incidentId,
                attackType: S.stage.value,
                action: S.response.action
            })
        });
        S.simulation = p.data;
    } catch (err) {
        if (!S.response.fallback) {
            E.error.textContent = err.message || "Couldn't run simulation.";
            show(E.error);
            return;
        }
        S.simulation = localSimulation(S.response);
    }

    renderSimulation();
}

function renderSimulation() {
    const r = S.simulation || {};
    const a = r.actual || {};
    const m = r.simulation || {};
    const cr = n(a.riskScore, currentRisk());
    const sr = n(m.riskScore, cr);
    const cp = n(a.attackPaths, currentPaths());
    const sp = n(m.attackPaths, cp);
    const cs = a.securityState || currentState();
    const ss = m.securityState || "Unknown";
    const drop = cr - sr;
    const st = stages();
    const idx = S.stage.index;

    E.risk.textContent = `${cr} → ${sr}`;
    E.paths.textContent = `${cp} → ${sp}`;
    E.state.textContent = `${pretty(cs)} → ${pretty(ss)}`;

    E.actual.innerHTML = st.slice(0, idx + 1).map(x => `<li>${esc(pretty(x))}</li>`).join("") || '<li class="path-note">No observed stages</li>';

    E.whatif.innerHTML = st.map((x, i) => {
        if (i < idx) return `<li>${esc(pretty(x))}</li>`;
        if (i === idx) return `<li class="applied">${esc(S.response.name)} applied</li>`;
        return `<li class="disabled-stage">${esc(pretty(x))}</li>`;
    }).join("");

    E.changes.textContent = drop > 0
        ? `Stops the modeled attack here, risk drops by ${drop} point${drop === 1 ? "" : "s"}.`
        : (r.impact || "No modeled change was produced by this response.");
    E.remains.textContent = r.responseScenario?.whatRemains || S.response.remains;

    show(E.results);
    hide(E.run);
    show(E.reject);
    show(E.approve);
}

async function decide(decision) {
    if (!S.simulation || !S.stage || !S.response) return;

    const record = {
        incidentId: S.incidentId,
        endpointId: S.context?.endpoint?.endpointId,
        stage: S.stage.value,
        response: S.response.name,
        responseAction: S.response.action,
        simulatedResult: S.simulation,
        decision,
        timestamp: new Date().toISOString()
    };

    try {
        await api(`${WHAT_IF_API}/decisions`, {
            method: "POST",
            body: JSON.stringify(record)
        });
    } catch (e) {
        console.warn("[CyberTwin] Decision persistence failed:", e);
    }

    hide(E.reject);
    hide(E.approve);
    E.confirm.textContent = decision === "APPROVED"
        ? "Approved and recorded. No endpoint action was performed."
        : "Rejected and recorded. Pick another response to compare.";
    show(E.confirm);
}

E.run?.addEventListener("click", run);
E.approve?.addEventListener("click", () => decide("APPROVED"));
E.reject?.addEventListener("click", () => decide("REJECTED"));
E.retry?.addEventListener("click", boot);

E.incidents?.addEventListener("change", async e => {
    const id = e.target.value;
    if (!id) return;

    S.incidentId = id;
    updateUrl(id);

    try {
        await loadContext(id);
    } catch (err) {
        E.messageText.textContent = "Couldn't load incident data. Retry";
        show(E.message);
        console.error(err);
    }
});

async function boot() {
    try {
        await loadIncidents();
        if (!S.incidentId) {
            E.stage.innerHTML = '<div class="whatif-empty">No incidents available.</div>';
            resetBelow();
            return;
        }
        updateUrl(S.incidentId);
        await loadContext(S.incidentId);
    } catch (e) {
        console.error(e);
        E.stage.innerHTML = '<div class="whatif-empty">Couldn\'t load incident data. Retry.</div>';
        E.messageText.textContent = "Couldn't load incident data. Retry";
        show(E.message);
    }
}

document.addEventListener("DOMContentLoaded", boot);
