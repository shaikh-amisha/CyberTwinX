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


const demoBlocks = [
    { number: "0000", label: "GENESIS", meta: "CHAIN START", hash: "000000...GEN" },
    { number: "0001", label: "BLOCK", meta: "ANCHOR TX", hash: "7e0021...a91f" },
    { number: "0002", label: "BLOCK", meta: "ROOT V2", hash: "6b70c5...22d4" },
    { number: "0003", label: "BLOCK", meta: "ROOT V3", hash: "4fcf45...e81b" }
];

function createLiveBlock(block, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "verification-live-node-wrap";
    wrapper.dataset.index = String(index);

    if (index > 0) {
        const arrow = document.createElement("i");
        arrow.className = "bi bi-arrow-right verification-live-arrow";
        arrow.dataset.fromIndex = String(index - 1);
        wrapper.appendChild(arrow);
    }

    const node = document.createElement("button");
    node.type = "button";
    node.className = "verification-live-node";
    node.dataset.blockIndex = String(index);
    node.dataset.status = "VALID";
    node.disabled = index === 0;

    node.innerHTML = `
        <div class="verification-live-node-top">
            <span>${block.label}</span>
            <i class="bi ${index === 0 ? "bi-circle-fill" : "bi-check-circle-fill"}"></i>
        </div>
        <strong>#${block.number}</strong>
        <div class="verification-live-node-meta">
            <span>${block.meta}</span>
            <strong>${block.hash}</strong>
        </div>
    `;

    if (index > 0) {
        node.addEventListener("click", () => selectTamperedBlock(index));
    }

    wrapper.appendChild(node);
    return wrapper;
}

