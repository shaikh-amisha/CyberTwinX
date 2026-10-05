/* =========================================================
   CYBERTWINX — INVESTIGATION INTEGRITY
   Page 2 — API-driven evidence verification
   ========================================================= */

const INTEGRITY_API_BASE_URL = "http://localhost:5000/api/integrity";
const INCIDENT_API_BASE_URL = "http://localhost:5000/api/incident-twin";

const urlParams = new URLSearchParams(window.location.search);

const state = {
    incidentId: null,
    incident: null,
    integrity: null,
    latestVersion: null,
    custody: [],
    blockchain: null,
    verification: null
};

const elements = {
    verifyButton: document.getElementById("verifyIntegrityButton"),
    verificationPathList: document.getElementById("verificationPathList"),
    verificationPanelState: document.getElementById("verificationPanelState"),
    verificationCurrentResult: document.getElementById("verificationCurrentResult"),
    verificationCurrentTitle: document.getElementById("verificationCurrentTitle"),
    verificationCurrentText: document.getElementById("verificationCurrentText"),
    verificationChainStage: document.getElementById("verificationChainStage"),
    pageLiveStatus: document.getElementById("pageLiveStatus"),

    rootSummary: document.getElementById("rootHistoryCurrentRoot"),
    rootSummarySub: document.getElementById("rootHistorySummarySub"),
    rootVersionStrip: document.getElementById("rootHistoryVersionStrip"),
    rootVersionCount: document.getElementById("rootHistoryVersionCount"),

    custodyCount: document.getElementById("custodyEventCount"),
    custodySummaryEvents: document.getElementById("custodySummaryEvents"),
    custodyLatestType: document.getElementById("custodyLatestType"),
    custodyLatestTime: document.getElementById("custodyLatestTime"),
    custodyEvidence: document.getElementById("custodyEvidence"),

    rootHistoryModalList: document.getElementById("rootHistoryModalList"),
    custodyModalTimeline: document.getElementById("custodyModalTimeline")
};

function setText(element, value, fallback = "—") {
    if (!element) return;
    element.textContent =
        value !== undefined && value !== null && value !== ""
            ? value
            : fallback;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shortHash(hash, start = 10, end = 8) {
    if (!hash) return "—";
    if (hash.length <= start + end + 3) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

function formatTime(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

async function fetchJSON(url) {
    const response = await fetch(url);

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error(`Invalid API response (${response.status})`);
    }

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || `API request failed (${response.status})`
        );
    }

    return result.data;
}

async function fetchAllIncidents() {
    return fetchJSON(INCIDENT_API_BASE_URL);
}

async function fetchIncident(incidentId) {
    return fetchJSON(
        `${INCIDENT_API_BASE_URL}/${encodeURIComponent(incidentId)}`
    );
}

async function fetchIntegrity(incidentId) {
    return fetchJSON(
        `${INTEGRITY_API_BASE_URL}/${encodeURIComponent(incidentId)}`
    );
}

async function fetchCustody(incidentId) {
    return fetchJSON(
        `${INTEGRITY_API_BASE_URL}/${encodeURIComponent(incidentId)}/custody`
    );
}

async function fetchBlockchainStatus() {
    return fetchJSON(`${INTEGRITY_API_BASE_URL}/blockchain/status`);
}

async function verifyVersion(incidentId, version) {
    return fetchJSON(
        `${INTEGRITY_API_BASE_URL}/${encodeURIComponent(incidentId)}/verify/${version}`
    );
}

async function resolveIncidentId() {
    const requested = urlParams.get("incidentId");

    if (requested) return requested;

    const incidents = await fetchAllIncidents();

    if (!Array.isArray(incidents) || incidents.length === 0) {
        throw new Error("No Incident Twin records are available.");
    }

    return [...incidents]
        .sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
        })[0].incidentId;
}

function getLatestVersion() {
    const versions = Array.isArray(state.integrity?.rootVersions)
        ? state.integrity.rootVersions
        : [];

    if (!versions.length) return null;

    return [...versions].sort(
        (a, b) => Number(b.version) - Number(a.version)
    )[0];
}

function setPageStatus(text, tone = "normal") {
    setText(elements.pageLiveStatus, text);

    if (elements.pageLiveStatus) {
        elements.pageLiveStatus.dataset.tone = tone;
    }
}

function renderRootSummary() {
    const versions = [...(state.integrity?.rootVersions || [])]
        .sort((a, b) => Number(a.version) - Number(b.version));

    const latest = state.latestVersion;

    setText(
        elements.rootSummary,
        latest?.merkleRoot || "No root anchored"
    );

    setText(
        elements.rootSummarySub,
        latest
            ? `Merkle Root v${latest.version} · ${latest.leafCount ?? latest.evidenceRecords?.length ?? 0} evidence items · ${latest.blockchainStatus || "PENDING"}`
            : "No anchored Merkle Root is available for this incident."
    );

    setText(
        elements.rootVersionCount,
        `${versions.length} registered root version${versions.length === 1 ? "" : "s"}`
    );

    if (elements.rootVersionStrip) {
        if (!versions.length) {
            elements.rootVersionStrip.innerHTML =
                '<span class="root-history-empty">NO ROOT VERSIONS</span>';
            return;
        }

        elements.rootVersionStrip.innerHTML = versions.map((version, index) => {
            const current = latest && Number(version.version) === Number(latest.version);

            return `
                ${index > 0 ? '<i class="bi bi-arrow-right"></i>' : ""}
                <div class="root-history-version-node${current ? " current" : ""}">
                    <span>V${escapeHTML(version.version)}</span>
                    <small>${current ? "CURRENT" : "SUPERSEDED"}</small>
                </div>
            `;
        }).join("");
    }
}

