const WHAT_IF_API = "http://localhost:5000/api/what-if";

const S = { context: null, incidents: [], incidentId: null, stage: null, response: null, simulation: null, options: [] };
const $ = id => document.getElementById(id);
const E = {
    stage: $("stageTimeline"), details: $("stageDetails"), bar: $("actionBarCard"), results: $("resultsCard"),
    eCount: $("evidenceEventCount"), confidence: $("evidenceConfidence"), evidence: $("evidenceList"), interpretation: $("modelInterpretation"),
    responses: $("responseOptions"), modeled: $("modeledDataBadge"), selection: $("actionSelectionText"), run: $("runSimulation"),
    reject: $("rejectResponse"), approve: $("approveResponse"), error: $("actionError"), confirm: $("decisionConfirmation"),
    risk: $("riskChangeMetric"), paths: $("attackPathsMetric"), state: $("securityStateMetric"), actual: $("actualPath"), whatif: $("whatIfPath"),
    changes: $("whatChanges"), remains: $("whatRemains"), message: $("stateMessage"), messageText: $("stateMessageText"), retry: $("retryWhatIf"),
    incidentSelector: $("incidentSelector"), incidentLabel: $("selectedIncidentLabel"), incidentPanel: $("incidentSelectorPanel"),
    topEndpoint: $("topbarEndpoint"), topState: $("topbarState"), topRisk: $("topbarRisk"), topStatus: $("topbarSystemStatus"), sideStatus: $("sidebarSystemStatus")
};

