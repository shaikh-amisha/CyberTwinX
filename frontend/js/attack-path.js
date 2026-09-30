/* =========================================================
   CYBERTWINX — ATTACK PATH ANALYSIS
   Linear Investigation Graph
   ========================================================= */

const API_BASE_URL = "http://localhost:5000/api";
const INCIDENT_API_URL = `${API_BASE_URL}/incident-twin`;
const GRAPH_API_URL = `${API_BASE_URL}/attack-graph`;

let allIncidents = [];
let currentIncident = null;
let currentIncidentId = null;
let cy = null;

let flowTimer = null;
let nodePulseTimer = null;
let attackFlowLayer = null;
let attackFlowParticles = [];
let attackRootPulse = null;
let attackFlowStart = 0;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
    if (!value) return "Unknown";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}


/* =========================================================
   TOPBAR
   ========================================================= */

function updateTopbar(incident) {
    if (!incident) return;

    const endpointEl = $("topbarEndpoint");
    const incidentEl = $("topbarIncident");
    const stateEl = $("topbarState");
    const riskEl = $("topbarRisk");

    const endpoint =
        incident.endpointHostname ||
        incident.endpointId ||
        "UNKNOWN";

    const incidentId =
        incident.incidentId ||
        "NO INCIDENT";

    const state =
        incident.currentState ||
        incident.endpointState ||
        "UNKNOWN";

    const risk =
        incident.riskScore !== undefined &&
        incident.riskScore !== null
            ? `${incident.riskScore}/100`
            : "--";

    if (endpointEl) {
        endpointEl.textContent = endpoint;
    }

    if (incidentEl) {
        incidentEl.textContent = incidentId;
    }

    if (stateEl) {
        stateEl.textContent = state;
        stateEl.dataset.state = String(state).toLowerCase();
    }

    if (riskEl) {
        riskEl.textContent = risk;
        riskEl.dataset.level =
            String(incident.riskLevel || "").toLowerCase();
    }

    updateSystemStatus(incident);
}


/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function updateSystemStatus(incident) {
    const state =
        String(
            incident?.currentState ||
            incident?.endpointState ||
            ""
        ).toUpperCase();

    const statusText =
        state === "COMPROMISED"
            ? "THREAT DETECTED"
            : state === "SUSPICIOUS"
                ? "INVESTIGATION ACTIVE"
                : "SYSTEM MONITORED";

    const topbarStatus = $("topbarSystemStatus");
    const sidebarStatus = $("sidebarSystemStatus");

    if (topbarStatus) {
        topbarStatus.textContent = statusText;
    }

    if (sidebarStatus) {
        sidebarStatus.textContent = statusText;
    }
}


/* =========================================================
   URL
   ========================================================= */

function getIncidentIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("incidentId");
}

function updateUrl(incidentId) {
    if (!incidentId) return;

    const url = new URL(window.location.href);

    url.searchParams.set("incidentId", incidentId);

    window.history.replaceState(
        {},
        "",
        url.toString()
    );
}


/* =========================================================
   INCIDENT API
   ========================================================= */

async function fetchIncidents() {
    const response = await fetch(INCIDENT_API_URL);

    if (!response.ok) {
        throw new Error(
            `Incident API returned ${response.status}`
        );
    }

    const result = await response.json();

    if (Array.isArray(result)) {
        return result;
    }

    if (Array.isArray(result.data)) {
        return result.data;
    }

    if (Array.isArray(result.incidents)) {
        return result.incidents;
    }

    if (result.data && Array.isArray(result.data.incidents)) {
        return result.data.incidents;
    }

    return [];
}


/* =========================================================
   GRAPH API
   ========================================================= */

async function fetchAttackGraph(incidentId) {
    try {
        const response = await fetch(
            `${GRAPH_API_URL}/${encodeURIComponent(incidentId)}`
        );

        if (!response.ok) {
            throw new Error("Attack graph unavailable");
        }

        const result = await response.json();

        const graphData =
            result?.data?.nodes
                ? result.data
                : result?.nodes
                    ? result
                    : null;

        /*
         * Do not render an empty graph for an incident that has
         * no dedicated Attack Graph response. Fall back to the
         * selected Incident Twin so every incident remains
         * explorable from the selector.
         */
        if (
            graphData &&
            Array.isArray(graphData.nodes) &&
            graphData.nodes.length > 0
        ) {
            return graphData;
        }

        throw new Error("Attack graph contains no nodes");

    } catch (error) {
        console.warn(
            "Attack Graph API unavailable. Building graph from Incident Twin.",
            error
        );

        return buildGraphFromIncident(currentIncident);
    }
}


/* =========================================================
   FALLBACK GRAPH BUILDER
   ========================================================= */

