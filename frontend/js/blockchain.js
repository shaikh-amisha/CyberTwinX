/* =========================================================
   CYBERTWINX — BLOCKCHAIN INTEGRITY
   Page 1 UI layer
   Demo state will later be replaced by backend/blockchain data.
   ========================================================= */

const blockchainState = {
    endpoint: "SERVER-01",
    incident: "INC-001",
    securityState: "COMPROMISED",
    riskScore: 78,
    systemStatus: "ONLINE",

    integrity: {
        evidenceCount: 4,
        rootVersion: "v3",
        status: "VERIFIED",
        network: "Hardhat Local",
        contract: "0x71a...c92",
        transaction: "0x9d3...a41",
        block: "#1842",
        merkleRoot: "8f91a2c7e4d6b9f0c42a1e7b5d3f8a6c",
        anchorStatus: "CONFIRMED"
    },

    evidence: [
        {
            id: "EVID-001",
            type: "Authentication",
            hash: "9f6c8e3d1a72b5e43d7a8c9b1f2e4a6c"
        },
        {
            id: "EVID-002",
            type: "Network",
            hash: "a72b41c9d83e6f108b52c7d14e1a18f2"
        },
        {
            id: "EVID-003",
            type: "Process",
            hash: "c31d8e52f4a967b102c6d8e31f9272e8"
        },
        {
            id: "EVID-004",
            type: "File Integrity",
            hash: "f84a2c19d73b6e408d11a2c94e7f9b11"
        }
    ],

    rootHistory: [
        {
            version: "v1",
            items: 3,
            root: "6a13f4b9d821c7e0...91d2",
            registered: "09:12:21",
            status: "REGISTERED"
        },
        {
            version: "v2",
            items: 4,
            root: "73c8a91e2d64f5b0...47aa",
            registered: "09:18:43",
            status: "REGISTERED"
        },
        {
            version: "v3",
            items: 4,
            root: "8f91a2c7e4d6b9f0...8a6c",
            registered: "09:24:11",
            status: "VERIFIED"
        }
    ]
};

const elements = {
    topbarEndpoint: document.getElementById("topbarEndpoint"),
    topbarIncident: document.getElementById("topbarIncident"),
    topbarState: document.getElementById("topbarState"),
    topbarRisk: document.getElementById("topbarRisk"),
    topbarSystemStatus: document.getElementById("topbarSystemStatus"),
    sidebarSystemStatus: document.getElementById("sidebarSystemStatus"),

    pageLiveStatus: document.getElementById("pageLiveStatus"),

    incidentKpi: document.getElementById("incidentKpi"),
    evidenceCountKpi: document.getElementById("evidenceCountKpi"),
    rootVersionKpi: document.getElementById("rootVersionKpi"),
    integrityStatusKpi: document.getElementById("integrityStatusKpi"),

    evidenceHashList: document.getElementById("evidenceHashList"),
    merkleRootChip: document.getElementById("merkleRootChip"),
    merkleRootSvg: document.getElementById("merkleRootSvg"),

    anchorNetwork: document.getElementById("anchorNetwork"),
    anchorNetworkOutput: document.getElementById("anchorNetworkOutput"),
    anchorContract: document.getElementById("anchorContract"),
    anchorRoot: document.getElementById("anchorRoot"),
    anchorTransaction: document.getElementById("anchorTransaction"),
    anchorBlock: document.getElementById("anchorBlock"),
    anchorStatus: document.getElementById("anchorStatus"),
    anchorOutputStatus: document.getElementById("anchorOutputStatus"),

    reconstructedRoot: document.getElementById("reconstructedRoot"),
    verificationOnChainRoot: document.getElementById("verificationOnChainRoot"),
    verificationResult: document.getElementById("verificationResult"),
    verificationMessage: document.getElementById("verificationMessage"),
    verifyIntegrityButton: document.getElementById("verifyIntegrityButton"),

    rootHistory: document.getElementById("rootHistory")
};

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function shortHash(hash, start = 8, end = 6) {
    if (!hash) return "";
    if (hash.length <= start + end + 3) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function updateTopbar() {
    setText(elements.topbarEndpoint, blockchainState.endpoint);
    setText(elements.topbarIncident, blockchainState.incident);
    setText(elements.topbarState, blockchainState.securityState);
    setText(elements.topbarRisk, blockchainState.riskScore);
    setText(elements.topbarSystemStatus, blockchainState.systemStatus);
    setText(elements.sidebarSystemStatus, `SYSTEM ${blockchainState.systemStatus}`);
}

function renderOverview() {
    const integrity = blockchainState.integrity;

    setText(elements.incidentKpi, blockchainState.incident);
    setText(elements.evidenceCountKpi, integrity.evidenceCount);
    setText(elements.rootVersionKpi, integrity.rootVersion);
    setText(elements.integrityStatusKpi, integrity.status);
}

function renderEvidenceHashes() {
    if (!elements.evidenceHashList) return;

    elements.evidenceHashList.innerHTML = blockchainState.evidence.map((item, index) => {
        return `
            <div class="evidence-hash-card" style="--hash-delay: ${index * 0.14}s">

                <div class="evidence-hash-index">
                    <span>0${index + 1}</span>
                </div>

                <div class="evidence-hash-main">

                    <div class="evidence-hash-topline">

                        <div class="evidence-hash-identity">
                            <strong>${item.id}</strong>
                            <span>${item.type}</span>
                        </div>

                        <div class="evidence-hash-status">
                            <span class="hash-status-dot"></span>
                            HASHED
                        </div>

                    </div>

                    <div class="evidence-hash-value">
                        <span class="evidence-hash-text" title="${item.hash}">${item.hash}</span>
                        <button
                            class="copy-hash-button"
                            type="button"
                            data-hash="${item.hash}"
                            aria-label="Copy ${item.id} hash"
                            title="Copy full SHA-256 hash"
                        >
                            <i class="bi bi-copy"></i>
                            <span>COPY</span>
                        </button>
                    </div>

                    <div class="evidence-hash-meta-row">
                        <span>
                            <i class="bi bi-fingerprint"></i>
                            SHA-256
                        </span>

                        <span>
                            <i class="bi bi-diagram-3"></i>
                            MERKLE LEAF
                        </span>

                        <span class="hash-length">
                            256-BIT
                        </span>
                    </div>

                </div>

                <div class="evidence-hash-scan"></div>

            </div>
        `;
    }).join("");

    initializeHashCopyButtons();
}

async function copyEvidenceHash(button) {
    const hash = button.dataset.hash;
    if (!hash) return;

    try {
        await navigator.clipboard.writeText(hash);
    } catch (error) {
        const textArea = document.createElement("textarea");
        textArea.value = hash;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
    }

    button.classList.add("copied");
    button.innerHTML = '<i class="bi bi-check2"></i><span>COPIED</span>';

    window.setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = '<i class="bi bi-copy"></i><span>COPY</span>';
    }, 1400);
}

