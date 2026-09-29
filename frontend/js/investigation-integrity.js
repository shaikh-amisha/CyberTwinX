/* =========================================================
   INVESTIGATION INTEGRITY
   Page 2 — Demo interactions
   ========================================================= */

const investigationIntegrityState = {
    incidentId: "INC-001",
    evidenceId: "EVID-001",
    evidenceHash: "9f6c3a12b7d48e91f02a65c4d8837e10...",
    merkleRoot: "8f91a2c7e4b61d09c5aa739f18d5de32...8a6c",
    verification: "VERIFIED",

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
    verificationBlocks: Array.from(document.querySelectorAll(".verification-block")),
    verificationArrows: Array.from(document.querySelectorAll(".verification-arrow")),
    proofConnector: document.querySelector(".verification-proof-connector"),

    merkleRoot: document.getElementById("verificationMerkleRoot"),
    evidenceId: document.getElementById("verificationEvidenceId"),
    evidenceHash: document.getElementById("verificationEvidenceHash"),

    result: document.getElementById("verificationResult"),
    resultIcon: document.getElementById("verificationResultIcon"),
    resultTitle: document.getElementById("verificationResultTitle"),
    resultText: document.getElementById("verificationResultText"),
    resultState: document.getElementById("verificationResultState"),

    rootHistoryList: document.getElementById("rootHistoryList"),
    custodyTimeline: document.getElementById("custodyTimeline")
};

function setText(element, value) {
    if (element) {
        element.textContent = value ?? "";
    }
}

function renderVerificationContext() {
    setText(pageElements.merkleRoot, investigationIntegrityState.merkleRoot);
    setText(pageElements.evidenceId, investigationIntegrityState.evidenceId);
    setText(pageElements.evidenceHash, investigationIntegrityState.evidenceHash);
}

function renderRootHistory() {
    if (!pageElements.rootHistoryList) return;

    pageElements.rootHistoryList.innerHTML = investigationIntegrityState.rootHistory
        .map((record, index) => {
            const currentClass = record.status === "CURRENT" ? " current" : "";
            const icon = record.status === "CURRENT"
                ? "bi-check2"
                : "bi-clock-history";

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
        })
        .join("");
}

function renderCustodyTimeline() {
    if (!pageElements.custodyTimeline) return;

    pageElements.custodyTimeline.innerHTML = investigationIntegrityState.custody
        .map((event, index) => {
            return `
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
            `;
        })
        .join("");
}

function clearVerificationClasses() {
    pageElements.verificationBlocks.forEach(block => {
        block.classList.remove("is-traversing", "is-verified", "is-tampered");
    });

    pageElements.verificationArrows.forEach(arrow => {
        arrow.classList.remove("is-active", "is-success");
    });
}

function setVerificationResult(status, title, text, state, iconClass) {
    if (!pageElements.result) return;

    pageElements.result.dataset.status = status;
    setText(pageElements.resultTitle, title);
    setText(pageElements.resultText, text);
    setText(pageElements.resultState, state);

    if (pageElements.resultIcon) {
        pageElements.resultIcon.className = `bi ${iconClass}`;
    }
}

function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function runIntegrityVerification() {
    if (!pageElements.verifyButton) return;

    pageElements.verifyButton.disabled = true;
    pageElements.verifyButton.classList.add("is-verifying");

    clearVerificationClasses();

    setVerificationResult(
        "VERIFYING",
        "VERIFYING EVIDENCE INTEGRITY",
        "Traversing the blockchain anchor and comparing the evidence proof against the registered Merkle Root.",
        "VERIFYING",
        "bi-arrow-repeat"
    );

    if (pageElements.proofConnector) {
        pageElements.proofConnector.classList.add("is-running");
    }

    for (let index = 0; index < pageElements.verificationBlocks.length; index += 1) {
        const block = pageElements.verificationBlocks[index];
        block.classList.add("is-traversing");

        if (index > 0 && pageElements.verificationArrows[index - 1]) {
            pageElements.verificationArrows[index - 1].classList.add("is-active");
        }

        await wait(520);

        block.classList.remove("is-traversing");

        if (investigationIntegrityState.verification === "VERIFIED") {
            block.classList.add("is-verified");
        } else {
            block.classList.add("is-tampered");
        }

        if (index > 0 && pageElements.verificationArrows[index - 1]) {
            pageElements.verificationArrows[index - 1].classList.remove("is-active");
            pageElements.verificationArrows[index - 1].classList.add(
                investigationIntegrityState.verification === "VERIFIED"
                    ? "is-success"
                    : "is-active"
            );
        }
    }

    await wait(350);

    if (pageElements.proofConnector) {
        pageElements.proofConnector.classList.remove("is-running");
    }

    if (investigationIntegrityState.verification === "VERIFIED") {
        setVerificationResult(
            "VERIFIED",
            "EVIDENCE INTEGRITY VERIFIED",
            "The evidence proof matches the anchored Merkle Root. No integrity mismatch was detected in the current evidence set.",
            "VERIFIED",
            "bi-shield-check"
        );
    } else {
        setVerificationResult(
            "TAMPERED",
            "INTEGRITY MISMATCH DETECTED",
            "The current evidence proof does not match the anchored Merkle Root. The evidence should be investigated for modification.",
            "TAMPERED",
            "bi-shield-exclamation"
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
    renderVerificationContext();
    renderRootHistory();
    renderCustodyTimeline();
    initializeVerification();
}

document.addEventListener("DOMContentLoaded", initializePage);