function buildGraphFromIncident(incident) {
    if (!incident) {
        return {
            incident: null,
            nodes: [],
            edges: []
        };
    }

    const nodes = [];
    const edges = [];

    const incidentId =
        `incident-${incident.incidentId}`;

    const endpointId =
        `endpoint-${incident.endpointId || "unknown"}`;

    nodes.push({
        id: incidentId,
        type: "Incident",
        label: incident.incidentId || "Incident",
        data: {
            title: incident.incidentId || "Incident",
            description: incident.incidentType || "Security Incident",
            severity: incident.severity,
            state: incident.currentState,
            riskScore: incident.riskScore,
            confidence: incident.confidence
        }
    });

    nodes.push({
        id: endpointId,
        type: "Endpoint",
        label:
            incident.endpointHostname ||
            incident.endpointId ||
            "Endpoint",
        data: {
            title:
                incident.endpointHostname ||
                incident.endpointId ||
                "Endpoint",
            endpointId: incident.endpointId,
            state: incident.endpointState
        }
    });

    edges.push({
        id: `${incidentId}-${endpointId}`,
        source: incidentId,
        target: endpointId,
        relationship: "OBSERVED"
    });

    const progression =
        Array.isArray(incident.attackProgression)
            ? incident.attackProgression
            : Array.isArray(incident.timeline)
                ? incident.timeline
                    .map(item => item?.event || item?.title || item?.description)
                    .filter(Boolean)
                : [];

    const activityIds = [];

    progression.forEach((step, index) => {
        const id =
            `activity-${index}-${sanitizeId(step)}`;

        activityIds.push(id);

        nodes.push({
            id,
            type: "Activity",
            label: step,
            data: {
                title: step,
                description:
                    "Observed attack activity.",
                timestamp:
                    incident.timeline?.[index]?.time || null
            }
        });

        edges.push({
            id: `${endpointId}-${id}`,
            source: endpointId,
            target: id,
            relationship: "OBSERVED"
        });
    });

    const evidence =
        Array.isArray(incident.evidence)
            ? incident.evidence
            : [];

    evidence.forEach((item, index) => {
        const id =
            `evidence-${index}-${sanitizeId(
                item.evidenceId || item.type || "evidence"
            )}`;

        nodes.push({
            id,
            type: "Evidence",
            label:
                item.evidenceId ||
                item.type ||
                "Evidence",
            data: {
                title:
                    item.evidenceId ||
                    item.type ||
                    "Evidence",
                evidenceId: item.evidenceId,
                type: item.type,
                severity: item.severity,
                status: item.status,
                description: item.description,
                telemetryId: item.telemetryId
            }
        });

        const evidenceParent =
            activityIds.length
                ? activityIds[index % activityIds.length]
                : endpointId;

        edges.push({
            id: `${evidenceParent}-${id}`,
            source: evidenceParent,
            target: id,
            relationship: "SUPPORTS"
        });
    });

    if (incident.incidentType) {
        const threatId =
            `threat-${sanitizeId(incident.incidentType)}`;

        nodes.push({
            id: threatId,
            type: "Threat",
            label: incident.incidentType,
            data: {
                title: incident.incidentType,
                severity: incident.severity,
                riskScore: incident.riskScore,
                riskLevel: incident.riskLevel,
                confidence: incident.confidence,
                state: incident.currentState
            }
        });

        edges.push({
            id: `${incidentId}-${threatId}`,
            source: incidentId,
            target: threatId,
            relationship: "INDICATES"
        });

        if (activityIds.length) {
            edges.push({
                id: `${threatId}-${activityIds[0]}`,
                source: threatId,
                target: activityIds[0],
                relationship: "CORRELATED"
            });
        }
    }

    if (incident.currentObjective) {
        const objectiveId =
            `objective-${sanitizeId(
                incident.currentObjective
            )}`;

        nodes.push({
            id: objectiveId,
            type: "Potential",
            label: incident.currentObjective,
            data: {
                title: incident.currentObjective,
                description:
                    "Potential current objective.",
                objective: incident.currentObjective
            }
        });

        const objectiveSource =
            incident.incidentType
                ? `threat-${sanitizeId(incident.incidentType)}`
                : incidentId;

        edges.push({
            id: `${objectiveSource}-${objectiveId}`,
            source: objectiveSource,
            target: objectiveId,
            relationship: "POTENTIAL"
        });
    }

    return {
        incident,
        nodes,
        edges
    };
}


/* =========================================================
   ID SANITIZER
   ========================================================= */

function sanitizeId(value) {
    return String(value || "node")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}


/* =========================================================
   GRAPH NORMALIZATION
   ========================================================= */

function normalizeGraph(graph) {
    if (!graph) {
        return {
            nodes: [],
            edges: []
        };
    }

    const nodes = Array.isArray(graph.nodes)
        ? graph.nodes
        : [];

    const edges = Array.isArray(graph.edges)
        ? graph.edges
        : [];

    return {
        nodes: nodes.map((node, index) => ({
            id:
                String(
                    node.id ||
                    node._id ||
                    `node-${index}`
                ),

            label:
                node.label ||
                node.name ||
                node.title ||
                node.id ||
                `Node ${index + 1}`,

            type:
                node.type ||
                node.nodeType ||
                "Activity",

            data:
                node.data ||
                node.details ||
                node
        })),

        edges: edges
            .map((edge, index) => ({
                id:
                    String(
                        edge.id ||
                        `${edge.source}-${edge.target}-${index}`
                    ),

                source: String(edge.source),

                target: String(edge.target),

                relationship:
                    edge.relationship ||
                    edge.type ||
                    edge.relation ||
                    "OBSERVED"
            }))
            .filter(edge =>
                edge.source &&
                edge.target
            )
    };
}


/* =========================================================
   CYTOSCAPE GRAPH
   ========================================================= */

