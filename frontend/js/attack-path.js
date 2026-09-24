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

        if (result?.data?.nodes) {
            return result.data;
        }

        if (result?.nodes) {
            return result;
        }

        throw new Error("Invalid attack graph response");

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

    let previousId = endpointId;

    const progression =
        Array.isArray(incident.attackProgression)
            ? incident.attackProgression
            : [];

    progression.forEach((step, index) => {
        const id =
            `activity-${index}-${sanitizeId(step)}`;

        nodes.push({
            id,
            type: "Activity",
            label: step,
            data: {
                title: step,
                description:
                    "Observed attack progression activity.",
                timestamp:
                    incident.timeline?.[index]?.time || null
            }
        });

        edges.push({
            id: `${previousId}-${id}`,
            source: previousId,
            target: id,
            relationship: "OBSERVED"
        });

        previousId = id;
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

        edges.push({
            id: `${previousId}-${id}`,
            source: previousId,
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

        if (previousId) {
            edges.push({
                id: `${previousId}-${threatId}`,
                source: previousId,
                target: threatId,
                relationship: "INDICATES"
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

        if (previousId) {
            edges.push({
                id: `${previousId}-${objectiveId}`,
                source: previousId,
                target: objectiveId,
                relationship: "POTENTIAL"
            });
        }
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
                /* -----------------------------------------
                   BASE NODE (Endpoint / Activity / Potential)
                   Bigger footprint, larger readable label,
                   text-max-width tuned to actually fit inside
                   the circle instead of overflowing it.
                ----------------------------------------- */
                selector: "node",

                style: {
                    "width": 230,
                    "height": 230,

                    "background-color": "#0b1118",

                    "border-width": 8,
                    "border-color": "#25d9ff",

                    "label": "data(label)",

                    "color": "#e8f7ff",

                    "font-size": 30,
                    "font-weight": 700,

                    "text-wrap": "wrap",
                    "text-max-width": 185,

                    "text-valign": "center",
                    "text-halign": "center",

                    "overlay-opacity": 0,

                    "shadow-blur": 14,
                    "shadow-opacity": 0.7,
                    "shadow-color": "#25d9ff",

                    "opacity": 1
                }
            },

            {
                selector: "node[type='Incident']",

                style: {
                    "background-color": "#190d10",
                    "border-color": "#ff4040",
                    "shadow-color": "#ff3030",
                    "width": 150,
                    "height": 150,
                    "font-size": 22,
                    "text-max-width": 120
                }
            },

            {
                selector: "node[type='Endpoint']",

                style: {
                    "background-color": "#09161b",
                    "border-color": "#29e0ff",
                    "shadow-color": "#29e0ff"
                }
            },

            {
                selector: "node[type='Activity']",

                style: {
                    "background-color": "#0d131a",
                    "border-color": "#46d9ff",
                    "shadow-color": "#46d9ff"
                }
            },

            {
                selector: "node[type='Evidence']",

                style: {
                    "background-color": "#10130d",
                    "border-color": "#b9dc45",
                    "shadow-color": "#b9dc45",
                    "width": 115,
                    "height": 115,
                    "font-size": 18,
                    "text-max-width": 90
                }
            },

            {
                selector: "node[type='Threat']",

                style: {
                    "background-color": "#190c0c",
                    "border-color": "#ff4545",
                    "shadow-color": "#ff3030",
                    "width": 135,
                    "height": 135,
                    "font-size": 20,
                    "text-max-width": 105
                }
            },

            {
                selector: "node[type='Potential']",

                style: {
                    "background-color": "#120e1a",
                    "border-color": "#a56cff",
                    "shadow-color": "#a56cff"
                }
            },

            {
                /* -----------------------------------------
                   BASE EDGE
                   Arrowheads pulled back from node borders
                   (source/target-distance-from-node) so they
                   don't bunch up against the bigger nodes,
                   and arrow-scale bumped to stay proportional.
                ----------------------------------------- */
                selector: "edge",

                style: {
                    "curve-style": "bezier",

                    "width": 6,

                    "line-color": "#25d9ff",

                    "target-arrow-color": "#25d9ff",

                    "target-arrow-shape": "triangle",

                    "arrow-scale": 2.4,

                    "source-distance-from-node": 10,
                    "target-distance-from-node": 14,

                    "label": "data(relationship)",

                    "color": "#c9edff",

                    "font-size": 13,
                    "font-weight": 700,

                    "text-background-color": "#070b10",

                    "text-background-opacity": 0.9,
                    "text-background-padding": 4,

                    "text-margin-y": -10,

                    "text-rotation": "autorotate",

                    "shadow-blur": 8,
                    "shadow-opacity": 0.6,
                    "shadow-color": "#25d9ff",

                    "opacity": 1
                }
            },

            {
                selector: "edge[relationship='POTENTIAL']",

                style: {
                    "line-style": "dashed",

                    "line-color": "#a56cff",

                    "target-arrow-color": "#a56cff",

                    "color": "#d9c2ff",

                    "width": 5,

                    "shadow-color": "#a56cff"
                }
            },

            {
                selector:
                    "edge[relationship='CORRELATED']",

                style: {
                    "line-style": "dashed",

                    "line-color": "#a56cff",

                    "target-arrow-color": "#a56cff",

                    "color": "#c7a7ff"
                }
            },

            {
                selector:
                    "edge[relationship='PREDICTS']",

                style: {
                    "line-style": "dashed",

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

    applyLinearLayout(normalized.nodes, normalized.edges);

    bindGraphEvents();

    startArrowFlowAnimation();

    updateGraphCount(normalized.nodes.length, normalized.edges.length);
}


/* =========================================================
   LINEAR LAYOUT
   ========================================================= */

function applyLinearLayout(nodes, edges) {
    if (!cy || !nodes.length) return;

    const nodeMap = new Map(
        nodes.map(node => [node.id, node])
    );

    const incoming = new Map();
    const outgoing = new Map();

    nodes.forEach(node => {
        incoming.set(node.id, []);
        outgoing.set(node.id, []);
    });

    edges.forEach(edge => {
        if (!incoming.has(edge.target)) {
            incoming.set(edge.target, []);
        }

        if (!outgoing.has(edge.source)) {
            outgoing.set(edge.source, []);
        }

        incoming.get(edge.target).push(edge);
        outgoing.get(edge.source).push(edge);
    });

    /*
     * Find the main chain.
     *
     * Prefer Incident → Endpoint → Activity progression.
     */

    let startNode =
        nodes.find(n =>
            String(n.type).toLowerCase() === "incident"
        );

    if (!startNode) {
        startNode =
            nodes.find(n =>
                incoming.get(n.id)?.length === 0
            );
    }

    if (!startNode) {
        startNode = nodes[0];
    }

    const mainChain = [];
    const visited = new Set();

    let current = startNode;

    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        mainChain.push(current);

        const nextEdges =
            outgoing.get(current.id) || [];

        const observedEdges =
            nextEdges.filter(edge =>
                !isPotentialRelationship(
                    edge.relationship
                )
            );

        const nextEdge =
            observedEdges[0] ||
            nextEdges[0];

        if (!nextEdge) break;

        const nextNode =
            nodeMap.get(nextEdge.target);

        if (!nextNode) break;

        current = nextNode;
    }

    /*
     * Add disconnected nodes to the chain only
     * when they have no other structural connection.
     */

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const type =
                String(node.type).toLowerCase();

            if (
                type === "evidence" ||
                type === "threat" ||
                type === "potential"
            ) {
                return;
            }

            mainChain.push(node);
            visited.add(node.id);
        }
    });

    /*
     * Position main chain.
     *
     * xSpacing widened (280 -> 380) so arrowheads and
     * relationship labels have breathing room between
     * the now-larger nodes instead of overlapping them.
     */

    const xSpacing = 380;
    const mainY = 360;

    const mainStartX = 170;

    mainChain.forEach((node, index) => {
        cy.$id(node.id).position({
            x: mainStartX + index * xSpacing,
            y: mainY
        });
    });

    /*
     * Place Evidence nodes above their connected
     * main-chain node. Offsets widened to clear the
     * bigger node radii.
     */

    const evidenceNodes =
        nodes.filter(node =>
            String(node.type).toLowerCase() === "evidence"
        );

    let evidenceIndex = 0;

    evidenceNodes.forEach(node => {
        const connectedEdges =
            edges.filter(edge =>
                edge.source === node.id ||
                edge.target === node.id
            );

        const parentEdge =
            connectedEdges.find(edge =>
                !isPotentialRelationship(
                    edge.relationship
                )
            );

        const parentId =
            parentEdge?.source === node.id
                ? parentEdge.target
                : parentEdge?.source;

        const parentNode =
            parentId
                ? cy.$id(parentId)
                : null;

        if (parentNode && parentNode.length) {
            const position =
                parentNode.position();

            cy.$id(node.id).position({
                x:
                    position.x +
                    (evidenceIndex % 2 === 0 ? -60 : 60),

                y: position.y - 230
            });
        } else {
            cy.$id(node.id).position({
                x: mainStartX + evidenceIndex * 190,
                y: 150
            });
        }

        evidenceIndex++;
    });

    /*
     * Place Threat nodes below the chain.
     */

    const threatNodes =
        nodes.filter(node =>
            String(node.type).toLowerCase() === "threat"
        );

    threatNodes.forEach((node, index) => {
        const connectedEdges =
            edges.filter(edge =>
                edge.source === node.id ||
                edge.target === node.id
            );

        const parentEdge =
            connectedEdges.find(edge =>
                !isPotentialRelationship(
                    edge.relationship
                )
            );

        const parentId =
            parentEdge?.source === node.id
                ? parentEdge.target
                : parentEdge?.source;

        const parentNode =
            parentId
                ? cy.$id(parentId)
                : null;

        if (parentNode && parentNode.length) {
            const position =
                parentNode.position();

            cy.$id(node.id).position({
                x: position.x,
                y: position.y + 210
            });
        } else {
            cy.$id(node.id).position({
                x: mainStartX + index * 220,
                y: 570
            });
        }
    });

    /*
     * Potential nodes are placed to the right
     * and connected with dashed arrows.
     */

    const potentialNodes =
        nodes.filter(node =>
            ["potential", "hypothesis"]
                .includes(
                    String(node.type).toLowerCase()
                )
        );

    potentialNodes.forEach((node, index) => {
        const connectedEdges =
            edges.filter(edge =>
                edge.source === node.id ||
                edge.target === node.id
            );

        const parentEdge =
            connectedEdges[0];

        const parentId =
            parentEdge?.source === node.id
                ? parentEdge.target
                : parentEdge?.source;

        const parentNode =
            parentId
                ? cy.$id(parentId)
                : null;

        if (parentNode && parentNode.length) {
            const position =
                parentNode.position();

            cy.$id(node.id).position({
                x: position.x + 230,
                y: position.y + 200
            });
        } else {
            cy.$id(node.id).position({
                x:
                    mainStartX +
                    mainChain.length * xSpacing,
                y: 560 + index * 150
            });
        }
    });

    /*
     * Run preset so Cytoscape accepts manual positions.
     */

    cy.layout({
        name: "preset",
        fit: true,
        padding: 90
    }).run();

    /*
     * Keep graph at a readable zoom.
     */

    setTimeout(() => {
        if (!cy) return;

        cy.fit(
            cy.elements(),
            90
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

    if (!cy) return;

    const observedEdges =
        cy.edges().filter(edge =>
            !isPotentialRelationship(
                edge.data("relationship")
            )
        );

    const potentialEdges =
        cy.edges().filter(edge =>
            isPotentialRelationship(
                edge.data("relationship")
            )
        );

    let observedIndex = 0;
    let potentialIndex = 0;

    flowTimer = setInterval(() => {
        if (!cy) return;

        cy.edges()
            .removeClass("flow-active potential-flow");

        if (observedEdges.length) {
            const edge =
                observedEdges[
                    observedIndex %
                    observedEdges.length
                ];

            edge.addClass("flow-active");

            observedIndex++;
        }

        if (potentialEdges.length) {
            const edge =
                potentialEdges[
                    potentialIndex %
                    potentialEdges.length
                ];

            setTimeout(() => {
                if (cy && !edge.removed()) {
                    edge.addClass("potential-flow");
                }
            }, 220);

            potentialIndex++;
        }
    }, 900);
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
        clearInterval(flowTimer);
        flowTimer = null;
    }
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
        startNodePulseAnimation();
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