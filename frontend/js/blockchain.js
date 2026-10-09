/* =========================================================
   CYBERTWINX — BLOCKCHAIN INTEGRITY
   Page 1 UI layer
   API-driven blockchain and incident data.
   ========================================================= */

const INTEGRITY_API_BASE_URL = "http://localhost:5000/api/integrity";
const INCIDENT_API_BASE_URL = "http://localhost:5000/api/incident-twin";

const urlParams = new URLSearchParams(window.location.search);

const blockchainState = {
    endpoint: "—",
    incident: null,
    securityState: "UNKNOWN",
    riskScore: 0,
    systemStatus: "LOADING",

    blockchain: {
        connected: false,
        chainId: null,
        contractAddress: null,
        ownerAddress: null
    },

    integrity: {
        evidenceCount: 0,
        rootVersion: "—",
        status: "PENDING",
        network: "—",
        contract: "—",
        transaction: "—",
        block: "—",
        merkleRoot: "",
        anchorStatus: "PENDING"
    },

    evidence: [],
    rootHistory: []
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
    merkleSvg: document.querySelector(".merkle-svg"),
    evidenceLeafCount: document.getElementById("evidenceLeafCount"),

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

    rootHistory: document.getElementById("rootHistory"),
    verificationEvidenceStatus: document.getElementById("verificationEvidenceStatus"),
    verificationProofStatus: document.getElementById("verificationProofStatus"),
    verificationChainStatus: document.getElementById("verificationChainStatus")
};

