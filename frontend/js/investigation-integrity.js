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
    const modalList = document.getElementById("rootHistoryModalList");
    if (!modalList) return;

    modalList.innerHTML = investigationIntegrityState.rootHistory.slice().reverse().map((record, index) => {
        const current = record.status === "CURRENT";
        return `
            <article class="root-history-modal-item${current ? " current" : ""}" style="animation-delay:${index * 70}ms">
                <div class="root-history-modal-marker"><i class="bi ${current ? "bi-check2-circle" : "bi-clock-history"}"></i></div>
                <div class="root-history-modal-main">
                    <div class="root-history-modal-top">
                        <div><strong>${record.version.toUpperCase()}</strong><span>${current ? "CURRENT ROOT" : "SUPERSEDED ROOT"}</span></div>
                        <span class="root-history-modal-status">${record.status}</span>
                    </div>
                    <div class="integrity-copy-row">
    <strong class="root-history-modal-hash" title="${record.root}">${record.root}</strong>
    <button class="integrity-copy-button" type="button" data-copy-hash="${record.root}" aria-label="Copy ${record.version} Merkle Root" title="Copy full Merkle Root">
        <i class="bi bi-copy"></i><span>COPY</span>
    </button>
</div>
                    <div class="root-history-modal-meta">
                        <span><i class="bi bi-database"></i> ${record.evidenceCount} EVIDENCE ITEMS</span>
                        <span><i class="bi bi-clock"></i> ${record.timestamp}</span>
                        <span><i class="bi bi-link-45deg"></i> ${current ? "CURRENT ON-CHAIN ANCHOR" : "HISTORICAL REFERENCE"}</span>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

function renderCustodyTimeline() {
    const modalTimeline = document.getElementById("custodyModalTimeline");
    if (!modalTimeline) return;

    modalTimeline.innerHTML = investigationIntegrityState.custody.slice().reverse().map((event, index) => `
        <article class="custody-modal-event ${event.tone}" style="animation-delay:${index * 70}ms">
            <div class="custody-modal-marker"><i class="bi ${event.icon}"></i></div>
            <div class="custody-modal-event-main">
                <div class="custody-modal-event-top">
                    <div><strong>${event.type}</strong><span>${event.actor} · ${event.actorRole}</span></div>
                    <span class="custody-modal-status">${event.status}</span>
                </div>
                <div class="custody-modal-details">
                    <span><b>Evidence</b> ${event.evidence}</span>
                    <span><b>Timestamp</b> ${event.time}</span>
                    <span><b>Hash</b><span class="integrity-copy-row">
    <code>${event.hash}</code>
    <button class="integrity-copy-button compact" type="button" data-copy-hash="${event.hash}" aria-label="Copy ${event.type} evidence hash" title="Copy full evidence hash">
        <i class="bi bi-copy"></i><span>COPY</span>
    </button>
</span></span>
                </div>
            </div>
        </article>
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
        `.verification-live-node[data-block-index="${index}"]`
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
    status.textContent = `BLOCK ${blockNumber} TAMPERED`;

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
        `BLOCK ${blockNumber} TAMPERED`,
        `Block ${blockNumber} was modified. Its hash no longer matches the chain, invalidating every subsequent link.`
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
                `.verification-live-arrow[data-from-index="${index - 1}"]`
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


const modalElements = {
    modal: document.getElementById("integrityInvestigationModal"),
    close: document.getElementById("closeIntegrityModal"),
    run: document.getElementById("runModalVerification"),
    chain: document.getElementById("integrityModalChain"),
    root: document.getElementById("integrityModalRootRow"),
    analysis: document.getElementById("integrityModalAnalysis"),
    liveState: document.getElementById("integrityModalLiveState"),
    footerMessage: document.getElementById("integrityModalFooterMessage"),
    analysisTitle: document.getElementById("integrityAnalysisTitle"),
    analysisStatus: document.getElementById("integrityAnalysisStatus"),
    analysisText: document.getElementById("integrityAnalysisText")
};

function openIntegrityModal() {
    if (!modalElements.modal) return;
    modalElements.modal.classList.add("is-open");
    modalElements.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("integrity-modal-open");
    resetIntegrityModal();
}

function closeIntegrityModal() {
    if (!modalElements.modal) return;
    modalElements.modal.classList.remove("is-open");
    modalElements.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("integrity-modal-open");
}

function resetIntegrityModal() {
    if (!modalElements.chain) return;

    modalElements.chain.innerHTML =
        '<div class="integrity-modal-placeholder">' +
        '<i class="bi bi-shield-check"></i>' +
        '<strong>Ready for verification</strong>' +
        '<span>Start the integrity check to traverse the blockchain.</span>' +
        '</div>';

    if (modalElements.root) modalElements.root.hidden = true;
    if (modalElements.analysis) modalElements.analysis.hidden = true;

    if (modalElements.liveState) {
        modalElements.liveState.innerHTML = '<span class="status-dot"></span> READY';
    }

    if (modalElements.footerMessage) {
        modalElements.footerMessage.innerHTML =
            '<i class="bi bi-info-circle"></i> Verification will run live from Genesis to the anchored root.';
    }

    if (modalElements.run) {
        modalElements.run.disabled = false;
        modalElements.run.innerHTML =
            '<i class="bi bi-shield-check"></i><span>Start Verification</span>';
    }

    setResult(
        "IDLE",
        "READY TO VERIFY",
        "Open the investigation window to run the blockchain integrity check."
    );

    investigationIntegrityState.verificationPath.forEach(function(_, index) {
        setPathStepState(index, "READY");
    });

    if (pageElements.verificationPanelState) {
        pageElements.verificationPanelState.textContent = "READY";
    }
}

function createModalBlock(block, index) {
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

    node.innerHTML =
        '<div class="verification-live-node-top">' +
            '<span>' + block.label + '</span>' +
            '<i class="bi ' + (index === 0 ? "bi-circle-fill" : "bi-check-circle-fill") + '"></i>' +
        '</div>' +
        '<strong>#' + block.number + '</strong>' +
        '<div class="verification-live-node-meta">' +
            '<span>' + block.meta + '</span>' +
            '<strong>' + block.hash + '</strong>' +
        '</div>';

    if (index > 0) {
        node.addEventListener("click", function() {
            selectModalTamperedBlock(index);
        });
    }

    wrapper.appendChild(node);
    return wrapper;
}

function updateModalChain(tamperedIndex) {
    const nodes = modalElements.chain?.querySelectorAll(".verification-live-node");
    const arrows = modalElements.chain?.querySelectorAll(".verification-live-arrow");

    if (!nodes) return;

    nodes.forEach(function(node, index) {
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

    arrows?.forEach(function(arrow, index) {
        arrow.dataset.invalid =
            tamperedIndex > 0 && index >= tamperedIndex ? "true" : "false";
    });

    modalElements.analysis?.querySelectorAll(".integrity-tamper-control").forEach(function(button) {
        button.classList.toggle(
            "active",
            Number(button.dataset.tamperIndex) === tamperedIndex
        );
    });

    if (!modalElements.analysisTitle || !modalElements.analysisStatus || !modalElements.analysisText) return;

    if (tamperedIndex < 1) {
        modalElements.analysisTitle.textContent = "Chain verified";
        modalElements.analysisStatus.textContent = "NO TAMPER SELECTED";
        modalElements.analysisText.textContent =
            "The chain is valid. Select a block to inspect how a changed hash propagates through subsequent links.";
        return;
    }

    const blockNumber = demoBlocks[tamperedIndex].number.replace(/^0+/, "");
    modalElements.analysisTitle.textContent = "Block " + blockNumber + " tampered";
    modalElements.analysisStatus.textContent = "BLOCK " + blockNumber + " TAMPERED";
    modalElements.analysisText.textContent =
        "Block " + blockNumber + " changed: its hash no longer matches the chain, so every subsequent block's previous-hash link is invalid.";
}

function selectModalTamperedBlock(index) {
    updateModalChain(index);

    if (index < 1) {
        if (modalElements.liveState) {
            modalElements.liveState.innerHTML =
                '<span class="status-dot"></span> ANCHOR VALID';
        }

        setResult(
            "VERIFIED",
            "INTEGRITY VERIFIED",
            "The blockchain is valid. No tamper event is selected."
        );
        return;
    }

    const blockNumber = demoBlocks[index].number.replace(/^0+/, "");

    if (modalElements.liveState) {
        modalElements.liveState.innerHTML =
            '<span class="status-dot"></span> TAMPER DETECTED';
    }

    setResult(
        "TAMPERED",
        "BLOCK " + blockNumber + " TAMPERED",
        "Block " + blockNumber + " was modified. Its hash no longer matches the chain, invalidating every subsequent link."
    );
}

async function runModalVerification() {
    if (!modalElements.run || !modalElements.chain) return;

    modalElements.run.disabled = true;
    modalElements.run.innerHTML =
        '<i class="bi bi-arrow-repeat"></i><span>Verifying...</span>';

    modalElements.chain.innerHTML =
        '<div class="verification-live-track" id="integrityModalLiveTrack"></div>';

    const track = document.getElementById("integrityModalLiveTrack");

    if (modalElements.liveState) {
        modalElements.liveState.innerHTML =
            '<span class="status-dot"></span> TRAVERSING';
    }

    setResult(
        "VERIFYING",
        "VERIFYING...",
        "Running the evidence hash, Merkle proof and on-chain root comparison."
    );

    for (let index = 0; index < investigationIntegrityState.verificationPath.length; index += 1) {
        setPathStepState(index, "VERIFYING");
        await wait(430);
        setPathStepState(index, index < 2 ? "READY" : "MATCH");
    }

    for (let index = 0; index < demoBlocks.length; index += 1) {
        track.appendChild(createModalBlock(demoBlocks[index], index));
        await wait(650);

        const node = track.querySelector(
            '.verification-live-node[data-block-index="' + index + '"]'
        );

        if (node) node.classList.add("is-verified");

        if (index > 0) {
            const arrow = track.querySelector(
                '.verification-live-arrow[data-from-index="' + (index - 1) + '"]'
            );
            if (arrow) arrow.style.opacity = "1";
        }
    }

    if (modalElements.root) modalElements.root.hidden = false;
    if (modalElements.analysis) modalElements.analysis.hidden = false;

    if (modalElements.liveState) {
        modalElements.liveState.innerHTML =
            '<span class="status-dot"></span> ANCHOR REACHED';
    }

    if (modalElements.footerMessage) {
        modalElements.footerMessage.innerHTML =
            '<i class="bi bi-check-circle"></i> Chain traversal complete. Select a block to investigate tampering.';
    }

    modalElements.run.disabled = false;
    modalElements.run.innerHTML =
        '<i class="bi bi-arrow-clockwise"></i><span>Run Again</span>';

    setResult(
        "VERIFIED",
        "INTEGRITY VERIFIED",
        "The reconstructed Merkle Root matches the on-chain anchor. Select a block below to investigate tampering."
    );

    updateModalChain(-1);
}

function initializeVerification() {
    if (!pageElements.verifyButton || !modalElements.modal) return;

    pageElements.verifyButton.addEventListener("click", openIntegrityModal);
    modalElements.close?.addEventListener("click", closeIntegrityModal);
    modalElements.run?.addEventListener("click", runModalVerification);

    modalElements.modal
        .querySelectorAll("[data-close-integrity-modal]")
        .forEach(function(element) {
            element.addEventListener("click", closeIntegrityModal);
        });

    modalElements.analysis
        ?.querySelectorAll(".integrity-tamper-control")
        .forEach(function(button) {
            button.addEventListener("click", function() {
                selectModalTamperedBlock(Number(button.dataset.tamperIndex));
            });
        });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && modalElements.modal.classList.contains("is-open")) {
            closeIntegrityModal();
        }
    });
}

async function copyIntegrityHash(button) {
    const hash = button?.dataset.copyHash;
    if (!hash) return;

    try {
        await navigator.clipboard.writeText(hash);
    } catch (error) {
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

function initializeIntegrityCopyButtons() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-copy-hash]");
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();
        copyIntegrityHash(button);
    });
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

    document.getElementById("viewRootHistoryButton")?.addEventListener("click", () => openModal(rootModal));
    document.getElementById("viewCustodyButton")?.addEventListener("click", () => openModal(custodyModal));

    rootModal?.querySelectorAll("[data-close-root-history], [data-close-detail-modal]").forEach(button => {
        button.addEventListener("click", () => closeModal(rootModal));
    });

    custodyModal?.querySelectorAll("[data-close-custody], [data-close-detail-modal]").forEach(button => {
        button.addEventListener("click", () => closeModal(custodyModal));
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (rootModal?.classList.contains("is-open")) closeModal(rootModal);
        if (custodyModal?.classList.contains("is-open")) closeModal(custodyModal);
    });
}

function initializePage() {
    renderVerificationPath();
    renderRootHistory();
    renderCustodyTimeline();
    initializeVerification();
    initializeDetailModals();
    initializeIntegrityCopyButtons();
}

document.addEventListener("DOMContentLoaded", initializePage);