const n = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;
const key = v => String(v || "").trim().toUpperCase().replace(/[-\s]+/g, "_").replace(/[^A-Z0-9_]/g, "");
const canon = v => ({ ACCOUNT_MODIFICATION: "USER_ACCOUNT_MODIFICATION", USER_ACCOUNT: "USER_ACCOUNT_MODIFICATION", PRIVILEGED: "PRIVILEGED_ACTIVITY", PRIVILEGE: "PRIVILEGE_ESCALATION" }[key(v)] || key(v));
const pretty = v => String(v || "").replace(/^Endpoint:\s*/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const show = x => { x?.classList.remove("hidden", "hidden-until-stage"); };
const hide = x => { x?.classList.add("hidden"); };

async function api(url, opt = {}) {
    const r = await fetch(url, { ...opt, headers: { "Content-Type": "application/json", ...(opt.headers || {}) } });
    let p = null;
    try { p = await r.json(); } catch {}
    if (!r.ok || p?.success === false) throw Error(p?.message || `Request failed with status ${r.status}`);
    return p;
}

function updateUrl(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set("incidentId", id); else u.searchParams.delete("incidentId");
    history.replaceState({}, "", u);
}

function closeIncidentSelector() {
    E.incidentSelector?.classList.remove("open");
    E.incidentPanel?.classList.remove("open");
}

function toggleIncidentSelector() {
    if (!E.incidentSelector) return;
    const open = E.incidentSelector.classList.toggle("open");
    E.incidentPanel?.classList.toggle("open", open);
}

function renderIncidentSelector() {
    if (!E.incidentPanel) return;
    E.incidentPanel.innerHTML = "";
    if (!S.incidents.length) {
        E.incidentPanel.innerHTML = '<div class="incident-selector-empty">No incidents available.</div>';
        return;
    }
    S.incidents.forEach(incident => {
        const item = document.createElement("div");
        item.className = "incident-selector-item";
        if (incident.incidentId === S.incidentId) item.classList.add("selected");
        const header = document.createElement("div");
        header.className = "incident-selector-item-header";
        const id = document.createElement("strong");
        id.textContent = incident.incidentId || "UNKNOWN";
        const state = document.createElement("span");
        const stateKey = String(incident.currentState || "DETECTED").toLowerCase();
        state.className = `incident-selector-state ${stateKey}`;
        state.textContent = pretty(incident.currentState || "DETECTED");
        header.append(id, state);
        const type = document.createElement("div");
        type.className = "incident-selector-item-type";
        type.textContent = pretty(incident.incidentType || "Unknown incident");
        const endpoint = document.createElement("div");
        endpoint.className = "incident-selector-item-endpoint";
        endpoint.textContent = incident.endpointHostname || incident.endpointId || "Unknown endpoint";
        const risk = document.createElement("div");
        risk.className = "incident-selector-item-risk";
        risk.textContent = `Risk ${incident.riskScore ?? 0}/100 · ${pretty(incident.riskLevel || "LOW")}`;
        item.append(header, type, endpoint, risk);
        item.addEventListener("click", async event => { event.stopPropagation(); await selectIncident(incident); });
        E.incidentPanel.appendChild(item);
    });
}

function updateIncidentSelectorLabel() {
    const incident = S.context?.incident || S.incidents.find(x => x.incidentId === S.incidentId);
    if (E.incidentLabel) E.incidentLabel.textContent = incident ? `${incident.incidentId || "UNKNOWN"} — ${pretty(incident.incidentType || "Unknown incident")}` : "No incident selected";
}

async function loadIncidents() {
    const p = await api(`${WHAT_IF_API}/incidents`);
    S.incidents = Array.isArray(p.data) ? p.data : [];
    const requestedId = new URLSearchParams(location.search).get("incidentId");
    S.incidentId = requestedId && S.incidents.some(i => i.incidentId === requestedId) ? requestedId : S.incidents[0]?.incidentId || null;
    renderIncidentSelector();
    updateIncidentSelectorLabel();
}

async function selectIncident(incident) {
    if (!incident?.incidentId) return;
    S.incidentId = incident.incidentId;
    updateUrl(S.incidentId);
    closeIncidentSelector();
    renderIncidentSelector();
    try { await loadContext(S.incidentId); }
    catch (error) {
        console.error("[CyberTwin] Failed to load selected incident:", error);
        E.messageText.textContent = error.message || "Couldn't load incident data. Retry.";
        show(E.message);
    }
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
    S.options = [];
    if (S.incidentId) updateUrl(S.incidentId);
    renderIncidentSelector();
    updateIncidentSelectorLabel();
    renderTop();
    renderStages();
    resetBelow();
}

function getIncidentConfidence() { return n(S.context?.incident?.confidence ?? S.context?.endpoint?.evidenceConfidence, 0); }

function renderTop() {
    const c = S.context || {}, e = c.endpoint || {}, a = c.actual || {}, incident = c.incident || {};
    const state = a.securityState || e.securityState || incident.currentState || "UNKNOWN";
    const risk = n(a.riskScore ?? e.riskScore ?? incident.riskScore);
    if (E.topEndpoint) E.topEndpoint.textContent = e.hostname || e.endpointId || "Unknown";
    if (E.topState) { E.topState.textContent = pretty(state) || "Unknown"; E.topState.className = `state-badge ${key(state).toLowerCase() || "unknown"}`; }
    if (E.topRisk) E.topRisk.textContent = risk;
    if (E.topStatus) E.topStatus.textContent = "ONLINE";
    if (E.sideStatus) E.sideStatus.textContent = `SYSTEM ${e.status || "UNKNOWN"}`;
}

function stages() {
    // The stage tabs represent the ordered attack path for this incident only.
    // Evidence and endpoint-wide findings belong in the Evidence panel, not here.
    const progression = S.context?.incident?.attackProgression || S.context?.actual?.attackProgression || [];
    const ignored = new Set(["", "UNKNOWN", "OTHER", "ENDPOINT"]);
    const result = [];
    const seen = new Set();
    progression.forEach(value => {
        const normalized = key(value);
        if (!normalized || ignored.has(normalized) || normalized.startsWith("ENDPOINT_")) return;
        if (seen.has(canon(normalized))) return;
        seen.add(canon(normalized));
        result.push(String(value).replace(/^Endpoint:\\s*/i, "").trim());
    });
    return result;
}
function finding(stage) { return (S.context?.actual?.findings || []).find(f => canon(f.type) === canon(stage)); }
function evidence(stage) {
    const records = Array.isArray(S.context?.evidence) ? S.context.evidence : [];
    const matches = records.filter(x => [x.type, x.category, x.description].some(v => canon(v) === canon(stage)));
    if (matches.length) return matches;
    const f = finding(stage);
    return f ? [{ source: "Endpoint Twin", type: f.type, severity: f.severity, description: f.description, count: f.count }] : [];
}

function renderStages() {
    const a = stages();
    E.stage.innerHTML = a.length ? a.map((s, i) => `<button type="button" class="stage-item" data-i="${i}" aria-pressed="false"><span class="stage-number">${i + 1}</span><span class="stage-name">${esc(pretty(s))}</span></button>`).join("") : '<div class="whatif-empty">No observed stages recorded for this incident.</div>';
    E.stage.querySelectorAll(".stage-item").forEach(button => button.addEventListener("click", () => selectStage(Number(button.dataset.i))));
}

async function selectStage(index) {
    const a = stages();
    if (!a[index]) return;

    const selectedStage = a[index];
    S.stage = { index, value: selectedStage };
    S.response = null;
    S.simulation = null;
    S.options = [];

    E.stage.querySelectorAll(".stage-item").forEach((button, i) => {
        const selected = i === index;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    hide(E.error);
    E.responses.innerHTML = '<div class="whatif-empty">Loading response options for this attack stage...</div>';
    show(E.details);
    show(E.bar);
    resetSimulation();

    try {
        const q = new URLSearchParams();
        if (S.incidentId) q.set("incidentId", S.incidentId);
        q.set("attackType", selectedStage);

        const p = await api(`${WHAT_IF_API}?${q}`);
        if (!p.data) throw Error("Attack-stage context is empty.");

        S.context = p.data;
        S.incidentId = p.data.incident?.incidentId || S.incidentId;
        S.stage = { index, value: selectedStage };

        renderIncidentSelector();
        updateIncidentSelectorLabel();
        renderTop();
        renderEvidence(selectedStage);
        renderResponses();
        resetSimulation();
    } catch (error) {
        console.error("[CyberTwin] Failed to load attack-stage responses:", error);
        E.error.textContent = error.message || "Couldn't load response options for this attack stage.";
        show(E.error);
        E.responses.innerHTML = '<div class="whatif-empty">Unable to load response options for this attack stage.</div>';
    }
}

function renderEvidence(stage) {
    const records = evidence(stage), f = finding(stage), count = records.reduce((sum, x) => sum + Math.max(1, n(x.count, 1)), 0), confidence = getIncidentConfidence();
    E.eCount.textContent = count;
    E.confidence.textContent = `${confidence}%`;
    E.evidence.innerHTML = records.slice(0, 3).map(x => `<li class="evidence-item"><strong>${esc(pretty(x.type || x.category || "Evidence"))}</strong><span>${esc(x.description || `${pretty(x.source || "Recorded evidence")} · ${pretty(x.severity || "Supporting")}`)}</span></li>`).join("") || '<li class="whatif-empty">No evidence recorded for this stage.</li>';
    E.interpretation.textContent = f?.description || `The Incident Twin recorded ${pretty(stage)} as an observed stage with ${count} supporting event${count === 1 ? "" : "s"}.`;
}

function normalizeResponse(x) {
    const impact = String(x.disruption || x.impact || "Medium");
    return { action: x.action, name: x.name || x.action, effect: x.expectedEffect || x.description || "Models the effect of this response at the selected stage.", impact: impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase(), remains: x.whatRemains || "Activity outside the response scope can remain.", status: x.status };
}

function renderResponses() {
    S.options = (S.context?.responseScenarios || []).filter(x => x?.status !== "NOT_APPLICABLE").map(normalizeResponse).slice(0, 4);
    E.modeled?.classList.add("hidden");
    E.responses.innerHTML = S.options.length ? S.options.map((x, i) => `<button type="button" class="response-option" data-i="${i}" aria-pressed="false"><span class="response-option-head"><span class="response-option-name">${esc(x.name)}</span><span class="impact-tag impact-${esc(x.impact.toLowerCase())}">${esc(x.impact)} impact</span></span><span class="response-effect">${esc(x.effect)}</span></button>`).join("") : '<div class="whatif-empty">No response options are modeled for this attack stage.</div>';
    E.responses.querySelectorAll(".response-option").forEach(button => button.addEventListener("click", () => selectResponse(Number(button.dataset.i))));
}

function selectResponse(index) {
    if (!S.options[index]) return;
    S.response = S.options[index];
    S.simulation = null;
    E.responses.querySelectorAll(".response-option").forEach((button, i) => { const selected = i === index; button.classList.toggle("selected", selected); button.setAttribute("aria-pressed", String(selected)); });
    E.selection.textContent = `Selected: ${S.response.name}`;
    resetSimulation();
}

function resetBelow() { hide(E.details); hide(E.bar); resetSimulation(); }
function resetSimulation() { hide(E.results); hide(E.reject); hide(E.approve); show(E.run); hide(E.confirm); hide(E.error); E.selection.textContent = S.response ? `Selected: ${S.response.name}` : "Choose a response"; }
function currentRisk() { return n(S.context?.actual?.riskScore ?? S.context?.endpoint?.riskScore ?? S.context?.incident?.riskScore); }
function currentPaths() { return n(S.context?.actual?.attackPaths); }
function currentState() { return S.context?.actual?.securityState || S.context?.endpoint?.securityState || S.context?.incident?.currentState || "Unknown"; }

async function run() {
    if (!S.stage) { E.error.textContent = "Select an observed attack stage first."; show(E.error); return; }
    if (!S.response) { E.error.textContent = "Choose a response first."; show(E.error); return; }
    hide(E.error);
    E.run.disabled = true;
    try {
        const p = await api(`${WHAT_IF_API}/simulate`, { method: "POST", body: JSON.stringify({ endpointId: S.context?.endpoint?.endpointId, incidentId: S.incidentId, attackType: S.stage.value, action: S.response.action }) });
        S.simulation = p.data;
        renderSimulation();
    } catch (error) {
        E.error.textContent = error.message || "Couldn't run simulation.";
        show(E.error);
        E.run.disabled = false;
    }
}

function renderSimulation() {
    const r = S.simulation || {}, a = r.actual || {}, m = r.simulation || {};
    const current = n(a.riskScore, currentRisk()), simulated = n(m.riskScore, current), actualPaths = n(a.attackPaths, currentPaths()), simulatedPaths = n(m.attackPaths, actualPaths);
    const actualState = a.securityState || currentState(), simulatedState = m.securityState || "Unknown", drop = current - simulated, allStages = stages(), index = S.stage.index;
    E.risk.textContent = `${current} → ${simulated}`;
    E.paths.textContent = `${actualPaths} → ${simulatedPaths}`;
    E.state.textContent = `${pretty(actualState)} → ${pretty(simulatedState)}`;
    E.actual.innerHTML = allStages.slice(0, index + 1).map(x => `<li>${esc(pretty(x))}</li>`).join("") || '<li class="path-note">No observed stages.</li>';
    E.whatif.innerHTML = allStages.map((x, i) => i < index ? `<li>${esc(pretty(x))}</li>` : i === index ? `<li class="applied">${esc(S.response.name)} applied</li>` : `<li class="disabled-stage">${esc(pretty(x))}</li>`).join("");
    E.changes.textContent = drop > 0 ? `The modeled response reduces risk by ${drop} point${drop === 1 ? "" : "s"} at this stage.` : (r.impact || "No modeled risk change was produced by this response.");
    E.remains.textContent = r.responseScenario?.whatRemains || S.response.remains;
    show(E.results);
    hide(E.run);
    show(E.reject);
    show(E.approve);
    E.run.disabled = false;
}

async function decide(decision) {
    if (!S.simulation || !S.stage || !S.response) return;
    const record = { incidentId: S.incidentId, endpointId: S.context?.endpoint?.endpointId, stage: S.stage.value, response: S.response.name, responseAction: S.response.action, simulatedResult: S.simulation, decision, timestamp: new Date().toISOString() };
    try { await api(`${WHAT_IF_API}/decisions`, { method: "POST", body: JSON.stringify(record) }); }
    catch (error) { console.warn("[CyberTwin] Decision persistence failed:", error); }
    hide(E.reject);
    hide(E.approve);
    E.confirm.textContent = decision === "APPROVED" ? "Approved and recorded. No endpoint action was performed." : "Rejected and recorded. Select another response to compare.";
    show(E.confirm);
}

E.incidentSelector?.addEventListener("click", event => { if (event.target.closest(".incident-selector-item")) return; toggleIncidentSelector(); });
document.addEventListener("click", event => { if (E.incidentSelector && !E.incidentSelector.contains(event.target)) closeIncidentSelector(); });
E.run?.addEventListener("click", run);
E.approve?.addEventListener("click", () => decide("APPROVED"));
E.reject?.addEventListener("click", () => decide("REJECTED"));
E.retry?.addEventListener("click", boot);

async function boot() {
    try {
        await loadIncidents();
        if (!S.incidentId) { E.stage.innerHTML = '<div class="whatif-empty">No incidents available.</div>'; resetBelow(); return; }
        await loadContext(S.incidentId);
    } catch (error) {
        console.error("[CyberTwin] What-If initialization failed:", error);
        E.messageText.textContent = error.message || "Couldn't load incident data. Retry.";
        show(E.message);
    }
}

document.addEventListener("DOMContentLoaded", boot);