function getLiveNode(index) {
    return pageElements.verificationChainStage?.querySelector(
        \`.verification-live-node[data-block-index="${index}"]\`
    );
}

function updateLiveChainVisual(tamperedIndex) {
    const nodes = pageElements.verificationChainStage?.querySelectorAll(".verification-live-node");
    const arrows = pageElements.verificationChainStage?.querySelectorAll(".verification-live-arrow");
    if (!nodes) return;

    nodes.forEach((node, index) => {
        node.classList.remove("is-selected");
        node.dataset.status = "VALID";

        if (tamperedIndex > 0 && index === tamperedIndex) {
            node.dataset.status = "TAMPERED";
            node.classList.add("is-selected");
            node.querySelector(".verification-live-node-top i").className =
                "bi bi-exclamation-triangle-fill";
        } else if (tamperedIndex > 0 && index > tamperedIndex) {
            node.dataset.status = "INVALID";
            node.querySelector(".verification-live-node-top i").className =
                "bi bi-x-circle-fill";
        } else {
            node.querySelector(".verification-live-node-top i").className =
                index === 0 ? "bi bi-circle-fill" : "bi bi-check-circle-fill";
        }
    });

    arrows?.forEach((arrow, index) => {
        arrow.dataset.invalid =
            tamperedIndex > 0 && index >= tamperedIndex ? "true" : "false";
    });

    pageElements.verificationChainStage
        .querySelectorAll(".verification-tamper-option")
        .forEach(button => {
            button.classList.toggle(
                "active",
                Number(button.dataset.tamperIndex) === tamperedIndex
            );
        });

    const status = document.getElementById("verificationTamperStatus");
    const explanation = document.getElementById("verificationTamperExplanation");
    const final = document.getElementById("verificationChainFinal");

    if (!status || !explanation || !final) return;

    if (tamperedIndex < 1) {
        status.textContent = "NO TAMPER SELECTED";
        explanation.innerHTML = `
            <i class="bi bi-info-circle"></i>
            <span>Choose a block or click a block above to simulate a tamper event.</span>
        `;
        final.className = "verification-chain-final";
        final.innerHTML = `
            <i class="bi bi-shield-check"></i>
            CHAIN TRAVERSAL COMPLETE · ANCHOR VALID
        `;
        return;
    }

    const blockNumber = demoBlocks[tamperedIndex].number.replace(/^0+/, "");
    status.textContent = \`BLOCK ${blockNumber} TAMPERED\`;

    explanation.innerHTML = `
        <i class="bi bi-exclamation-triangle"></i>
        <span>Block ${blockNumber} changed: its hash changed, so every later block's previous-hash link is invalid.</span>
    `;

    final.className = "verification-chain-final tampered";
    final.innerHTML = `
        <i class="bi bi-shield-exclamation"></i>
        TAMPER DETECTED · BLOCK ${blockNumber} + SUBSEQUENT LINKS INVALID
    `;
}

function selectTamperedBlock(index) {
    if (!pageElements.verificationChainStage?.querySelector(".verification-live-node")) return;

    updateLiveChainVisual(index);

    if (index < 1) {
        pageElements.verificationPanelState.textContent = "MATCH";
        setResult(
            "VERIFIED",
            "INTEGRITY VERIFIED",
            "The blockchain traversal is valid. No tamper event is selected."
        );
        return;
    }

    const blockNumber = demoBlocks[index].number.replace(/^0+/, "");
    pageElements.verificationPanelState.textContent = "TAMPERED";

    setResult(
        "TAMPERED",
        \`BLOCK ${blockNumber} TAMPERED\`,
        \`Block ${blockNumber} was modified. Its hash no longer matches the chain, invalidating every subsequent link.\`
    );
}

function renderLiveChainShell() {
    if (!pageElements.verificationChainStage) return;

    pageElements.verificationChainStage.innerHTML = `
        <div class="verification-chain-stage-live">
            <div class="verification-live-caption">
                <div>
                    <strong>LIVE BLOCKCHAIN VERIFICATION</strong>
                    <span>Traverse each block and inspect hash-link integrity.</span>
                </div>
                <span class="verification-live-state" id="verificationLiveState">TRAVERSING...</span>
            </div>

            <div class="verification-live-track" id="verificationLiveTrack"></div>

            <div class="verification-chain-root" id="verificationLiveRoot" hidden>
                <span>MERKLE ROOT ANCHORED ON-CHAIN</span>
                <strong>${investigationIntegrityState.merkleRoot}</strong>
            </div>

            <div class="verification-chain-proof" id="verificationLiveProof" hidden>
                <span>EVIDENCE PROOF · ${investigationIntegrityState.evidenceId} · SHA-256 MATCH</span>
            </div>

            <div class="verification-tamper-console" id="verificationTamperConsole">
                <div class="verification-tamper-header">
                    <div>
                        <strong>TAMPER ANALYSIS</strong>
                        <span>Select a block to see how a changed hash invalidates every later link.</span>
                    </div>
                    <span class="verification-tamper-status" id="verificationTamperStatus">NO TAMPER SELECTED</span>
                </div>

                <div class="verification-tamper-options" role="group" aria-label="Select tampered block">
                    <button class="verification-tamper-option active" type="button" data-tamper-index="-1">—</button>
                    <button class="verification-tamper-option" type="button" data-tamper-index="1">1</button>
                    <button class="verification-tamper-option" type="button" data-tamper-index="2">2</button>
                    <button class="verification-tamper-option" type="button" data-tamper-index="3">3</button>
                </div>

                <div class="verification-tamper-explanation" id="verificationTamperExplanation">
                    <i class="bi bi-info-circle"></i>
                    <span>Choose a block or click a block above to simulate a tamper event.</span>
                </div>
            </div>

            <div class="verification-chain-final" id="verificationChainFinal">
                <i class="bi bi-shield-check"></i>
                CHAIN TRAVERSAL COMPLETE · ANCHOR VALID
            </div>
        </div>
    `;

    pageElements.verificationChainStage.classList.add("is-visible");

    pageElements.verificationChainStage
        .querySelectorAll(".verification-tamper-option")
        .forEach(button => {
            button.addEventListener("click", () => {
                selectTamperedBlock(Number(button.dataset.tamperIndex));
            });
        });
}

async function runLiveBlockchainTraversal() {
    renderLiveChainShell();

    const track = document.getElementById("verificationLiveTrack");
    const root = document.getElementById("verificationLiveRoot");
    const proof = document.getElementById("verificationLiveProof");
    const state = document.getElementById("verificationLiveState");

    if (!track || !state) return;

    for (let index = 0; index < demoBlocks.length; index += 1) {
        track.appendChild(createLiveBlock(demoBlocks[index], index));
        await wait(650);

        const node = getLiveNode(index);
        if (node) node.classList.add("is-verified");

        if (index > 0) {
            const arrow = pageElements.verificationChainStage.querySelector(
                \`.verification-live-arrow[data-from-index="${index - 1}"]\`
            );
            if (arrow) arrow.style.opacity = "1";
        }
    }

    if (root) root.hidden = false;
    if (proof) proof.hidden = false;

    await wait(300);
    state.textContent = "ANCHOR REACHED";

    const consolePanel = document.getElementById("verificationTamperConsole");
    if (consolePanel) consolePanel.classList.add("is-visible");

    pageElements.verificationPanelState.textContent = "MATCH";

    setResult(
        "VERIFIED",
        "INTEGRITY VERIFIED",
        "The chain reached the anchored Merkle Root. Select any block to inspect how tampering propagates through subsequent links."
    );

    updateLiveChainVisual(-1);
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
        await wait(550);

        setPathStepState(
            index,
            index < 2
                ? "READY"
                : investigationIntegrityState.verification === "VERIFIED"
                    ? "MATCH"
                    : "MISMATCH"
        );
    }

    await wait(200);

    if (investigationIntegrityState.verification === "VERIFIED") {
        setPathStepState(0, "READY");
        setPathStepState(1, "READY");
        setPathStepState(2, "MATCH");
        setPathStepState(3, "MATCH");

        setResult(
            "VERIFIED",
            "INTEGRITY VERIFIED",
            "The reconstructed Merkle Root matches the root anchored on-chain. Beginning live blockchain traversal..."
        );

        await runLiveBlockchainTraversal();
    } else {
        pageElements.verificationPanelState.textContent = "MISMATCH";
        setPathStepState(2, "MISMATCH");
        setPathStepState(3, "MISMATCH");

        setResult(
            "TAMPERED",
            "INTEGRITY MISMATCH DETECTED",
            "The reconstructed Merkle Root does not match the anchored root. The evidence requires further investigation."
        );
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