function setText(element, value) {
    if (element) {
        element.textContent =
            value !== undefined && value !== null && value !== ""
                ? value
                : "—";
    }
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function shortHash(hash, start = 8, end = 6) {
    if (!hash) return "—";
    if (hash.length <= start + end + 3) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);

    let result = null;

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

async function fetchBlockchainStatus() {
    return fetchJSON(`${INTEGRITY_API_BASE_URL}/blockchain/status`);
}

async function fetchIncident(id) {
    return fetchJSON(
        `${INCIDENT_API_BASE_URL}/${encodeURIComponent(id)}`
    );
}

async function fetchAllIncidents() {
    return fetchJSON(INCIDENT_API_BASE_URL);
}

async function fetchIntegrity(id) {
    return fetchJSON(
        `${INTEGRITY_API_BASE_URL}/${encodeURIComponent(id)}`
    );
}

async function fetchLatestIntegrity() {
    return fetchJSON(`${INTEGRITY_API_BASE_URL}/latest`);
}

async function verifyIntegrityVersion(id, version) {
    return fetchJSON(
        `${INTEGRITY_API_BASE_URL}/${encodeURIComponent(id)}/verify/${version}`
    );
}

async function resolveIncidentId() {
    const requestedIncidentId = urlParams.get("incidentId");

    if (requestedIncidentId) {
        return requestedIncidentId;
    }

    const incidents = await fetchAllIncidents();

    if (!Array.isArray(incidents) || incidents.length === 0) {
        throw new Error("No Incident Twin records are available.");
    }

    const sorted = [...incidents].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    return sorted[0].incidentId;
}

function applyBlockchainStatus(status) {
    blockchainState.blockchain.connected = Boolean(status?.connected);
    blockchainState.blockchain.chainId = status?.chainId ?? null;
    blockchainState.blockchain.contractAddress =
        status?.contractAddress ?? null;
    blockchainState.blockchain.ownerAddress =
        status?.ownerAddress ?? null;

    blockchainState.integrity.network =
        status?.chainId === "31337"
            ? "Hardhat Local"
            : status?.chainId
                ? `Chain ${status.chainId}`
                : "—";

    if (status?.contractAddress) {
        blockchainState.integrity.contract = status.contractAddress;
    }
}

function applyIncidentData(incident) {
    blockchainState.incident = incident?.incidentId || null;
    blockchainState.endpoint =
        incident?.endpointHostname ||
        incident?.endpointId ||
        "—";
    blockchainState.securityState =
        incident?.currentState ||
        "UNKNOWN";
    blockchainState.riskScore =
        incident?.riskScore ?? 0;
}

function applyIntegrityData(integrity) {
    if (!integrity || !Array.isArray(integrity.rootVersions)) {
        throw new Error("No blockchain integrity versions were found.");
    }

    const versions = integrity.rootVersions;

    if (versions.length === 0) {
        blockchainState.integrity = {
            ...blockchainState.integrity,
            evidenceCount: 0,
            rootVersion: "—",
            status: "PENDING",
            transaction: "—",
            block: "—",
            merkleRoot: "",
            anchorStatus: "PENDING"
        };

        blockchainState.evidence = [];
        blockchainState.rootHistory = [];
        return;
    }

    const latest = [...versions].sort(
        (a, b) => Number(b.version) - Number(a.version)
    )[0];

    const transaction = latest.transaction || {};

    blockchainState.integrity.evidenceCount =
        latest.leafCount ?? latest.evidenceRecords?.length ?? 0;

    blockchainState.integrity.rootVersion =
        `v${latest.version}`;

    blockchainState.integrity.status =
        latest.blockchainStatus === "ANCHORED"
            ? "ANCHORED"
            : latest.blockchainStatus || "PENDING";

    blockchainState.integrity.contract =
        transaction.contractAddress ||
        blockchainState.blockchain.contractAddress ||
        "—";

    blockchainState.integrity.transaction =
        transaction.transactionHash || "—";

    blockchainState.integrity.block =
        transaction.blockNumber !== null &&
        transaction.blockNumber !== undefined
            ? `#${transaction.blockNumber}`
            : "—";

    blockchainState.integrity.merkleRoot =
        latest.merkleRoot || "";

    blockchainState.integrity.anchorStatus =
        latest.blockchainStatus || "PENDING";

    blockchainState.evidence =
        (latest.evidenceRecords || []).map(record => ({
            id: record.evidenceId,
            type: record.snapshot?.type || "Evidence",
            hash: record.evidenceHash
        }));

    blockchainState.rootHistory = versions
        .slice()
        .sort((a, b) => Number(a.version) - Number(b.version))
        .map(version => ({
            version: `v${version.version}`,
            items: version.leafCount ?? version.evidenceRecords?.length ?? 0,
            root: version.merkleRoot,
            registered:
                formatDateTime(
                    version.transaction?.anchoredAt ||
                    version.updatedAt ||
                    version.createdAt
                ),
            status: version.blockchainStatus
        }));
}

function updateTopbar() {
    setText(elements.topbarEndpoint, blockchainState.endpoint);
    setText(elements.topbarIncident, blockchainState.incident);
    setText(elements.topbarState, blockchainState.securityState);
    setText(elements.topbarRisk, blockchainState.riskScore);
    setText(elements.topbarSystemStatus, blockchainState.systemStatus);

    setText(
        elements.sidebarSystemStatus,
        `SYSTEM ${blockchainState.systemStatus}`
    );
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

    if (!blockchainState.evidence.length) {
        elements.evidenceHashList.innerHTML =
            '<div class="empty-state">No evidence records are available for this integrity version.</div>';
        return;
    }

    elements.evidenceHashList.innerHTML =
        blockchainState.evidence.map((item, index) => {
            return `
                <div class="evidence-hash-card" style="--hash-delay: ${index * 0.14}s">

                    <div class="evidence-hash-index">
                        <span>${String(index + 1).padStart(2, "0")}</span>
                    </div>

                    <div class="evidence-hash-main">

                        <div class="evidence-hash-topline">

                            <div class="evidence-hash-identity">
                                <strong>${escapeHTML(item.id)}</strong>
                                <span>${escapeHTML(item.type)}</span>
                            </div>

                            <div class="evidence-hash-status">
                                <span class="hash-status-dot"></span>
                                HASHED
                            </div>

                        </div>

                        <div class="evidence-hash-value">
                            <span
                                class="evidence-hash-text"
                                title="${escapeHTML(item.hash)}"
                            >${escapeHTML(item.hash)}</span>

                            <button
                                class="copy-hash-button"
                                type="button"
                                data-hash="${escapeHTML(item.hash)}"
                                aria-label="Copy ${escapeHTML(item.id)} hash"
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
    button.innerHTML =
        '<i class="bi bi-check2"></i><span>COPIED</span>';

    window.setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML =
            '<i class="bi bi-copy"></i><span>COPY</span>';
    }, 1400);
}

function initializeHashCopyButtons() {
    document
        .querySelectorAll(".copy-hash-button")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => copyEvidenceHash(button)
            );
        });
}

function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function hexToBytes(hex) {
    const clean = String(hex || "").replace(/^0x/, "");
    const bytes = new Uint8Array(clean.length / 2);

    for (let index = 0; index < clean.length; index += 2) {
        bytes[index / 2] = parseInt(clean.slice(index, index + 2), 16);
    }

    return bytes;
}

async function sha256HexBytes(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return bytesToHex(digest);
}

async function hashPairBrowser(left, right) {
    const leftBytes = hexToBytes(left);
    const rightBytes = hexToBytes(right);
    const combined = new Uint8Array(
        leftBytes.length + rightBytes.length
    );

    combined.set(leftBytes, 0);
    combined.set(rightBytes, leftBytes.length);

    return sha256HexBytes(combined);
}

async function buildMerkleLevelsBrowser(evidence) {
    let currentLevel = evidence.map(item =>
        String(item.hash || "").replace(/^0x/, "")
    );

    const levels = [currentLevel];

    while (currentLevel.length > 1) {
        const nextLevel = [];

        for (let index = 0; index < currentLevel.length; index += 2) {
            const left = currentLevel[index];
            const right = currentLevel[index + 1] || left;

            nextLevel.push(
                await hashPairBrowser(left, right)
            );
        }

        levels.push(nextLevel);
        currentLevel = nextLevel;
    }

    return levels;
}

function createSvgNode(x, y, width, height, label, value, className) {
    return `
        <g class="merkle-${className}-node">
            <rect class="merkle-node ${className}" x="${x}" y="${y}" width="${width}" height="${height}" rx="8"></rect>
            <text class="merkle-node-label" x="${x + width / 2}" y="${y + 24}">${escapeHTML(label)}</text>
            <text class="merkle-node-text" x="${x + width / 2}" y="${y + 48}">${escapeHTML(shortHash(value, 6, 4))}</text>
        </g>
    `;
}

async function renderMerkleTree() {
    if (!elements.merkleSvg) return;

    const evidence = blockchainState.evidence;

    if (!evidence.length) {
        elements.merkleSvg.innerHTML = "";
        return;
    }

    const levels = await buildMerkleLevelsBrowser(evidence);
    // Display the same computed Merkle levels from root (top) to leaves (bottom).
    const displayLevels = [...levels].reverse();
    const svgWidth = Math.max(1000, evidence.length * 190);
    const nodeWidth = 170;
    const nodeHeight = 68;
    const topPadding = 34;
    const levelGap = 128;
    const svgHeight = Math.max(390, topPadding + (displayLevels.length - 1) * levelGap + 100);

    elements.merkleSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    elements.merkleSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const positions = displayLevels.map((hashes, level) => {
        const y = topPadding + level * levelGap;
        const spacing = svgWidth / (hashes.length + 1);
        return hashes.map((hash, index) => ({ x: spacing * (index + 1), y }));
    });

    let markup = "";

    // Draw edges from each parent down to its two children.
    for (let displayLevel = 0; displayLevel < positions.length - 1; displayLevel++) {
        const parents = positions[displayLevel];
        const children = positions[displayLevel + 1];
        for (let index = 0; index < children.length; index++) {
            const parent = parents[Math.floor(index / 2)];
            const child = children[index];
            if (!parent) continue;
            markup += `
                <line class="merkle-line"
                    x1="${parent.x}" y1="${parent.y + (displayLevel === 0 ? 82 : nodeHeight)}"
                    x2="${child.x}" y2="${child.y}"></line>
                <circle class="merkle-particle" r="3.5" cx="${parent.x}" cy="${parent.y + nodeHeight}">
                    <animateMotion dur="2s" begin="${index * 0.16}s" repeatCount="indefinite"
                        path="M 0 0 L ${child.x - parent.x} ${child.y - (parent.y + nodeHeight)}"></animateMotion>
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s"
                        begin="${index * 0.16}s" repeatCount="indefinite"></animate>
                </circle>
            `;
        }
    }

    const rootHash = levels[levels.length - 1][0];
    const root = positions[0][0];
    if (root) {
        markup += `
            <g class="merkle-root-node">
                <rect class="merkle-node root" x="${root.x - 125}" y="${root.y}" width="250" height="82" rx="10"></rect>
                <text class="merkle-node-label" x="${root.x}" y="${root.y + 27}">ROOT · SHA-256</text>
                <text class="merkle-root-text" x="${root.x}" y="${root.y + 51}">${escapeHTML(shortHash("0x" + rootHash, 8, 6))}</text>
                <text class="merkle-node-label" x="${root.x}" y="${root.y + 68}">MERKLE ROOT</text>
            </g>
            <circle class="merkle-root-pulse" cx="${root.x}" cy="${root.y + 41}" r="18"></circle>
        `;
    }

    // Render intermediate parent hashes.
    for (let displayLevel = 1; displayLevel < displayLevels.length - 1; displayLevel++) {
        for (let index = 0; index < displayLevels[displayLevel].length; index++) {
            const node = positions[displayLevel][index];
            const originalLevel = levels.length - 1 - displayLevel;
            markup += createSvgNode(
                node.x - nodeWidth / 2, node.y, nodeWidth, nodeHeight,
                `PARENT H${originalLevel}`, displayLevels[displayLevel][index], "parent"
            );
        }
    }

    // Evidence leaves are always the bottom level.
    const leafLevel = displayLevels.length - 1;
    for (let index = 0; index < displayLevels[leafLevel].length; index++) {
        const node = positions[leafLevel][index];
        markup += createSvgNode(
            node.x - nodeWidth / 2, node.y, nodeWidth, nodeHeight,
            evidence[index]?.id || `EVID-${index + 1}`,
            displayLevels[leafLevel][index],
            "evidence"
        );
    }

    elements.merkleSvg.innerHTML = markup;
}

async function renderMerkleRoot() {
    const root = blockchainState.integrity.merkleRoot;
    const short = shortHash(root, 8, 6);

    setText(
        elements.merkleRootChip,
        root ? `ROOT: ${short}` : "ROOT: —"
    );

    setText(
        elements.merkleRootSvg,
        root ? short : "—"
    );

    setText(
        elements.evidenceLeafCount,
        `${blockchainState.evidence.length} ${blockchainState.evidence.length === 1 ? "LEAF" : "LEAVES"}`
    );

    await renderMerkleTree();
}

function renderAnchor() {
    const integrity = blockchainState.integrity;
    const anchorStatus =
        String(
            integrity.anchorStatus || "PENDING"
        ).toUpperCase();

    setText(
        elements.anchorNetwork,
        integrity.network
    );

    setText(
        elements.anchorNetworkOutput,
        integrity.network
    );

    setText(
        elements.anchorContract,
        integrity.contract
    );

    setText(
        elements.anchorRoot,
        shortHash(
            integrity.merkleRoot,
            10,
            8
        )
    );

    setText(
        elements.anchorTransaction,
        integrity.transaction
    );

    setText(
        elements.anchorBlock,
        integrity.block
    );

    if (elements.anchorStatus) {
        const statusClass =
            ["CONFIRMED", "ANCHORED", "PENDING", "FAILED"]
                .includes(anchorStatus)
                ? anchorStatus
                : "PENDING";

        elements.anchorStatus.dataset.status =
            statusClass;

        const statusText =
            elements.anchorStatus.querySelector(
                ".anchor-status-text"
            );

        if (statusText) {
            statusText.textContent =
                anchorStatus === "ANCHORED"
                    ? "CONFIRMED"
                    : anchorStatus;
        }

        if (elements.anchorOutputStatus) {
            elements.anchorOutputStatus.dataset.status =
                statusClass;

            const outputStatusText =
                elements.anchorOutputStatus.querySelector(
                    ".anchor-status-text"
                );

            if (outputStatusText) {
                outputStatusText.textContent =
                    anchorStatus === "ANCHORED"
                        ? "CONFIRMED"
                        : anchorStatus;
            }
        }
    }
}

function renderVerification() {
    const root =
        shortHash(
            blockchainState.integrity.merkleRoot,
            10,
            8
        );

    setText(
        elements.reconstructedRoot,
        root
    );

    setText(
        elements.verificationOnChainRoot,
        "NOT VERIFIED"
    );

    setText(
        elements.verificationEvidenceStatus,
        blockchainState.integrity.status === "ANCHORED"
            ? "READY"
            : "WAITING"
    );

    setText(
        elements.verificationProofStatus,
        blockchainState.integrity.status === "ANCHORED"
            ? "READY"
            : "WAITING"
    );

    setText(
        elements.verificationChainStatus,
        blockchainState.integrity.status === "ANCHORED"
            ? "READY"
            : "WAITING"
    );

    if (
        blockchainState.integrity.status ===
        "ANCHORED"
    ) {
        setText(
            elements.verificationResult,
            "READY TO VERIFY"
        );

        setText(
            elements.verificationMessage,
            "The current Merkle Root is anchored on-chain. Run verification to validate the evidence and Merkle proofs."
        );
    } else {
        setText(
            elements.verificationResult,
            "NOT ANCHORED"
        );

        setText(
            elements.verificationMessage,
            "This integrity version is not currently anchored on-chain."
        );
    }
}

function renderRootHistory() {
    if (!elements.rootHistory) return;

    if (!blockchainState.rootHistory.length) {
        elements.rootHistory.innerHTML =
            '<div class="empty-state">No Merkle Root history is available.</div>';
        return;
    }

    elements.rootHistory.innerHTML =
        blockchainState.rootHistory.map(item => `
            <div class="root-history-row">
                <span class="mono">${escapeHTML(item.version)}</span>
                <span>${item.items}</span>
                <span
                    class="root-value"
                    title="${escapeHTML(item.root)}"
                >${escapeHTML(shortHash(item.root, 8, 6))}</span>
                <span class="mono">${escapeHTML(item.registered)}</span>
                <span class="root-status">${escapeHTML(item.status)}</span>
            </div>
        `).join("");
}

function setPageLoadingState(isLoading) {
    blockchainState.systemStatus =
        isLoading ? "LOADING" : "ONLINE";

    if (elements.pageLiveStatus) {
        elements.pageLiveStatus.textContent =
            isLoading
                ? "LOADING INTEGRITY DATA"
                : blockchainState.blockchain.connected
                    ? "INTEGRITY ACTIVE"
                    : "BLOCKCHAIN OFFLINE";
    }

    updateTopbar();
}

function showPageError(error) {
    console.error("[CyberTwin] Blockchain Integrity API error:", error);

    blockchainState.systemStatus = "OFFLINE";
    blockchainState.integrity.status = "UNAVAILABLE";

    setText(
        elements.integrityStatusKpi,
        "UNAVAILABLE"
    );

    if (elements.pageLiveStatus) {
        elements.pageLiveStatus.textContent =
            "INTEGRITY DATA UNAVAILABLE";
    }

    if (elements.evidenceHashList) {
        elements.evidenceHashList.innerHTML =
            `
                <div class="empty-state">
                    Unable to load blockchain integrity data.
                    <br>
                    <small>${escapeHTML(error.message)}</small>
                </div>
            `;
    }

    updateTopbar();
}

async function loadBlockchainData() {
    setPageLoadingState(true);

    try {
        const [blockchainStatus, selectedIncidentId] =
            await Promise.all([
                fetchBlockchainStatus(),
                resolveIncidentId()
            ]);

        applyBlockchainStatus(blockchainStatus);

        let integrity;
        let incident = null;
        let resolvedIncidentId = selectedIncidentId;

        try {
            integrity = await fetchIntegrity(selectedIncidentId);
        } catch (selectedError) {
            // The newest Incident Twin may not have a corresponding integrity
            // record. Fall back to the latest saved Blockchain Integrity record.
            integrity = await fetchLatestIntegrity();
            resolvedIncidentId = integrity.incidentId || selectedIncidentId;
        }

        blockchainState.incident = resolvedIncidentId;

        try {
            incident = await fetchIncident(resolvedIncidentId);
        } catch (incidentError) {
            console.warn(
                "[CyberTwin] Incident details unavailable for integrity record:",
                resolvedIncidentId,
                incidentError.message
            );
        }

        if (incident) {
            applyIncidentData(incident);
        } else {
            blockchainState.endpoint = "—";
            blockchainState.securityState = "UNKNOWN";
            blockchainState.riskScore = 0;
        }

        applyIntegrityData(integrity);

        blockchainState.systemStatus =
            blockchainState.blockchain.connected
                ? "ONLINE"
                : "OFFLINE";

        await refreshBlockchainPage();

        console.log(
            "[CyberTwin] Blockchain Integrity API data loaded.",
            {
                incidentId: selectedIncidentId,
                rootVersion:
                    blockchainState.integrity.rootVersion
            }
        );
    } catch (error) {
        showPageError(error);
    } finally {
        if (
            blockchainState.systemStatus ===
            "LOADING"
        ) {
            blockchainState.systemStatus =
                "ONLINE";
        }

        updateTopbar();
    }
}

async function verifyIntegrity() {
    const button =
        elements.verifyIntegrityButton;

    if (!button || !blockchainState.incident) {
        return;
    }

    const version =
        Number(
            String(
                blockchainState.integrity.rootVersion
            ).replace(/^v/, "")
        );

    if (!Number.isSafeInteger(version) || version < 1) {
        return;
    }

    button.disabled = true;
    button.innerHTML =
        '<i class="bi bi-hourglass-split"></i> Verifying...';

    try {
        const result =
            await verifyIntegrityVersion(
                blockchainState.incident,
                version
            );

        blockchainState.integrity.status =
            result.verified
                ? "VERIFIED"
                : "MISMATCH";

        setText(
            elements.integrityStatusKpi,
            blockchainState.integrity.status
        );

        setText(
            elements.verificationResult,
            result.verified
                ? "INTEGRITY VERIFIED"
                : "INTEGRITY MISMATCH"
        );

        setText(
            elements.verificationMessage,
            result.verified
                ? "The evidence hashes, Merkle proofs and historical on-chain root are valid."
                : "One or more evidence records, Merkle proofs or the anchored root failed verification."
        );

        const evidenceResults = Array.isArray(result.evidence)
            ? result.evidence
            : [];

        const allHashesValid =
            evidenceResults.length > 0 &&
            evidenceResults.every(item => item.hashMatches);

        const allProofsValid =
            evidenceResults.length > 0 &&
            evidenceResults.every(item => item.merkleProofValid);

        setText(
            elements.verificationEvidenceStatus,
            allHashesValid ? "VALID" : "MISMATCH"
        );

        setText(
            elements.verificationProofStatus,
            allProofsValid ? "VALID" : "MISMATCH"
        );

        setText(
            elements.verificationChainStatus,
            result.historicalRootValid ? "MATCH" : "MISMATCH"
        );

        setText(
            elements.verificationOnChainRoot,
            result.historicalRootValid
                ? shortHash(result.merkleRoot, 10, 8)
                : "MISMATCH"
        );
    } catch (error) {
        console.error(
            "[CyberTwin] Integrity verification error:",
            error
        );

        setText(
            elements.integrityStatusKpi,
            "VERIFICATION ERROR"
        );

        setText(
            elements.verificationResult,
            "VERIFICATION FAILED"
        );

        setText(
            elements.verificationMessage,
            error.message
        );
    } finally {
        button.disabled = false;
        button.innerHTML =
            '<i class="bi bi-shield-check"></i> Verify Integrity';
    }
}

function initializeNavigation() {
    document
        .querySelectorAll(".nav-item")
        .forEach(item => {
            item.addEventListener(
                "click",
                function () {
                    document
                        .querySelectorAll(".nav-item")
                        .forEach(
                            nav =>
                                nav.classList.remove(
                                    "active"
                                )
                        );

                    this.classList.add("active");
                }
            );
        });
}

async function refreshBlockchainPage() {
    updateTopbar();
    renderOverview();
    renderEvidenceHashes();
    await renderMerkleRoot();
    renderAnchor();
    renderVerification();
    renderRootHistory();
}

function initializeBlockchainPage() {
    loadBlockchainData();

    if (elements.verifyIntegrityButton) {
        elements.verifyIntegrityButton.addEventListener(
            "click",
            verifyIntegrity
        );
    }

    initializeNavigation();

    document.addEventListener(
        "visibilitychange",
        () => {
            if (!document.hidden) {
                loadBlockchainData();
            }
        }
    );

    console.log(
        "[CyberTwin] Blockchain Integrity page initialized."
    );
}

document.addEventListener(
    "DOMContentLoaded",
    initializeBlockchainPage
);