function createGraph(graph) {
    destroyGraph();

    const normalized = normalizeGraph(graph);

    if (!window.cytoscape) {
        console.error("Cytoscape.js is not loaded.");
        return;
    }

    const loadingIndicator = $("attackGraph")?.querySelector(".graph-loading-indicator");
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    const elements = [
        ...normalized.nodes.map(node => ({
            group: "nodes",
            data: {
                id: node.id,
                label: node.label,
                type: node.type,
                details: node.data
            }
        })),

        ...normalized.edges.map(edge => ({
            group: "edges",
            data: {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                relationship: edge.relationship
            }
        }))
    ];

    cy = cytoscape({
        container: $("attackGraph"),

        elements,

        layout: {
            name: "preset",
            fit: false,
            padding: 80
        },

        minZoom: 0.2,
        maxZoom: 2.2,

        style: [
            {
                selector: "node",

                style: {
                    "width": 180,
                    "height": 70,

                    "shape": "roundrectangle",

                    "background-color": "#0d141c",
                    "border-width": 2,
                    "border-color": "#00e5ff",

                    "label": "data(label)",
                    "color": "#dcecf5",

                    "font-size": 14,
                    "font-weight": 700,

                    "text-wrap": "wrap",
                    "text-max-width": 150,

                    "text-valign": "center",
                    "text-halign": "center",

                    "overlay-opacity": 0,

                    "shadow-blur": 12,
                    "shadow-opacity": 0.7,
                    "shadow-color": "#00e5ff",

                    "opacity": 1
                }
            },

            {
                selector: "node[type='Incident']",

                style: {
                    "width": 205,
                    "height": 82,
                    "background-color": "#101a22",
                    "border-color": "#00e5ff",
                    "border-width": 2.5,
                    "shadow-color": "#00e5ff",
                    "font-size": 15,
                    "font-weight": 800,
                    "text-max-width": 175
                }
            },

            {
                selector: "node[type='Endpoint']",

                style: {
                    "background-color": "#0c1720",
                    "border-color": "#27dfff",
                    "shadow-color": "#27dfff"
                }
            },

            {
                selector: "node[type='Activity']",

                style: {
                    "background-color": "#0c151c",
                    "border-color": "#39dfff",
                    "shadow-color": "#39dfff"
                }
            },

            {
                selector: "node[type='Evidence']",

                style: {
                    "width": 170,
                    "height": 66,
                    "background-color": "#0d1718",
                    "border-color": "#20d8a0",
                    "shadow-color": "#20d8a0",
                    "font-size": 12,
                    "text-max-width": 145
                }
            },

            {
                selector: "node[type='Threat']",

                style: {
                    "background-color": "#171216",
                    "border-color": "#ff5664",
                    "shadow-color": "#ff5664"
                }
            },

            {
                selector: "node[type='Potential']",

                style: {
                    "background-color": "#14121c",
                    "border-color": "#a56cff",
                    "shadow-color": "#a56cff"
                }
            },

            {
                selector: "edge",

                style: {
                    "curve-style": "bezier",

                    "width": 2,

                    "line-color": "#4b7183",
                    "target-arrow-color": "#4b7183",

                    "target-arrow-shape": "triangle",
                    "arrow-scale": 1.15,

                    "line-style": "dashed",

                    "source-distance-from-node": 8,
                    "target-distance-from-node": 10,

                    "label": "data(relationship)",

                    "color": "#8fa8b5",

                    "font-size": 9,
                    "font-weight": 700,

                    "text-background-color": "#17191f",
                    "text-background-opacity": 0.92,
                    "text-background-padding": 3,

                    "text-margin-y": -8,
                    "text-rotation": "autorotate",

                    "shadow-blur": 5,
                    "shadow-opacity": 0.45,
                    "shadow-color": "#315463",

                    "opacity": 0.9
                }
            },

            {
                selector: "edge[relationship='OBSERVED']",

                style: {
                    "line-color": "#00e5ff",
                    "target-arrow-color": "#00e5ff",
                    "line-style": "dashed",
                    "color": "#8eefff",
                    "shadow-color": "#00e5ff"
                }
            },

            {
                selector: "edge[relationship='SUPPORTS']",

                style: {
                    "line-color": "#20d8a0",
                    "target-arrow-color": "#20d8a0",
                    "color": "#8af0cf",
                    "shadow-color": "#20d8a0"
                }
            },

            {
                selector: "edge[relationship='POTENTIAL']",

                style: {
                    "line-color": "#a56cff",
                    "target-arrow-color": "#a56cff",
                    "color": "#c7a7ff"
                }
            },

            {
                selector:
                    "edge[relationship='CORRELATED']",

                style: {
                    "line-color": "#6f7f91",
                    "target-arrow-color": "#6f7f91",
                    "color": "#aeb9c4"
                }
            },

            {
                selector:
                    "edge[relationship='PREDICTS']",

                style: {
                    "line-color": "#a56cff",
                    "target-arrow-color": "#a56cff",
                    "color": "#c7a7ff"
                }
            },

            {
                selector: "edge.flow-active",

                style: {
                    "width": 8,

                    "line-color": "#8cecff",

                    "target-arrow-color": "#8cecff",

                    "arrow-scale": 2.8,

                    "opacity": 1,

                    "shadow-blur": 18,

                    "shadow-opacity": 1,

                    "shadow-color": "#25d9ff"
                }
            },

            {
                selector: "edge.potential-flow",

                style: {
                    "width": 7,

                    "line-color": "#c79cff",

                    "target-arrow-color": "#c79cff",

                    "arrow-scale": 2.8,

                    "opacity": 1,

                    "shadow-blur": 18,

                    "shadow-opacity": 1,

                    "shadow-color": "#a56cff"
                }
            },

            {
                selector: "node.node-active",

                style: {
                    "border-width": 4,

                    "shadow-blur": 28,

                    "shadow-opacity": 1,

                    "opacity": 1
                }
            },

            {
                selector: ".highlighted",

                style: {
                    "opacity": 1,

                    "z-index": 999
                }
            },

            {
                selector: ".dimmed",

                style: {
                    "opacity": 0.18
                }
            }
        ]
    });

    applyAttackGraphLayout(normalized.nodes, normalized.edges);

    bindGraphEvents();

    startArrowFlowAnimation();

    updateGraphCount(normalized.nodes.length, normalized.edges.length);
}


