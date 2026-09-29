/* =========================================================
   INVESTIGATION INTEGRITY
   Page 2 — Demo interactions
   ========================================================= */

const investigationIntegrityState = {
    incidentId: "INC-001",
    evidenceId: "EVID-001",
    evidenceHash: "9f6c3a12b7d48e91f02a65c4d8837e10...",
    merkleRoot: "8f91a2c7e4b61d09c5aa739f18d5de32...8a6c",

    // Demo state only. This will later be replaced by the
    // real backend + blockchain verification result.
    verification: "VERIFIED",

    verificationPath: [
        {
            number: "01",
            title: "Evidence Hash",
            description: "Recalculate SHA-256 from the evidence snapshot.",
            value: "SHA-256 / EVID-001",
            ready: "READY"
        },
        {
            number: "02",
            title: "Merkle Proof",
            description: "Use the evidence leaf and its proof path.",
            value: "LEAF + PROOF",
            ready: "READY"
        },
        {
            number: "03",
            title: "Reconstructed Root",
            description: "Rebuild the root from the verified evidence path.",
            value: "8f91a2c7...8a6c",
            ready: "MATCH"
        },
        {
            number: "04",
            title: "On-Chain Root",
            description: "Compare against the immutable root anchor.",
            value: "8f91a2c7...8a6c",
            ready: "MATCH"
        }
    ],

    rootHistory: [
        {
            version: "v1",
            root: "3c71f4b8...19d2",
            evidenceCount: 2,
            timestamp: "2026-09-24 09:12:41",
            status: "SUPERSEDED"
        },
        {
            version: "v2",
            root: "6a4e91c2...73bf",
            evidenceCount: 3,
            timestamp: "2026-09-24 11:36:18",
            status: "SUPERSEDED"
        },
        {
            version: "v3",
            root: "8f91a2c7...8a6c",
            evidenceCount: 4,
            timestamp: "2026-09-25 14:08:52",
            status: "CURRENT"
        }
    ],

    custody: [
        {
            type: "CREATED",
            actor: "Endpoint Twin",
            actorRole: "SYSTEM",
            evidence: "EVID-001",
            hash: "9f6c3a12...4a6c",
            time: "2026-09-25 13:42:18",
            status: "RECORDED",
            tone: "success",
            icon: "bi-file-earmark-plus"
        },
        {
            type: "HASHED",
            actor: "Integrity Engine",
            actorRole: "CRYPTOGRAPHIC SERVICE",
            evidence: "EVID-001",
            hash: "9f6c3a12...4a6c",
            time: "2026-09-25 13:42:24",
            status: "RECORDED",
            tone: "success",
            icon: "bi-fingerprint"
        },
        {
            type: "REGISTERED",
            actor: "Blockchain Service",
            actorRole: "ON-CHAIN REGISTRAR",
            evidence: "EVID-001",
            hash: "9f6c3a12...4a6c",
            time: "2026-09-25 14:08:52",
            status: "CONFIRMED",
            tone: "success",
            icon: "bi-link-45deg"
        },
        {
            type: "ACCESSED",
            actor: "Investigator-01",
            actorRole: "FORENSIC ANALYST",
            evidence: "EVID-001",
            hash: "9f6c3a12...4a6c",
            time: "2026-09-25 14:21:07",
            status: "LOGGED",
            tone: "",
            icon: "bi-person-check"
        },
        {
            type: "VERIFIED",
            actor: "Integrity Engine",
            actorRole: "VERIFICATION SERVICE",
            evidence: "EVID-001",
            hash: "9f6c3a12...4a6c",
            time: "2026-09-25 14:22:16",
            status: "MATCH",
            tone: "success",
            icon: "bi-shield-check"
        }
    ]
};

const pageElements = {
    verifyButton: document.getElementById("verifyIntegrityButton"),
    verificationPathList: document.getElementById("verificationPathList"),
    verificationPanelState: document.getElementById("verificationPanelState"),
    verificationCurrentResult: document.getElementById("verificationCurrentResult"),
    verificationCurrentTitle: document.getElementById("verificationCurrentTitle"),
    verificationCurrentText: document.getElementById("verificationCurrentText"),
    verificationChainStage: document.getElementById("verificationChainStage"),
    rootHistoryList: document.getElementById("rootHistoryList"),
    custodyTimeline: document.getElementById("custodyTimeline")
};