function renderCustodySummary() {
    const events = Array.isArray(state.custody) ? state.custody : [];
    const latest = events.length ? events[events.length - 1] : null;

    setText(
        elements.custodyCount,
        `${events.length} recorded custody event${events.length === 1 ? "" : "s"}`
    );

    const eventTypes = events.map(event => event.eventType);
    setText(
        elements.custodySummaryEvents,
        eventTypes.length
            ? eventTypes.join(" → ")
            : "NO CUSTODY EVENTS RECORDED"
    );

    setText(elements.custodyLatestType, latest?.eventType || "—");
    setText(
        elements.custodyLatestTime,
        latest ? formatDateTime(latest.timestamp) : "—"
    );

    setText(
        elements.custodyEvidence,
        latest?.evidenceId
            ? `Latest event · ${latest.evidenceId}`
            : "No evidence custody event is available."
    );
}

function renderRootHistoryModal() {
    const list = elements.rootHistoryModalList;
    if (!list) return;

    const versions = [...(state.integrity?.rootVersions || [])]
        .sort((a, b) => Number(b.version) - Number(a.version));

    if (!versions.length) {
        list.innerHTML =
            '<div class="empty-state">No Merkle Root versions are available.</div>';
        return;
    }

    list.innerHTML = versions.map((record, index) => {
        const current =
            state.latestVersion &&
            Number(record.version) === Number(state.latestVersion.version);

        const tx = record.transaction || {};
        const count = record.leafCount ?? record.evidenceRecords?.length ?? 0;

        return `
            <article class="root-history-modal-item${current ? " current" : ""}" style="animation-delay:${index * 70}ms">
                <div class="root-history-modal-marker">
                    <i class="bi ${current ? "bi-check2-circle" : "bi-clock-history"}"></i>
                </div>

                <div class="root-history-modal-main">
                    <div class="root-history-modal-top">
                        <div>
                            <strong>V${escapeHTML(record.version)}</strong>
                            <span>${current ? "CURRENT ROOT" : "HISTORICAL ROOT"}</span>
                        </div>
                        <span class="root-history-modal-status">
                            ${escapeHTML(record.blockchainStatus || "PENDING")}
                        </span>
                    </div>

                    <div class="integrity-copy-row">
                        <strong class="root-history-modal-hash" title="${escapeHTML(record.merkleRoot)}">
                            ${escapeHTML(record.merkleRoot)}
                        </strong>
                        <button
                            class="integrity-copy-button"
                            type="button"
                            data-copy-hash="${escapeHTML(record.merkleRoot)}"
                            title="Copy full Merkle Root"
                        >
                            <i class="bi bi-copy"></i><span>COPY</span>
                        </button>
                    </div>

                    <div class="root-history-modal-meta">
                        <span><i class="bi bi-database"></i> ${count} EVIDENCE ITEMS</span>
                        <span><i class="bi bi-clock"></i> ${formatDateTime(tx.anchoredAt || record.updatedAt || record.createdAt)}</span>
                        <span><i class="bi bi-box-arrow-up-right"></i> BLOCK ${tx.blockNumber ?? "—"}</span>
                    </div>

                    <div class="root-history-modal-meta">
                        <span><i class="bi bi-receipt"></i> TX ${shortHash(tx.transactionHash)}</span>
                        <span><i class="bi bi-link-45deg"></i> ${escapeHTML(tx.contractAddress || "No contract")}</span>
                    </div>

                    <button
                        class="integrity-detail-button secondary verify-history-button"
                        type="button"
                        data-verify-version="${record.version}"
                    >
                        <i class="bi bi-shield-check"></i>
                        <span>Verify V${record.version}</span>
                    </button>
                </div>
            </article>
        `;
    }).join("");

    list.querySelectorAll("[data-verify-version]").forEach(button => {
        button.addEventListener("click", async () => {
            const version = Number(button.dataset.verifyVersion);
            closeDetailModal("rootHistoryModal");
            openIntegrityModal();
            await runRealVerification(version);
        });
    });
}