/* =========================================================
   LINEAR LAYOUT
   ========================================================= */

function applyAttackGraphLayout(nodes, edges) {
    if (!cy || !nodes.length) return;

    /*
     * Merkle-style attack graph layout:
     * leaves at the top, correlated/intermediate nodes in the
     * middle, and the incident/root at the bottom.
     *
     * The graph remains non-linear: multiple branches can
     * converge on the same lower-level node.
     */

    const nodeMap = new Map(
        nodes.map(node => [node.id, node])
    );

    const children = new Map();

    nodes.forEach(node => {
        children.set(node.id, []);
    });

    edges.forEach(edge => {
        if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
            return;
        }

        children.get(edge.source).push(edge.target);
    });

    const root =
        nodes.find(node =>
            String(node.type).toLowerCase() === "incident"
        ) ||
        nodes.find(node => {
            const outgoing = children.get(node.id) || [];
            return outgoing.length === 0;
        }) ||
        nodes[0];

    /*
     * Calculate distance from the root using the actual graph
     * relationships, then invert the visual direction so the
     * root is displayed at the bottom.
     */
    const distances = new Map([
        [root.id, 0]
    ]);

    const queue = [root.id];

    while (queue.length) {
        const currentId = queue.shift();
        const currentDistance =
            distances.get(currentId) || 0;

        /*
         * Follow the actual attack relationships outward from
         * the incident/root. Those descendants are rendered
         * progressively higher in the tree.
         */
        (children.get(currentId) || []).forEach(childId => {
            if (!distances.has(childId)) {
                distances.set(
                    childId,
                    currentDistance + 1
                );

                queue.push(childId);
            }
        });
    }

    /*
     * Anything not connected to the selected root is placed
     * in the upper area instead of breaking the main tree.
     */
    nodes.forEach(node => {
        if (!distances.has(node.id)) {
            distances.set(node.id, 1);
        }
    });

    const levels = new Map();

    nodes.forEach(node => {
        const distance =
            distances.get(node.id) || 0;

        if (!levels.has(distance)) {
            levels.set(distance, []);
        }

        levels.get(distance).push(node);
    });

    const typeOrder = {
        Evidence: 0,
        Activity: 1,
        Threat: 2,
        Potential: 3,
        Endpoint: 4,
        Incident: 5
    };

    levels.forEach(levelNodes => {
        levelNodes.sort((a, b) => {
            return (
                (typeOrder[a.type] ?? 10) -
                (typeOrder[b.type] ?? 10)
            );
        });
    });

    const maxDistance =
        Math.max(...Array.from(levels.keys()));

    const xSpacing = 285;
    const ySpacing = 155;
    const centerX = 560;
    const topY = 120;
    const bottomY = 510;

    /*
     * Place the farthest nodes at the top and the root at the
     * bottom, matching the visual hierarchy of the Merkle tree.
     */
    levels.forEach((levelNodes, distance) => {
        const visualLevel =
            maxDistance - distance;

        const y =
            maxDistance === 0
                ? bottomY
                : topY +
                  (
                      visualLevel /
                      maxDistance
                  ) *
                  (bottomY - topY);

        const totalWidth =
            (levelNodes.length - 1) * xSpacing;

        const startX =
            centerX - totalWidth / 2;

        levelNodes.forEach((node, index) => {
            const element = cy.$id(node.id);

            if (!element.length) return;

            element.position({
                x: startX + index * xSpacing,
                y
            });
        });
    });

    /*
     * If there are multiple disconnected branches, offset them
     * slightly so they remain visible without collapsing into one
     * column.
     */
    const rootElement = cy.$id(root.id);

    if (rootElement.length) {
        rootElement.position({
            x: centerX,
            y: bottomY
        });
    }

    setTimeout(() => {
        if (!cy) return;

        cy.fit(
            cy.elements(),
            80
        );
    }, 80);
}

/* =========================================================
   RELATIONSHIP HELPERS
   ========================================================= */

function isPotentialRelationship(relationship) {
    const value =
        String(relationship || "")
            .toUpperCase();

    return [
        "POTENTIAL",
        "CORRELATED",
        "PREDICTS",
        "HYPOTHESIZED",
        "POSSIBLE"
    ].includes(value);
}


/* =========================================================
   GRAPH EVENTS
   ========================================================= */

function bindGraphEvents() {
    if (!cy) return;

    cy.on("tap", "node", event => {
        const node = event.target;

        showNodeDetails(node);

        highlightNodePath(node);
    });

    cy.on("mouseover", "node", event => {
        const node = event.target;

        highlightNodePath(node);
    });

    cy.on("mouseout", "node", () => {
        clearHighlights();
    });
}


/* =========================================================
   NODE DETAILS
   ========================================================= */