function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

function renderVerificationPath() {
    if (!pageElements.verificationPathList) return;

    pageElements.verificationPathList.innerHTML =
        investigationIntegrityState.verificationPath.map(step => `
            <div class="verification-path-item" data-state="${step.ready}">
                <div class="verification-step-number">${step.number}</div>

                <div class="verification-step-copy">
                    <strong>${step.title}</strong>
                    <span>${step.description}</span>
                </div>

                <div class="verification-step-value" title="${step.value}">
                    ${step.value}
                </div>

                <div class="verification-step-status">
                    ${step.ready}
                </div>
            </div>
        `).join("");
}

function renderRootHistory() {
    if (!pageElements.rootHistoryList) return;

    pageElements.rootHistoryList.innerHTML =
        investigationIntegrityState.rootHistory.map((record, index) => {
            const currentClass = record.status === "CURRENT" ? " current" : "";
            const icon = record.status === "CURRENT" ? "bi-check2" : "bi-clock-history";

            return `
                <div class="root-history-item${currentClass}" style="animation-delay: ${index * 70}ms">
                    <div class="root-history-marker">
                        <i class="bi ${icon}"></i>
                    </div>

                    <div class="root-history-version">
                        <strong>${record.version}</strong>
                        <span>${record.evidenceCount} EVIDENCE ITEMS</span>
                    </div>

                    <div class="root-history-hash">
                        <strong title="${record.root}">${record.root}</strong>
                        <span>SHA-256 MERKLE ROOT</span>
                    </div>

                    <div class="root-history-meta">
                        <span class="root-history-time">${record.timestamp}</span>
                        <span class="root-history-status">
                            <span class="hash-status-dot"></span>
                            ${record.status}
                        </span>
                    </div>
                </div>
            `;
        }).join("");
}

function renderCustodyTimeline() {
    if (!pageElements.custodyTimeline) return;

    pageElements.custodyTimeline.innerHTML =
        investigationIntegrityState.custody.map((event, index) => `
            <div class="custody-event ${event.tone}" style="animation-delay: ${index * 70}ms">
                <div class="custody-marker">
                    <i class="bi ${event.icon}"></i>
                </div>

                <div class="custody-event-main">
                    <span class="custody-event-type">${event.type}</span>
                    <span class="custody-event-actor">${event.actor} · ${event.actorRole}</span>
                </div>

                <div class="custody-event-details">
                    <span class="custody-event-evidence">${event.evidence}</span>
                    <span class="custody-event-hash" title="${event.hash}">${event.hash}</span>
                </div>

                <div class="custody-event-meta">
                    <span class="custody-event-time">${event.time}</span>
                    <span class="custody-event-status">
                        <span class="status-dot"></span>
                        ${event.status}
                    </span>
                </div>
            </div>
        `).join("");
}

function setResult(status, title, description) {
    if (!pageElements.verificationCurrentResult) return;

    pageElements.verificationCurrentResult.dataset.status = status;
    pageElements.verificationCurrentTitle.textContent = title;
    pageElements.verificationCurrentText.textContent = description;
}

function setPathStepState(index, state) {
    const item = pageElements.verificationPathList?.children[index];
    if (!item) return;

    item.dataset.state = state;

    const status = item.querySelector(".verification-step-status");
    if (status) status.textContent = state;
}

function renderVerifiedChainStage() {
    if (!pageElements.verificationChainStage) return;

    pageElements.verificationChainStage.innerHTML = `
        <div class="verification-chain-stage-track">

            <div class="verification-chain-node is-verified">
                <span>GENESIS</span>
                <strong>#0000</strong>
                <span>CHAIN START</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-verified">
                <span>BLOCK</span>
                <strong>#0001</strong>
                <span>ANCHOR TX</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-verified">
                <span>BLOCK</span>
                <strong>#0002</strong>
                <span>ROOT V2</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-active">
                <span>BLOCK</span>
                <strong>#0003</strong>
                <span>ROOT V3</span>
            </div>

        </div>

        <div class="verification-chain-root">
            <span>MERKLE ROOT ANCHORED ON-CHAIN</span>
            <strong>${investigationIntegrityState.merkleRoot}</strong>
        </div>

        <div class="verification-chain-proof">
            <span>EVIDENCE PROOF · ${investigationIntegrityState.evidenceId} · SHA-256 MATCH</span>
        </div>

        <div class="verification-chain-result">
            <i class="bi bi-shield-check"></i>
            EVIDENCE INTEGRITY VERIFIED
        </div>
    `;

    pageElements.verificationChainStage.classList.add("is-visible");
}