function renderCustodyModal() {
    const timeline = elements.custodyModalTimeline;
    if (!timeline) return;

    const events = Array.isArray(state.custody)
        ? [...state.custody].reverse()
        : [];

    if (!events.length) {
        timeline.innerHTML =
            '<div class="empty-state">No Chain of Custody events are available.</div>';
        return;
    }

    timeline.innerHTML = events.map((event, index) => {
        const status = event.integrity?.status || "NOT_CHECKED";
        const tone = ["VERIFIED", "ANCHORED"].includes(status)
            ? "success"
            : status === "FAILED"
                ? "failed"
                : "";

        return `
            <article class="custody-modal-event ${tone}" style="animation-delay:${index * 70}ms">
                <div class="custody-modal-marker">
                    <i class="bi ${custodyIcon(event.eventType)}"></i>
                </div>

                <div class="custody-modal-event-main">
                    <div class="custody-modal-event-top">
                        <div>
                            <strong>${escapeHTML(event.eventType)}</strong>
                            <span>${escapeHTML(event.actor?.actorId || "SYSTEM")} · ${escapeHTML(event.actor?.actorRole || "SYSTEM")}</span>
                        </div>
                        <span class="custody-modal-status">${escapeHTML(status)}</span>
                    </div>

                    <div class="custody-modal-details">
                        <span>
                            <b>Evidence</b>
                            ${escapeHTML(event.evidenceId)}
                        </span>

                        <span>
                            <b>Timestamp</b>
                            ${escapeHTML(formatDateTime(event.timestamp))}
                        </span>

                        <span>
                            <b>Details</b>
                            ${escapeHTML(event.details || "No additional details recorded.")}
                        </span>
                    </div>

                    <div class="custody-modal-details">
                        <span>
                            <b>Root Version</b>
                            ${event.integrity?.rootVersion ?? "—"}
                        </span>

                        <span>
                            <b>Merkle Root</b>
                            ${shortHash(event.integrity?.merkleRoot)}
                        </span>

                        <span>
                            <b>Evidence Hash</b>
                            <span class="integrity-copy-row">
                                <code>${escapeHTML(event.integrity?.evidenceHash || "—")}</code>
                                ${event.integrity?.evidenceHash ? `
                                    <button
                                        class="integrity-copy-button compact"
                                        type="button"
                                        data-copy-hash="${escapeHTML(event.integrity.evidenceHash)}"
                                    >
                                        <i class="bi bi-copy"></i><span>COPY</span>
                                    </button>
                                ` : ""}
                            </span>
                        </span>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function custodyIcon(type) {
    const icons = {
        EVIDENCE_CREATED: "bi-file-earmark-plus",
        HASH_GENERATED: "bi-fingerprint",
        ROOT_ANCHORED: "bi-link-45deg",
        ROOT_REANCHORED: "bi-arrow-repeat",
        EVIDENCE_ACCESSED: "bi-person-check",
        VERIFICATION_PASSED: "bi-shield-check",
        INTEGRITY_FAILED: "bi-shield-exclamation"
    };

    return icons[type] || "bi-clock-history";
}

function setResult(status, title, description) {
    if (!elements.verificationCurrentResult) return;

    elements.verificationCurrentResult.dataset.status = status;
    setText(elements.verificationCurrentTitle, title);
    setText(elements.verificationCurrentText, description);
}

function renderVerificationPath(result = null) {
    if (!elements.verificationPathList) return;

    const latest = result || state.verification;
    const evidence = latest?.evidence || [];
    const evidenceValid = latest?.evidenceValid;
    const proofValid = evidence.length > 0 &&
        evidence.every(item => item.merkleProofValid);
    const sourceMatches = evidence.length > 0 &&
        evidence.every(item => item.sourceDataMatches);
    const historicalValid = Boolean(latest?.historicalRootValid);
    const verified = Boolean(latest?.verified);

    const evidenceState = latest
        ? (sourceMatches && evidence.every(item => item.hashMatches) ? "MATCH" : "MISMATCH")
        : "READY";

    const proofState = latest
        ? (proofValid ? "MATCH" : "MISMATCH")
        : "READY";

    const rootState = latest
        ? (evidenceValid && historicalValid ? "MATCH" : "MISMATCH")
        : "READY";

    const chainState = latest
        ? (historicalValid && latest.blockchainStatus === "ANCHORED" ? "MATCH" : "MISMATCH")
        : "READY";

    const rootValue = latest?.merkleRoot
        ? shortHash(latest.merkleRoot)
        : state.latestVersion?.merkleRoot
            ? shortHash(state.latestVersion.merkleRoot)
            : "WAITING";

    const path = [
        {
            number: "01",
            title: "Evidence Hash",
            description: "Recalculate the saved evidence snapshot hash and compare it with the anchored record.",
            value: latest ? `${latest.evidenceCount} evidence records` : "SHA-256",
            status: evidenceState
        },
        {
            number: "02",
            title: "Merkle Proof",
            description: "Validate each saved proof against the preserved Merkle Root.",
            value: latest ? "LEAF + PROOF" : "WAITING",
            status: proofState
        },
        {
            number: "03",
            title: "Reconstructed Root",
            description: "Confirm the verified evidence path resolves to the saved root.",
            value: rootValue,
            status: rootState
        },
        {
            number: "04",
            title: "On-Chain Root",
            description: "Ask the smart contract to verify the selected historical root version.",
            value: latest
                ? `V${latest.version} · ${latest.blockchainStatus}`
                : "WAITING",
            status: chainState
        }
    ];

    elements.verificationPathList.innerHTML = path.map(step => `
        <div class="verification-path-item" data-state="${step.status}">
            <div class="verification-step-number">${step.number}</div>
            <div class="verification-step-copy">
                <strong>${escapeHTML(step.title)}</strong>
                <span>${escapeHTML(step.description)}</span>
            </div>
            <div class="verification-step-value" title="${escapeHTML(step.value)}">
                ${escapeHTML(step.value)}
            </div>
            <div class="verification-step-status">${escapeHTML(step.status)}</div>
        </div>
    `).join("");
}

function createVerificationNode(title, value, status, icon) {
    const wrapper = document.createElement("div");
    wrapper.className = "verification-live-node-wrap";

    const node = document.createElement("div");
    node.className = "verification-live-node";
    node.dataset.status = status;

    node.innerHTML = `
        <div class="verification-live-node-top">
            <span>${escapeHTML(title)}</span>
            <i class="bi ${escapeHTML(icon)}"></i>
        </div>
        <strong>${escapeHTML(value)}</strong>
        <div class="verification-live-node-meta">
            <span>API RESULT</span>
            <strong>${escapeHTML(status)}</strong>
        </div>
    `;

    wrapper.appendChild(node);
    return wrapper;
}

function renderRealVerificationChain(result) {
    if (!elements.verificationChainStage) return;

    const evidenceStatus =
        result.evidenceValid && result.evidence.every(item => item.sourceDataMatches)
            ? "VALID"
            : "MISMATCH";

    const proofStatus =
        result.evidence.length > 0 && result.evidence.every(item => item.merkleProofValid)
            ? "VALID"
            : "MISMATCH";

    const rootStatus = result.historicalRootValid ? "MATCH" : "MISMATCH";
    const anchorStatus =
        result.historicalRootValid && result.blockchainStatus === "ANCHORED"
            ? "MATCH"
            : "MISMATCH";

    const track = document.createElement("div");
    track.className = "verification-live-track";

    const stages = [
        ["EVIDENCE HASH", `${result.evidenceCount} RECORDS`, evidenceStatus, evidenceStatus === "VALID" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"],
        ["MERKLE PROOF", "LEAF + PROOF", proofStatus, proofStatus === "VALID" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"],
        ["HISTORICAL ROOT", `V${result.version}`, rootStatus, rootStatus === "MATCH" ? "bi-check-circle-fill" : "bi-x-circle-fill"],
        ["ON-CHAIN ANCHOR", `BLOCK ${state.integrityVersionBlock ?? "—"}`, anchorStatus, anchorStatus === "MATCH" ? "bi-check-circle-fill" : "bi-x-circle-fill"]
    ];

    stages.forEach((stage, index) => {
        if (index > 0) {
            const arrow = document.createElement("i");
            arrow.className = "bi bi-arrow-right verification-live-arrow";
            arrow.dataset.invalid =
                stage[2] === "MISMATCH" || stages[index - 1][2] === "MISMATCH"
                    ? "true"
                    : "false";
            track.appendChild(arrow);
        }

        const node = createVerificationNode(...stage);
        track.appendChild(node);
    });

    const failedEvidence = result.evidence.filter(item => !item.verified);
    const explanation = document.createElement("div");
    explanation.className =
        `verification-tamper-explanation${result.verified ? "" : " is-failure"}`;

    if (result.verified) {
        explanation.innerHTML = `
            <i class="bi bi-shield-check"></i>
            <span>Backend verification passed. Every stored evidence snapshot matches its hash, Merkle proof and current source data, and the smart contract confirms the historical root.</span>
        `;
    } else if (failedEvidence.length) {
        const ids = failedEvidence.map(item => escapeHTML(item.evidenceId)).join(", ");
        explanation.innerHTML = `
            <i class="bi bi-shield-exclamation"></i>
            <span>Integrity mismatch detected for: <strong>${ids}</strong>. The API result identifies which evidence hash, proof or source-data comparison failed.</span>
        `;
    } else {
        explanation.innerHTML = `
            <i class="bi bi-exclamation-triangle"></i>
            <span>The selected root version did not pass the complete historical on-chain verification.</span>
        `;
    }

    const evidenceResults = document.createElement("div");
    evidenceResults.className = "verification-evidence-results";

    result.evidence.forEach(item => {
        const row = document.createElement("div");
        row.className = "verification-tamper-explanation";
        row.dataset.status = item.verified ? "VALID" : "MISMATCH";

        const reasons = [];

        if (!item.hashMatches) reasons.push("snapshot hash mismatch");
        if (!item.merkleProofValid) reasons.push("Merkle proof mismatch");
        if (!item.sourceDataMatches) reasons.push("source evidence changed after anchoring");

        row.innerHTML = `
            <i class="bi ${item.verified ? "bi-check-circle" : "bi-exclamation-triangle"}"></i>
            <span>
                <strong>${escapeHTML(item.evidenceId)}</strong>
                · ${item.verified
                    ? "HASH + PROOF + SOURCE DATA VALID"
                    : escapeHTML(reasons.join(" · ") || "verification failed")}
            </span>
        `;

        evidenceResults.appendChild(row);
    });

    elements.verificationChainStage.innerHTML = "";
    elements.verificationChainStage.appendChild(track);
    elements.verificationChainStage.appendChild(explanation);
    elements.verificationChainStage.appendChild(evidenceResults);

    const final = document.createElement("div");
    final.className = `verification-chain-final${result.verified ? "" : " tampered"}`;
    final.innerHTML = result.verified
        ? '<i class="bi bi-shield-check"></i> VERIFICATION COMPLETE · HISTORICAL ROOT MATCHES ON-CHAIN'
        : '<i class="bi bi-shield-exclamation"></i> INTEGRITY FAILURE · INVESTIGATION REQUIRED';

    elements.verificationChainStage.appendChild(final);
    elements.verificationChainStage.classList.add("is-visible");
}

async function runRealVerification(version = null) {
    if (!state.incidentId) return;

    const selectedVersion =
        Number(version) ||
        Number(state.latestVersion?.version);

    if (!selectedVersion) {
        setResult(
            "MISMATCH",
            "NO ROOT VERSION",
            "This incident does not have a saved Merkle Root version to verify."
        );
        return;
    }

    if (elements.verifyButton) {
        elements.verifyButton.disabled = true;
        elements.verifyButton.classList.add("is-verifying");
    }

    if (elements.verificationPanelState) {
        elements.verificationPanelState.textContent = "VERIFYING";
    }

    setResult(
        "VERIFYING",
        `VERIFYING V${selectedVersion}...`,
        "Recalculating evidence hashes, validating Merkle proofs and asking the smart contract to verify the historical root."
    );

    renderVerificationPath();

    if (elements.verificationChainStage) {
        elements.verificationChainStage.classList.remove("is-visible");
        elements.verificationChainStage.innerHTML = "";
    }

    try {
        const result = await verifyVersion(state.incidentId, selectedVersion);
        state.verification = result;

        const selectedRecord = state.integrity.rootVersions.find(
            item => Number(item.version) === Number(selectedVersion)
        );

        state.integrityVersionBlock =
            selectedRecord?.transaction?.blockNumber ?? "—";

        renderVerificationPath(result);
        renderRealVerificationChain(result);

        if (elements.verificationPanelState) {
            elements.verificationPanelState.textContent =
                result.verified ? "MATCH" : "MISMATCH";
        }

        if (result.verified) {
            setResult(
                "VERIFIED",
                `V${selectedVersion} INTEGRITY VERIFIED`,
                `Evidence, Merkle proofs and the historical Merkle Root all match the on-chain anchor for incident ${state.incidentId}.`
            );
        } else {
            const failed = result.evidence
                .filter(item => !item.verified)
                .map(item => item.evidenceId);

            setResult(
                "TAMPERED",
                "INTEGRITY MISMATCH DETECTED",
                failed.length
                    ? `Verification failed for ${failed.join(", ")}. Review the evidence-level results below.`
                    : "The selected root version did not match the on-chain integrity record."
            );
        }

        if (modalElements.modal?.classList.contains("is-open")) {
            renderModalResult(result);
            await renderModalDetailedVerification(result);
        }
    } catch (error) {
        console.error("[Investigation Integrity]", error);

        if (elements.verificationPanelState) {
            elements.verificationPanelState.textContent = "ERROR";
        }

        setResult(
            "MISMATCH",
            "VERIFICATION FAILED",
            error.message || "The integrity API could not complete the verification."
        );

        if (elements.verificationChainStage) {
            elements.verificationChainStage.innerHTML = `
                <div class="verification-tamper-explanation is-failure">
                    <i class="bi bi-exclamation-triangle"></i>
                    <span>${escapeHTML(error.message || "Integrity verification failed.")}</span>
                </div>
            `;
            elements.verificationChainStage.classList.add("is-visible");
        }
    } finally {
        if (elements.verifyButton) {
            elements.verifyButton.disabled = false;
            elements.verifyButton.classList.remove("is-verifying");
        }
    }
}

async function hashPairBrowser(leftHex, rightHex) {
    const left = leftHex.replace(/^0x/, "");
    const right = rightHex.replace(/^0x/, "");

    const bytes = new Uint8Array((left.length + right.length) / 2);

    for (let index = 0; index < bytes.length; index += 1) {
        const source = index * 2 < left.length
            ? left.slice(index * 2, index * 2 + 2)
            : right.slice((index * 2) - left.length, (index * 2) - left.length + 2);

        bytes[index] = Number.parseInt(source, 16);
    }

    const digest = await crypto.subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function buildBrowserMerkleLevels(evidence) {
    let current = evidence
        .map(item => String(item.evidenceHash || "").replace(/^0x/, "").toLowerCase())
        .filter(Boolean);

    const levels = [];

    if (!current.length) return levels;

    levels.push(current);

    while (current.length > 1) {
        const next = [];

        for (let index = 0; index < current.length; index += 2) {
            const left = current[index];
            const right = current[index + 1] || left;
            next.push(await hashPairBrowser(left, right));
        }

        current = next;
        levels.push(current);
    }

    return levels;
}

function createForensicNode(hash, label, type, status = "VALID") {
    const node = document.createElement("div");
    node.className = "forensic-merkle-node";
    node.dataset.type = type;
    node.dataset.status = status;

    node.innerHTML = `
        <span class="forensic-node-label">${escapeHTML(label)}</span>
        <strong title="${escapeHTML(hash)}">${escapeHTML(shortHash(hash, 10, 8))}</strong>
        <small>${status === "VALID" ? "✓ VERIFIED" : "⚠ MISMATCH"}</small>
    `;

    return node;
}

async function renderModalMerkleTree(result) {
    const container = document.getElementById("integrityModalMerkle");
    const stateLabel = document.getElementById("integrityModalMerkleState");

    if (!container) return;

    container.innerHTML = "";

    const levels = await buildBrowserMerkleLevels(result.evidence);

    if (!levels.length) {
        container.innerHTML = '<div class="forensic-empty-state">No evidence hashes are available to reconstruct the Merkle Tree.</div>';
        setText(stateLabel, "NO DATA");
        return;
    }

    const expectedRoot = String(result.merkleRoot || "")
        .replace(/^0x/, "")
        .toLowerCase();

    const browserRoot = levels[levels.length - 1][0];
    const rootMatches = browserRoot === expectedRoot;

    setText(stateLabel, rootMatches ? "ROOT MATCH" : "ROOT MISMATCH");

    const flow = document.createElement("div");
    flow.className = "forensic-merkle-tree";

    levels.forEach((level, levelIndex) => {
        const levelWrap = document.createElement("div");
        levelWrap.className = `forensic-merkle-level level-${levelIndex}`;

        const label = document.createElement("div");
        label.className = "forensic-merkle-level-label";

        if (levelIndex === 0) {
            label.textContent = "EVIDENCE LEAVES";
        } else if (levelIndex === levels.length - 1) {
            label.textContent = "MERKLE ROOT";
        } else {
            label.textContent = "PARENT HASHES";
        }

        levelWrap.appendChild(label);

        const nodes = document.createElement("div");
        nodes.className = "forensic-merkle-nodes";

        level.forEach((hash, nodeIndex) => {
            let nodeLabel;
            let nodeType;

            if (levelIndex === 0) {
                nodeLabel = result.evidence[nodeIndex]?.evidenceId || `LEAF ${nodeIndex + 1}`;
                nodeType = "leaf";
            } else if (levelIndex === levels.length - 1) {
                nodeLabel = "MERKLE ROOT";
                nodeType = "root";
            } else {
                nodeLabel = `PARENT H${nodeIndex + 1}`;
                nodeType = "parent";
            }

            const nodeStatus =
                levelIndex === levels.length - 1
                    ? (rootMatches && result.historicalRootValid ? "VALID" : "MISMATCH")
                    : "VALID";

            nodes.appendChild(createForensicNode(hash, nodeLabel, nodeType, nodeStatus));
        });

        levelWrap.appendChild(nodes);
        flow.appendChild(levelWrap);

        if (levelIndex < levels.length - 1) {
            const connector = document.createElement("div");
            connector.className = "forensic-merkle-connector";
            connector.innerHTML = `
                <i class="bi bi-chevron-down"></i>
                <span>${levelIndex === 0 ? "PAIR HASHING" : "ROOT DERIVATION"}</span>
                <i class="bi bi-chevron-down"></i>
            `;
            flow.appendChild(connector);
        }
    });

    const legend = document.createElement("div");
    legend.className = "forensic-merkle-legend";
    legend.innerHTML = `
        <span><i class="bi bi-circle-fill"></i> Evidence leaf</span>
        <span><i class="bi bi-diagram-3"></i> Parent hash</span>
        <span><i class="bi bi-shield-check"></i> Root compared with on-chain anchor</span>
    `;

    container.appendChild(flow);
    container.appendChild(legend);
}

function renderModalEvidence(result) {
    const list = document.getElementById("integrityModalEvidenceList");
    const stateLabel = document.getElementById("integrityModalEvidenceState");
    const versionLabel = document.getElementById("forensicModalVersion");

    if (!list) return;

    const evidence = Array.isArray(result.evidence) ? result.evidence : [];
    const allValid = evidence.length > 0 && evidence.every(item =>
        item.verified && item.hashMatches && item.merkleProofValid && item.sourceDataMatches
    );

    setText(stateLabel, allValid ? "ALL VALID" : "MISMATCH");
    setText(versionLabel, `V${result.version}`);

    list.innerHTML = evidence.map(item => {
        const valid = Boolean(item.verified);

        return `
            <article class="forensic-evidence-item" data-status="${valid ? "VALID" : "MISMATCH"}">
                <div class="forensic-evidence-id">
                    <span class="forensic-evidence-index">EVIDENCE</span>
                    <strong>${escapeHTML(item.evidenceId)}</strong>
                </div>
                <div class="forensic-evidence-hash">
                    <span>SHA-256 EVIDENCE HASH</span>
                    <code title="${escapeHTML(item.evidenceHash || "")}">${escapeHTML(item.evidenceHash || "HASH UNAVAILABLE")}</code>
                </div>
                <div class="forensic-evidence-status">
                    <i class="bi ${valid ? "bi-check2-circle" : "bi-exclamation-triangle"}"></i>
                    <strong>${valid ? "VALID" : "MISMATCH"}</strong>
                    <small>HASH ${item.hashMatches ? "✓" : "✕"} · PROOF ${item.merkleProofValid ? "✓" : "✕"} · SOURCE ${item.sourceDataMatches ? "✓" : "✕"}</small>
                </div>
            </article>
        `;
    }).join("");
}

function renderModalChecks(result) {
    const checks = document.getElementById("integrityModalChecks");
    const finalState = document.getElementById("integrityModalFinalState");
    const anchorState = document.getElementById("integrityModalAnchorState");
    const rootValue = document.getElementById("integrityModalRootValue");

    if (!checks) return;

    const evidenceValid =
        result.evidence.length > 0 &&
        result.evidence.every(item => item.hashMatches && item.sourceDataMatches);

    const proofValid =
        result.evidence.length > 0 &&
        result.evidence.every(item => item.merkleProofValid);

    const historicalValid = Boolean(result.historicalRootValid);
    const anchorValid =
        historicalValid && result.blockchainStatus === "ANCHORED";

    const checksData = [
        {
            title: "Evidence Hash",
            detail: `${result.evidenceCount} evidence snapshots verified`,
            valid: evidenceValid
        },
        {
            title: "Merkle Proof",
            detail: "Every evidence proof resolves against the preserved root",
            valid: proofValid
        },
        {
            title: "Historical Root",
            detail: `Root V${result.version} verified by the integrity service`,
            valid: historicalValid
        },
        {
            title: "On-Chain Anchor",
            detail: anchorValid
                ? "Smart contract confirms the anchored root"
                : "The selected root is not confirmed by the smart contract",
            valid: anchorValid
        }
    ];

    checks.innerHTML = checksData.map(check => `
        <div class="forensic-check-item" data-status="${check.valid ? "VALID" : "MISMATCH"}">
            <i class="bi ${check.valid ? "bi-check-circle-fill" : "bi-x-circle-fill"}"></i>
            <div>
                <strong>${escapeHTML(check.title)}</strong>
                <span>${escapeHTML(check.detail)}</span>
            </div>
            <b>${check.valid ? "MATCH" : "MISMATCH"}</b>
        </div>
    `).join("");

    setText(finalState, result.verified ? "VERIFIED" : "INVESTIGATION REQUIRED");
    setText(anchorState, anchorValid ? "✓ MATCH" : "✕ MISMATCH");
    setText(rootValue, result.merkleRoot || "—");
}

async function renderModalDetailedVerification(result) {
    renderModalEvidence(result);
    renderModalChecks(result);
    await renderModalMerkleTree(result);
}

function renderModalResult(result) {
    if (!modalElements.liveState) return;

    modalElements.liveState.innerHTML = result.verified
        ? '<span class="status-dot"></span> VERIFIED'
        : '<span class="status-dot"></span> MISMATCH';

    const footerMessage = document.getElementById("integrityModalFooterMessage");

    if (footerMessage) {
        footerMessage.innerHTML = result.verified
            ? '<i class="bi bi-shield-check"></i> Verification complete. Evidence, Merkle proofs, historical root and on-chain anchor are consistent.'
            : '<i class="bi bi-shield-exclamation"></i> Real API verification found an integrity mismatch. Review the affected evidence and cryptographic path.';
    }

    const modalEvidence = document.getElementById("integrityModalEvidence");
    const modalRootVersion = document.getElementById("integrityModalRootVersion");

    if (modalEvidence) {
        modalEvidence.textContent = `${result.evidence.length} RECORDS`;
    }

    if (modalRootVersion) {
        modalRootVersion.textContent = `v${result.version}`;
    }
}

const modalElements = {
    modal: document.getElementById("integrityInvestigationModal"),
    close: document.getElementById("closeIntegrityModal"),
    run: document.getElementById("runModalVerification"),
    chain: document.getElementById("integrityModalMerkle"),
    liveState: document.getElementById("integrityModalLiveState"),
    footerMessage: document.getElementById("integrityModalFooterMessage")
};

function openIntegrityModal() {
    if (!modalElements.modal) return;

    modalElements.modal.classList.add("is-open");
    modalElements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("integrity-modal-open");

    if (modalElements.run) {
        modalElements.run.disabled = false;
        modalElements.run.innerHTML =
            '<i class="bi bi-shield-check"></i><span>Start Verification</span>';
    }

    if (modalElements.chain) {
        modalElements.chain.innerHTML = `
            <div class="integrity-modal-placeholder">
                <i class="bi bi-shield-check"></i>
                <strong>Ready for real verification</strong>
                <span>The next check will use the backend integrity API and smart contract.</span>
            </div>
        `;
    }

    if (modalElements.root) modalElements.root.hidden = true;

    const detailGrid = document.getElementById("integrityModalDetailGrid");
    if (detailGrid) detailGrid.hidden = true;

    if (modalElements.liveState) {
        modalElements.liveState.innerHTML =
            '<span class="status-dot"></span> READY';
    }
}

function closeIntegrityModal() {
    if (!modalElements.modal) return;

    modalElements.modal.classList.remove("is-open");
    modalElements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("integrity-modal-open");
}

function closeDetailModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("integrity-modal-open");
}

async function runModalVerification() {
    if (!modalElements.run) return;

    modalElements.run.disabled = true;
    modalElements.run.innerHTML =
        '<i class="bi bi-arrow-repeat"></i><span>Verifying...</span>';

    if (modalElements.chain) {
        modalElements.chain.innerHTML =
            '<div class="integrity-modal-placeholder"><i class="bi bi-arrow-repeat"></i><strong>Running detailed verification...</strong><span>Checking evidence hashes, Merkle proofs, the reconstructed root and the historical on-chain anchor.</span></div>';
    }

    const detailGrid = document.getElementById("integrityModalDetailGrid");
    if (detailGrid) detailGrid.hidden = true;

    await runRealVerification(state.latestVersion?.version);

    if (modalElements.run) {
        modalElements.run.disabled = false;
        modalElements.run.innerHTML =
            '<i class="bi bi-arrow-clockwise"></i><span>Run Again</span>';
    }
}

function initializeDetailModals() {
    const rootModal = document.getElementById("rootHistoryModal");
    const custodyModal = document.getElementById("custodyModal");

    const openModal = modal => {
        if (!modal) return;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("integrity-modal-open");
    };

    const closeModal = modal => {
        if (!modal) return;
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("integrity-modal-open");
    };

    document.getElementById("viewRootHistoryButton")?.addEventListener(
        "click",
        () => openModal(rootModal)
    );

    document.getElementById("viewCustodyButton")?.addEventListener(
        "click",
        () => openModal(custodyModal)
    );

    rootModal?.querySelectorAll(
        "[data-close-root-history], [data-close-detail-modal]"
    ).forEach(button => {
        button.addEventListener("click", () => closeModal(rootModal));
    });

    custodyModal?.querySelectorAll(
        "[data-close-custody], [data-close-detail-modal]"
    ).forEach(button => {
        button.addEventListener("click", () => closeModal(custodyModal));
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (rootModal?.classList.contains("is-open")) {
            closeModal(rootModal);
        }

        if (custodyModal?.classList.contains("is-open")) {
            closeModal(custodyModal);
        }

        if (modalElements.modal?.classList.contains("is-open")) {
            closeIntegrityModal();
        }
    });
}

async function copyIntegrityHash(button) {
    const hash = button?.dataset.copyHash;
    if (!hash) return;

    try {
        await navigator.clipboard.writeText(hash);
    } catch {
        const helper = document.createElement("textarea");
        helper.value = hash;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
    }

    const original = button.innerHTML;
    button.classList.add("copied");
    button.innerHTML = '<i class="bi bi-check2"></i><span>COPIED</span>';

    window.setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = original;
    }, 1400);
}

function initializeCopyButtons() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-copy-hash]");
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        copyIntegrityHash(button);
    });
}

async function loadPage() {
    setPageStatus("LOADING");

    try {
        state.incidentId = await resolveIncidentId();

        const [incident, integrity, custody, blockchain] = await Promise.all([
            fetchIncident(state.incidentId),
            fetchIntegrity(state.incidentId),
            fetchCustody(state.incidentId),
            fetchBlockchainStatus()
        ]);

        state.incident = incident;
        state.integrity = integrity;
        state.custody = Array.isArray(custody) ? custody : [];
        state.blockchain = blockchain;
        state.latestVersion = getLatestVersion();

        const firstEvidence =
            state.latestVersion?.evidenceRecords?.[0]?.evidenceId || "—";

        setText(
            document.getElementById("integrityModalEvidence"),
            firstEvidence
        );

        setText(
            document.getElementById("integrityModalRootVersion"),
            state.latestVersion ? `v${state.latestVersion.version}` : "—"
        );

        renderRootSummary();
        renderCustodySummary();
        renderRootHistoryModal();
        renderCustodyModal();
        renderVerificationPath();

        if (state.latestVersion) {
            setPageStatus(
                state.latestVersion.blockchainStatus === "ANCHORED"
                    ? "INTEGRITY ACTIVE"
                    : "INTEGRITY PENDING"
            );

            setResult(
                "IDLE",
                "READY TO VERIFY",
                `Current root V${state.latestVersion.version} is available. Run the real integrity check to validate the evidence against its anchored root.`
            );
        } else {
            setPageStatus("NO ANCHORED ROOT", "warning");

            setResult(
                "IDLE",
                "NO ROOT AVAILABLE",
                "This incident has no saved Merkle Root version. Generate integrity from the Blockchain Integrity page first."
            );

            if (elements.verifyButton) {
                elements.verifyButton.disabled = true;
            }
        }
    } catch (error) {
        console.error("[Investigation Integrity] Load Error:", error);

        setPageStatus("API UNAVAILABLE", "error");

        setResult(
            "MISMATCH",
            "INTEGRITY DATA UNAVAILABLE",
            error.message || "Unable to load investigation integrity data."
        );

        if (elements.verificationPanelState) {
            elements.verificationPanelState.textContent = "ERROR";
        }
    }
}

function initializePage() {
    elements.verifyButton?.addEventListener("click", openIntegrityModal);
    modalElements.close?.addEventListener("click", closeIntegrityModal);
    modalElements.run?.addEventListener("click", runModalVerification);

    modalElements.modal
        ?.querySelectorAll("[data-close-integrity-modal]")
        .forEach(element => {
            element.addEventListener("click", closeIntegrityModal);
        });

    initializeDetailModals();
    initializeCopyButtons();
    loadPage();
}

document.addEventListener("DOMContentLoaded", initializePage);