function showNodeDetails(node) {
    const panel = $("nodeDetailPanel");
    const title = $("nodeDetailTitle");
    const body = $("nodeDetailBody");

    if (!panel || !title || !body) return;

    const data =
        node.data("details") || {};

    const type =
        node.data("type") || "Node";

    const label =
        node.data("label") ||
        data.title ||
        type;

    title.textContent = label;

    body.innerHTML = buildNodeDetails(
        node,
        type,
        data
    );

    panel.classList.add("active");
    panel.scrollTop = 0;
}


function buildNodeDetails(node, type, data) {
    const normalizedType =
        String(type || "Node").toLowerCase();

    const severity =
        data.severity ||
        data.riskLevel ||
        null;

    const state =
        data.state ||
        null;

    const metrics = [];

    if (state) {
        metrics.push(
            createDetailMetric(
                "State",
                state,
                stateClass(state)
            )
        );
    }

    if (severity) {
        metrics.push(
            createDetailMetric(
                "Severity",
                severity,
                stateClass(severity)
            )
        );
    }

    if (
        data.riskScore !== undefined &&
        data.riskScore !== null
    ) {
        metrics.push(
            createDetailMetric(
                "Risk Score",
                `${data.riskScore}/100`,
                "accent"
            )
        );
    }

    if (data.confidence !== undefined && data.confidence !== null) {
        metrics.push(
            createDetailMetric(
                "Confidence",
                `${data.confidence}%`,
                "accent"
            )
        );
    }

    const sections = [];

    sections.push(`
        <div class="node-detail-section node-detail-identity">
            <span class="node-detail-label">Node Identity</span>

            <div class="node-detail-value node-detail-primary-value">
                ${escapeHtml(
                    data.title ||
                    node.data("label") ||
                    type
                )}
            </div>

            <div class="node-detail-meta-row">
                <span class="node-detail-type-badge">
                    ${escapeHtml(type)}
                </span>

                <span class="node-detail-id">
                    ${escapeHtml(node.id())}
                </span>
            </div>
        </div>
    `);

    if (metrics.length) {
        sections.push(`
            <div class="node-detail-section">
                <span class="node-detail-label">Security Metrics</span>

                <div class="node-detail-grid">
                    ${metrics.join("")}
                </div>
            </div>
        `);
    }

    if (data.description) {
        sections.push(`
            <div class="node-detail-section">
                <span class="node-detail-label">Description</span>

                <div class="node-detail-value">
                    ${escapeHtml(data.description)}
                </div>
            </div>
        `);
    }

    const metadata = [];

    if (data.endpointId) {
        metadata.push(
            createDetailField(
                "Endpoint ID",
                data.endpointId
            )
        );
    }

    if (data.evidenceId) {
        metadata.push(
            createDetailField(
                "Evidence ID",
                data.evidenceId
            )
        );
    }

    if (data.type && normalizedType === "evidence") {
        metadata.push(
            createDetailField(
                "Evidence Type",
                data.type
            )
        );
    }

    if (data.status) {
        metadata.push(
            createDetailField(
                "Evidence Status",
                data.status
            )
        );
    }

    if (data.objective) {
        metadata.push(
            createDetailField(
                "Objective",
                data.objective
            )
        );
    }

    if (data.riskLevel) {
        metadata.push(
            createDetailField(
                "Risk Level",
                data.riskLevel
            )
        );
    }

    if (data.timestamp) {
        metadata.push(
            createDetailField(
                "Timestamp",
                formatDateTime(data.timestamp)
            )
        );
    }

    if (data.telemetryId) {
        metadata.push(
            createDetailField(
                "Telemetry ID",
                data.telemetryId
            )
        );
    }

    if (metadata.length) {
        sections.push(`
            <div class="node-detail-section">
                <span class="node-detail-label">Node Metadata</span>

                <div class="node-detail-fields">
                    ${metadata.join("")}
                </div>
            </div>
        `);
    }

    const relationships = getNodeRelationships(node);

    if (relationships.length) {
        sections.push(`
            <div class="node-detail-section">
                <span class="node-detail-label">
                    Relationships
                </span>

                <div class="node-detail-evidence">
                    ${relationships.map(
                        relationship => `
                            <div class="node-detail-evidence-item relationship-item">
                                <strong>
                                    ${escapeHtml(
                                        relationship.relationship
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        relationship.direction
                                    )}
                                </span>

                                <span>
                                    ${escapeHtml(
                                        relationship.node
                                    )}
                                </span>
                            </div>
                        `
                    ).join("")}
                </div>
            </div>
        `);
    }

    return sections.join("");
}


function createDetailMetric(label, value, className = "") {
    return `
        <div class="node-detail-metric">
            <span class="node-detail-metric-label">
                ${escapeHtml(label)}
            </span>

            <span class="node-detail-metric-value ${escapeHtml(className)}">
                ${escapeHtml(value)}
            </span>
        </div>
    `;
}


function stateClass(value) {
    const normalized =
        String(value || "")
            .toLowerCase()
            .replace(/\s+/g, "-");

    if (
        ["low", "normal", "resolved", "contained"].includes(normalized)
    ) {
        return "low";
    }

    if (
        ["medium", "suspicious", "detected"].includes(normalized)
    ) {
        return "medium";
    }

    if (
        ["high", "compromised"].includes(normalized)
    ) {
        return "high";
    }

    if (
        ["critical"].includes(normalized)
    ) {
        return "critical";
    }

    return "accent";
}