function renderTamperedChainStage() {
    if (!pageElements.verificationChainStage) return;

    pageElements.verificationChainStage.innerHTML = `
        <div class="verification-chain-stage-track">

            <div class="verification-chain-node is-verified">
                <span>GENESIS</span>
                <strong>#0000</strong>
                <span>CHAIN START</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-verified">
                <span>BLOCK</span>
                <strong>#0001</strong>
                <span>ANCHOR TX</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-verified">
                <span>BLOCK</span>
                <strong>#0002</strong>
                <span>ROOT V2</span>
            </div>

            <i class="bi bi-arrow-right verification-chain-arrow"></i>

            <div class="verification-chain-node is-tampered">
                <span>TAMPERED BLOCK</span>
                <strong>#0003</strong>
                <span>ROOT MISMATCH</span>
            </div>

        </div>

        <div class="verification-chain-root">
            <span>ANCHORED MERKLE ROOT</span>
            <strong>${investigationIntegrityState.merkleRoot}</strong>
        </div>

        <div class="verification-chain-proof">
            <span>RECONSTRUCTED ROOT · MISMATCH DETECTED</span>
        </div>

        <div class="verification-chain-result tampered">
            <i class="bi bi-shield-exclamation"></i>
            TAMPER DETECTED · EVIDENCE REQUIRES INVESTIGATION
        </div>
    `;

    pageElements.verificationChainStage.classList.add("is-visible");
}

async function runIntegrityVerification() {
    if (!pageElements.verifyButton) return;

    pageElements.verifyButton.disabled = true;
    pageElements.verifyButton.classList.add("is-verifying");
    pageElements.verificationPanelState.textContent = "VERIFYING";

    if (pageElements.verificationChainStage) {
        pageElements.verificationChainStage.classList.remove("is-visible");
        pageElements.verificationChainStage.innerHTML = "";
    }

    setResult(
        "VERIFYING",
        "VERIFYING...",
        "Recalculating the evidence hash, evaluating the Merkle proof and comparing the reconstructed root with the on-chain anchor."
    );

    investigationIntegrityState.verificationPath.forEach((_, index) => {
        setPathStepState(index, "READY");
    });

    for (let index = 0; index < investigationIntegrityState.verificationPath.length; index += 1) {
        setPathStepState(index, "VERIFYING");
        await wait(650);

        if (index < 2) {
            setPathStepState(index, "READY");
        } else {
            setPathStepState(
                index,
                investigationIntegrityState.verification === "VERIFIED"
                    ? "MATCH"
                    : "MISMATCH"
            );
        }
    }

    await wait(250);

    if (investigationIntegrityState.verification === "VERIFIED") {
        pageElements.verificationPanelState.textContent = "MATCH";

        setPathStepState(0, "READY");
        setPathStepState(1, "READY");
        setPathStepState(2, "MATCH");
        setPathStepState(3, "MATCH");

        setResult(
            "VERIFIED",
            "INTEGRITY VERIFIED",
            "The reconstructed Merkle Root matches the root anchored on-chain for the current evidence set."
        );

        renderVerifiedChainStage();
    } else {
        pageElements.verificationPanelState.textContent = "MISMATCH";

        setPathStepState(0, "READY");
        setPathStepState(1, "READY");
        setPathStepState(2, "MISMATCH");
        setPathStepState(3, "MISMATCH");

        setResult(
            "TAMPERED",
            "INTEGRITY MISMATCH DETECTED",
            "The reconstructed Merkle Root does not match the anchored root. The evidence requires further investigation."
        );

        renderTamperedChainStage();
    }

    pageElements.verifyButton.disabled = false;
    pageElements.verifyButton.classList.remove("is-verifying");
}

function initializeVerification() {
    if (!pageElements.verifyButton) return;
    pageElements.verifyButton.addEventListener("click", runIntegrityVerification);
}

function initializePage() {
    renderVerificationPath();
    renderRootHistory();
    renderCustodyTimeline();
    initializeVerification();
}

document.addEventListener("DOMContentLoaded", initializePage);