function initializeHashCopyButtons() {
    document.querySelectorAll(".copy-hash-button").forEach(button => {
        button.addEventListener("click", () => copyEvidenceHash(button));
    });
}

function renderMerkleRoot() {
    const root = blockchainState.integrity.merkleRoot;
    const short = shortHash(root, 8, 6);

    setText(elements.merkleRootChip, `ROOT: ${short}`);
    setText(elements.merkleRootSvg, short);
}

function renderAnchor() {
    const integrity = blockchainState.integrity;
    const anchorStatus = String(integrity.anchorStatus || "PENDING").toUpperCase();

    setText(elements.anchorNetwork, integrity.network);
    setText(elements.anchorNetworkOutput, integrity.network);
    setText(elements.anchorContract, integrity.contract);
    setText(elements.anchorRoot, shortHash(integrity.merkleRoot, 10, 8));
    setText(elements.anchorTransaction, integrity.transaction);
    setText(elements.anchorBlock, integrity.block);

    if (elements.anchorStatus) {
        const statusClass = ["CONFIRMED", "PENDING", "FAILED"].includes(anchorStatus)
            ? anchorStatus
            : "PENDING";

        elements.anchorStatus.dataset.status = statusClass;
        elements.anchorStatus.querySelector(".anchor-status-text").textContent = anchorStatus;

        if (elements.anchorOutputStatus) {
            elements.anchorOutputStatus.dataset.status = statusClass;
            elements.anchorOutputStatus.querySelector(".anchor-status-text").textContent = anchorStatus;
        }
    }
}

function renderVerification() {
    const root = shortHash(blockchainState.integrity.merkleRoot, 10, 8);

    setText(elements.reconstructedRoot, root);
    setText(elements.verificationOnChainRoot, root);
    setText(elements.verificationResult, "INTEGRITY VERIFIED");
    setText(
        elements.verificationMessage,
        "The reconstructed Merkle Root matches the root anchored on-chain for the current evidence set."
    );
}

function renderRootHistory() {
    if (!elements.rootHistory) return;

    elements.rootHistory.innerHTML = blockchainState.rootHistory.map(item => `
        <div class="root-history-row">
            <span class="mono">${item.version}</span>
            <span>${item.items}</span>
            <span class="root-value" title="${item.root}">${item.root}</span>
            <span class="mono">${item.registered}</span>
            <span class="root-status">${item.status}</span>
        </div>
    `).join("");
}

function verifyIntegrity() {
    const button = elements.verifyIntegrityButton;
    if (!button) return;

    button.disabled = true;
    button.innerHTML = '<i class="bi bi-hourglass-split"></i> Verifying...';

    setTimeout(() => {
        /*
         * Demo verification only.
         * Later this will call the backend verification endpoint,
         * which will calculate the evidence hash, Merkle proof/root,
         * and compare it with the on-chain root.
         */
        const integrityValid = true;

        if (integrityValid) {
            blockchainState.integrity.status = "VERIFIED";
            setText(elements.integrityStatusKpi, "VERIFIED");
            setText(elements.verificationResult, "INTEGRITY VERIFIED");
            setText(
                elements.verificationMessage,
                "The reconstructed Merkle Root matches the root anchored on-chain for the current evidence set."
            );
        } else {
            blockchainState.integrity.status = "MISMATCH";
            setText(elements.integrityStatusKpi, "MISMATCH");
            setText(elements.verificationResult, "INTEGRITY MISMATCH");
            setText(
                elements.verificationMessage,
                "The reconstructed Merkle Root does not match the root anchored on-chain."
            );
        }

        button.disabled = false;
        button.innerHTML = '<i class="bi bi-shield-check"></i> Verify Integrity';
    }, 900);
}

function initializeNavigation() {
    document.querySelectorAll(".nav-item").forEach(item => {
        item.addEventListener("click", function () {
            document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
            this.classList.add("active");
        });
    });
}

function refreshBlockchainPage() {
    updateTopbar();
    renderOverview();
    renderEvidenceHashes();
    renderMerkleRoot();
    renderAnchor();
    renderVerification();
    renderRootHistory();
}

function initializeBlockchainPage() {
    refreshBlockchainPage();

    if (elements.verifyIntegrityButton) {
        elements.verifyIntegrityButton.addEventListener("click", verifyIntegrity);
    }

    initializeNavigation();

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            refreshBlockchainPage();
        }
    });

    console.log("[CyberTwin] Blockchain Integrity page initialized.");
}

document.addEventListener("DOMContentLoaded", initializeBlockchainPage);