function getNodeRelationships(node) {
    if (!cy || !node || node.removed()) {
        return [];
    }

    return node.connectedEdges().map(edge => {
        const source = edge.source();
        const target = edge.target();

        const isSource =
            source.id() === node.id();

        const otherNode =
            isSource
                ? target
                : source;

        return {
            relationship:
                edge.data("relationship") ||
                "OBSERVED",

            direction:
                isSource
                    ? "Outgoing relationship"
                    : "Incoming relationship",

            node:
                otherNode.data("label") ||
                otherNode.id()
        };
    });
}

function createDetailField(label, value) {
    return `
        <div class="node-detail-field">
            <div class="node-detail-field-label">
                ${escapeHtml(label)}
            </div>

            <div class="node-detail-field-value">
                ${escapeHtml(value)}
            </div>
        </div>
    `;
}


/* =========================================================
   CLOSE NODE DETAILS
   ========================================================= */

function closeNodeDetails() {
    const panel = $("nodeDetailPanel");

    if (panel) {
        panel.classList.remove("active");
    }

    clearHighlights();
}


/* =========================================================
   PATH HIGHLIGHTING
   ========================================================= */

function highlightNodePath(node) {
    if (!cy) return;

    cy.elements().addClass("dimmed");

    node.removeClass("dimmed");
    node.addClass("highlighted");

    const connected =
        node.connectedEdges()
            .union(node.neighborhood());

    connected.removeClass("dimmed");
    connected.addClass("highlighted");
}

function clearHighlights() {
    if (!cy) return;

    cy.elements()
        .removeClass("dimmed highlighted");
}


/* =========================================================
   ANIMATED ARROW FLOW
   ========================================================= */

function startArrowFlowAnimation() {
    stopArrowFlowAnimation();

    if (!cy || prefersReducedMotion()) return;

    const container = cy.container();

    if (!container) return;

    container.style.position = "relative";

    attackFlowLayer = document.createElement("div");
    attackFlowLayer.className = "attack-flow-layer";
    attackFlowLayer.setAttribute("aria-hidden", "true");

    attackRootPulse = document.createElement("span");
    attackRootPulse.className = "attack-root-pulse";
    attackFlowLayer.appendChild(attackRootPulse);

    const observedEdges = cy.edges().filter(edge =>
        !isPotentialRelationship(
            edge.data("relationship")
        )
    );

    /*
     * Use a small number of travelling particles, like the
     * four Merkle particles, so the graph stays calm rather
     * than continuously glowing everywhere.
     */
    const particleCount = Math.min(
        4,
        observedEdges.length
    );

    for (let index = 0; index < particleCount; index++) {
        const particle = document.createElement("span");
        particle.className = "attack-flow-particle";
        attackFlowLayer.appendChild(particle);

        attackFlowParticles.push({
            element: particle,
            edgeIndex: index
        });
    }

    container.appendChild(attackFlowLayer);

    attackFlowStart = performance.now();

    const animate = now => {
        if (!cy || !attackFlowLayer) return;

        const elapsed = now - attackFlowStart;
        const duration = 2600;
        const stagger = 420;

        attackFlowParticles.forEach((particle, index) => {
            const edge =
                observedEdges[
                    (
                        particle.edgeIndex +
                        Math.floor(elapsed / duration)
                    ) %
                    Math.max(observedEdges.length, 1)
                ];

            if (!edge || edge.removed()) {
                particle.element.style.opacity = "0";
                return;
            }

            const progress =
                (
                    (
                        elapsed +
                        index * stagger
                    ) %
                    duration
                ) / duration;

            const source =
                edge.source().renderedPosition();

            const target =
                edge.target().renderedPosition();

            const x =
                source.x +
                (target.x - source.x) *
                progress;

            const y =
                source.y +
                (target.y - source.y) *
                progress;

            particle.element.style.transform =
                `translate3d(${x - 4}px, ${y - 4}px, 0)`;

            /*
             * Fade in/out at the ends to match the Merkle
             * particle animation.
             */
            const opacity =
                progress < 0.12
                    ? progress / 0.12
                    : progress > 0.78
                        ? (1 - progress) / 0.22
                        : 1;

            particle.element.style.opacity =
                String(Math.max(0, Math.min(1, opacity)));
        });

        const root =
            cy.nodes().filter(node =>
                String(node.data("type") || "").toLowerCase() === "incident"
            )[0] ||
            cy.nodes().last();

        if (root && root.length) {
            const position =
                root.renderedPosition();

            const pulseProgress =
                (
                    elapsed % 2600
                ) / 2600;

            const pulseOpacity =
                pulseProgress < 0.30
                    ? pulseProgress / 0.30 * 0.55
                    : (1 - pulseProgress) / 0.70 * 0.55;

            const scale =
                0.7 +
                pulseProgress * 1.0;

            attackRootPulse.style.left =
                `${position.x - 18}px`;

            attackRootPulse.style.top =
                `${position.y - 18}px`;

            attackRootPulse.style.opacity =
                String(Math.max(0, pulseOpacity));

            attackRootPulse.style.transform =
                `scale(${scale})`;
        }

        flowTimer =
            requestAnimationFrame(animate);
    };

    flowTimer =
        requestAnimationFrame(animate);
}

/* =========================================================
   NODE PULSE
   ========================================================= */

function startNodePulseAnimation() {
    stopNodePulseAnimation();

    if (!cy) return;

    const nodes = cy.nodes();

    if (!nodes.length) return;

    let index = 0;

    nodePulseTimer = setInterval(() => {
        if (!cy) return;

        const node =
            nodes[index % nodes.length];

        nodes.removeClass("node-active");

        node.addClass("node-active");

        setTimeout(() => {
            if (!node.removed()) {
                node.removeClass("node-active");
            }
        }, 500);

        index++;
    }, 1800);
}

function stopNodePulseAnimation() {
    if (nodePulseTimer) {
        clearInterval(nodePulseTimer);
        nodePulseTimer = null;
    }
}


/* =========================================================
   GRAPH CLEANUP
   ========================================================= */

function stopArrowFlowAnimation() {
    if (flowTimer) {
        cancelAnimationFrame(flowTimer);
        flowTimer = null;
    }

    attackFlowParticles = [];

    if (attackFlowLayer) {
        attackFlowLayer.remove();
        attackFlowLayer = null;
    }

    attackRootPulse = null;
}

function destroyGraph() {
    stopArrowFlowAnimation();
    stopNodePulseAnimation();

    if (cy) {
        cy.destroy();
        cy = null;
    }
}


/* =========================================================
   GRAPH COUNT
   ========================================================= */

function updateGraphCount(nodeCount, edgeCount) {
    const element = $("graphCount");

    if (!element) return;

    element.textContent =
        `${nodeCount} nodes · ${edgeCount} relationships`;
}


/* =========================================================
   GRAPH CONTROLS
   ========================================================= */

function initializeGraphControls() {
    const zoomIn = $("graphZoomIn");
    const zoomOut = $("graphZoomOut");
    const reset = $("graphReset");

    if (zoomIn) {
        zoomIn.addEventListener("click", () => {
            if (!cy) return;

            cy.animate({
                zoom: {
                    level:
                        Math.min(
                            cy.zoom() * 1.2,
                            cy.maxZoom()
                        )
                },
                duration: 250
            });
        });
    }

    if (zoomOut) {
        zoomOut.addEventListener("click", () => {
            if (!cy) return;

            cy.animate({
                zoom: {
                    level:
                        Math.max(
                            cy.zoom() / 1.2,
                            cy.minZoom()
                        )
                },
                duration: 250
            });
        });
    }

    if (reset) {
        reset.addEventListener("click", () => {
            if (!cy) return;

            cy.fit(
                cy.elements(),
                90
            );
        });
    }
}


/* =========================================================
   INCIDENT SELECTOR
   ========================================================= */

function initializeIncidentSelector() {
    const selector = $("incidentSelector");

    if (!selector) return;

    selector.addEventListener(
        "change",
        async event => {
            const incidentId =
                event.target.value;

            if (!incidentId) return;

            await selectIncident(incidentId);
        }
    );
}


function renderIncidentSelector() {
    const selector = $("incidentSelector");

    if (!selector) return;

    selector.innerHTML = "";

    allIncidents.forEach(incident => {
        const option =
            document.createElement("option");

        option.value =
            incident.incidentId;

        option.textContent =
            `${incident.incidentId} — ${
                incident.incidentType ||
                "Security Incident"
            }`;

        if (
            incident.incidentId ===
            currentIncidentId
        ) {
            option.selected = true;
        }

        selector.appendChild(option);
    });

    const container =
        $("incidentSelectorContainer");

    if (container) {
        container.style.display =
            allIncidents.length
                ? ""
                : "none";
    }
}


/* =========================================================
   SELECT INCIDENT
   ========================================================= */

async function selectIncident(incidentId) {
    const incident =
        allIncidents.find(
            item =>
                item.incidentId === incidentId
        );

    if (!incident) return;

    currentIncident = incident;
    currentIncidentId = incidentId;

    updateUrl(incidentId);

    updateTopbar(incident);

    renderIncidentSelector();

    const graph =
        await fetchAttackGraph(incidentId);

    createGraph(graph);

    if (!prefersReducedMotion()) {
        startArrowFlowAnimation();
    }

    updateActivePathBadge(incident);
}


/* =========================================================
   ACTIVE PATH BADGE
   ========================================================= */

function updateActivePathBadge(incident) {
    const badge = $("activePathBadge");

    if (!badge || !incident) return;

    badge.textContent =
        `${incident.incidentId || "INCIDENT"} · ${
            incident.currentState || "UNKNOWN"
        }`;
}


/* =========================================================
   OVERALL INCIDENT EXPLORER
   ========================================================= */

function initializeOverallExplorer() {
    const search = $("incidentSearch");
    const state = $("incidentStateFilter");
    const severity = $("incidentSeverityFilter");
    const sort = $("incidentSort");

    [
        search,
        state,
        severity,
        sort
    ].forEach(element => {
        if (element) {
            element.addEventListener(
                "input",
                renderOverallIncidents
            );

            element.addEventListener(
                "change",
                renderOverallIncidents
            );
        }
    });

    renderOverallIncidents();
}


function renderOverallIncidents() {
    const container =
        $("overallIncidentList");

    if (!container) return;

    const search =
        String(
            $("incidentSearch")?.value || ""
        ).toLowerCase();

    const state =
        $("incidentStateFilter")?.value || "";

    const severity =
        $("incidentSeverityFilter")?.value || "";

    const sort =
        $("incidentSort")?.value || "newest";

    let incidents =
        allIncidents.filter(incident => {
            const matchesSearch =
                !search ||
                JSON.stringify(incident)
                    .toLowerCase()
                    .includes(search);

            const matchesState =
                !state ||
                incident.currentState === state;

            const matchesSeverity =
                !severity ||
                incident.severity === severity;

            return (
                matchesSearch &&
                matchesState &&
                matchesSeverity
            );
        });

    incidents.sort((a, b) => {
        if (sort === "risk-high") {
            return (
                Number(b.riskScore || 0) -
                Number(a.riskScore || 0)
            );
        }

        if (sort === "severity") {
            return (
                severityWeight(b.severity) -
                severityWeight(a.severity)
            );
        }

        if (sort === "oldest") {
            return (
                new Date(
                    a.createdAt || 0
                ) -
                new Date(
                    b.createdAt || 0
                )
            );
        }

        return (
            new Date(
                b.createdAt || 0
            ) -
            new Date(
                a.createdAt || 0
            )
        );
    });

    if (!incidents.length) {
        container.innerHTML = `
            <div class="empty-state">
                No incidents match the current filters.
            </div>
        `;

        return;
    }

    container.innerHTML =
        incidents
            .map(renderIncidentCard)
            .join("");

    container
        .querySelectorAll(
            "[data-incident-id]"
        )
        .forEach(card => {
            card.addEventListener(
                "click",
                () => {
                    selectIncident(
                        card.dataset.incidentId
                    );
                }
            );
        });
}


function severityWeight(value) {
    const weights = {
        CRITICAL: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1
    };

    return weights[
        String(value || "")
            .toUpperCase()
    ] || 0;
}


function renderIncidentCard(incident) {
    return `
        <div
            class="incident-list-item ${
                incident.incidentId ===
                currentIncidentId
                    ? "active"
                    : ""
            }"
            data-incident-id="${
                escapeHtml(
                    incident.incidentId
                )
            }"
        >
            <div class="incident-list-main">

                <div class="incident-list-id">
                    ${escapeHtml(
                        incident.incidentId ||
                        "UNKNOWN"
                    )}
                </div>

                <div class="incident-list-type">
                    ${escapeHtml(
                        incident.incidentType ||
                        "Security Incident"
                    )}
                </div>

            </div>

            <div class="incident-list-meta">

                <span>
                    ${escapeHtml(
                        incident.currentState ||
                        "UNKNOWN"
                    )}
                </span>

                <span>
                    Risk ${
                        escapeHtml(
                            incident.riskScore ??
                            "--"
                        )
                    }
                </span>

                <span>
                    ${escapeHtml(
                        incident.severity ||
                        "LOW"
                    )}
                </span>

            </div>
        </div>
    `;
}


/* =========================================================
   LOAD INITIAL DATA
   ========================================================= */

async function loadIncidentPath() {
    try {
        const incidents =
            await fetchIncidents();

        allIncidents = Array.isArray(incidents)
            ? incidents
            : [];

        allIncidents.sort((a, b) => {
            return (
                new Date(
                    b.createdAt ||
                    b.updatedAt ||
                    0
                ) -
                new Date(
                    a.createdAt ||
                    a.updatedAt ||
                    0
                )
            );
        });

        if (!allIncidents.length) {
            renderEmptyGraphState();
            return;
        }

        const urlIncidentId =
            getIncidentIdFromUrl();

        const selected =
            allIncidents.find(
                incident =>
                    incident.incidentId ===
                    urlIncidentId
            );

        currentIncident =
            selected ||
            allIncidents[0];

        currentIncidentId =
            currentIncident.incidentId;

        renderIncidentSelector();

        updateTopbar(currentIncident);

        updateActivePathBadge(
            currentIncident
        );

        const graph =
            await fetchAttackGraph(
                currentIncidentId
            );

        createGraph(graph);

    } catch (error) {
        console.error(
            "Failed to load Incident Twin data:",
            error
        );

        renderGraphError(error);
    }
}


/* =========================================================
   EMPTY / ERROR STATES
   ========================================================= */

function renderEmptyGraphState() {
    const graph = $("attackGraph");

    if (!graph) return;

    graph.innerHTML = `
        <div class="graph-empty-state">
            <div class="graph-empty-title">
                NO INCIDENT DATA
            </div>

            <div class="graph-empty-description">
                No incidents are currently available
                for attack path analysis.
            </div>
        </div>
    `;
}


function renderGraphError(error) {
    const graph = $("attackGraph");

    if (!graph) return;

    graph.innerHTML = `
        <div class="graph-empty-state">
            <div class="graph-empty-title">
                GRAPH UNAVAILABLE
            </div>

            <div class="graph-empty-description">
                Unable to load incident intelligence.
            </div>
        </div>
    `;

    console.error(error);
}


/* =========================================================
   CLOSE PANEL
   ========================================================= */

function initializeNodePanel() {
    const close =
        $("nodeDetailClose");

    if (close) {
        close.addEventListener(
            "click",
            closeNodeDetails
        );
    }
}


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

function initializeResizeHandler() {
    let resizeTimer = null;

    window.addEventListener(
        "resize",
        () => {
            clearTimeout(resizeTimer);

            resizeTimer =
                setTimeout(() => {
                    if (!cy) return;

                    cy.resize();

                    cy.fit(
                        cy.elements(),
                        90
                    );
                }, 150);
        }
    );
}


/* =========================================================
   REDUCED MOTION
   ========================================================= */

function prefersReducedMotion() {
    return window.matchMedia &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeAttackPath() {
    initializeGraphControls();

    initializeIncidentSelector();

    initializeOverallExplorer();

    initializeNodePanel();

    initializeResizeHandler();

    await loadIncidentPath();

    if (!prefersReducedMotion()) {
        startArrowFlowAnimation();
    }
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeAttackPath
    );
} else {
    initializeAttackPath();
}