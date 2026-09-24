/* =========================================================
   CYBERTWIN
   DASHBOARD JAVASCRIPT
   ========================================================= */


/* =========================================================
   01. DASHBOARD DATA
   ========================================================= */

const dashboardState = {

    endpoint: {
        id: "Loading...",
        os: "Linux",
        telemetry: "ACTIVE"
    },

    incident: {
        id: "—",
        type: "—",
        severity: "—"
    },

    security: {
        state: "UNKNOWN",
        riskScore: 0,
        riskLevel: "LOW",
        aiConfidence: 0
    },

    investigation: {
        healthScore: 0
    },

    twin: {
        health: "UNKNOWN",
        healthScore: 0,
        incidentCount: 0,
        blockchainHealth: "UNKNOWN"
    },

    ai: {
        confidence: 0,
        title: "Awaiting analysis",
        description: "AI assessment will be available after the detection pipeline is implemented.",
        recommendation: "PENDING"
    },

    simulation: {
        currentRisk: 0,
        simulatedRisk: 0,
        recommendation: "PENDING",
        description: "Response simulation will be available after the risk engine is implemented."
    },

    system: {
        status: "ONLINE"
    }

};


/* =========================================================
   02. API CONFIGURATION
   ========================================================= */

const API_BASE_URL = "http://localhost:5000/api";

const CYBER_NEWS_URL =
    `${API_BASE_URL}/news`;

const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000;
let newsRefreshTimer = null;


/* =========================================================
   03. DOM ELEMENTS
   ========================================================= */

const dashboardElements = {

    topbarEndpoint:
        document.getElementById("topbarEndpoint"),

    topbarIncident:
        document.getElementById("topbarIncident"),

    topbarState:
        document.getElementById("topbarState"),

    topbarRisk:
        document.getElementById("topbarRisk"),

    topbarSystemStatus:
        document.getElementById("topbarSystemStatus"),

    pageSystemStatus:
        document.getElementById("pageSystemStatus"),

    sidebarSystemStatus:
        document.getElementById("sidebarSystemStatus"),

    lastUpdated:
        document.getElementById("lastUpdated"),

    endpointName:
        document.getElementById("endpointName"),

    incidentId:
        document.getElementById("incidentId"),

    incidentSeverity:
        document.getElementById("incidentSeverity"),

    investigationHealthScore:
        document.getElementById("investigationHealthScore"),

    investigationHealthLabel:
        document.getElementById("investigationHealthLabel"),

    investigationHealthBar:
        document.getElementById("investigationHealthBar"),

    investigationHealthLevel:
        document.getElementById("investigationHealthLevel"),

    twinHealthScore:
        document.getElementById("twinHealthScore"),

    twinHealthLabel:
        document.getElementById("twinHealthLabel"),

    twinHealthBar:
        document.getElementById("twinHealthBar"),

    twinHealthLevel:
        document.getElementById("twinHealthLevel"),

    aiConfidence:
        document.getElementById("aiConfidence"),

    dashboardRiskScore:
        document.getElementById("dashboardRiskScore"),

    dashboardRiskBar:
        document.getElementById("dashboardRiskBar"),

    riskScoreLabel:
        document.getElementById("riskScoreLabel"),

    riskLevel:
        document.getElementById("riskLevel"),

    aiAssessmentConfidence:
        document.getElementById("aiAssessmentConfidence"),

    aiAssessmentTitle:
        document.getElementById("aiAssessmentTitle"),

    aiAssessmentDescription:
        document.getElementById("aiAssessmentDescription"),

    recommendedAction:
        document.getElementById("recommendedAction"),

    assessmentBadge:
        document.getElementById("assessmentBadge"),

    assessmentTitle:
        document.getElementById("assessmentTitle"),

    assessmentDescription:
        document.getElementById("assessmentDescription"),

    currentSimulationRisk:
        document.getElementById("currentSimulationRisk"),

    simulatedRisk:
        document.getElementById("simulatedRisk"),

    simulationDescription:
        document.getElementById("simulationDescription"),

    simulationRecommendation:
        document.getElementById("simulationRecommendation"),

    /* Digital Security Twin */

    twinEndpointValue:
        document.getElementById("twinEndpointValue"),

    twinEndpointMeta:
        document.getElementById("twinEndpointMeta"),

    twinIncidentValue:
        document.getElementById("twinIncidentValue"),

    twinIncidentMeta:
        document.getElementById("twinIncidentMeta"),

    twinEvidenceValue:
        document.getElementById("twinEvidenceValue"),

    twinEvidenceMeta:
        document.getElementById("twinEvidenceMeta"),

    twinRiskValue:
        document.getElementById("twinRiskValue"),

    twinRiskMeta:
        document.getElementById("twinRiskMeta"),

    twinEndpointNode:
        document.getElementById("twinEndpointNode"),

    twinIncidentNode:
        document.getElementById("twinIncidentNode"),

    twinEvidenceNode:
        document.getElementById("twinEvidenceNode"),

    twinRiskNode:
        document.getElementById("twinRiskNode"),

    twinCoreState:
        document.getElementById("twinCoreState"),

    twinCoreRisk:
        document.getElementById("twinCoreRisk"),

    twinVisualTitle:
        document.getElementById("twinVisualTitle"),

    cyberNewsFeed:
        document.getElementById("cyberNewsFeed"),

    cyberNewsUpdated:
        document.getElementById("cyberNewsUpdated"),

    newsLiveStatus:
        document.getElementById("newsLiveStatus")

};


/* =========================================================
   04. SAFE DOM UPDATE
   ========================================================= */

function setText(element, value) {

    if (!element) {
        return;
    }

    element.textContent = value;

}


/* =========================================================
   05. FETCH DASHBOARD DATA
   ========================================================= */

async function fetchDashboardData() {

    try {

        console.log(
            "[CyberTwin] Fetching dashboard data..."
        );

        const response = await fetch(
            `${API_BASE_URL}/dashboard/overview`
        );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data = await response.json();

        console.log(
            "[CyberTwin] Dashboard data received:",
            data
        );

        if (!data.success) {

            throw new Error(
                data.message || "Dashboard API failed"
            );

        }

        updateDashboardState(data);

        refreshDashboard();

        console.log(
            "[CyberTwin] Dashboard updated successfully."
        );

    } catch (error) {

        console.error(
            "[CyberTwin] Dashboard API error:",
            error
        );

        setText(
            dashboardElements.endpointName,
            "Backend unavailable"
        );

    }

}


/* =========================================================
   06. UPDATE DASHBOARD STATE FROM API
   ========================================================= */

function updateDashboardState(data) {

    /*
         Agent information
    */

    if (data.agent) {

        dashboardState.endpoint.id =
            data.endpoint?.endpointId ||
            data.agent.name ||
            "Unknown Endpoint";

        dashboardState.endpoint.os =
            data.endpoint?.operatingSystem ||
            data.agent.platform ||
            "Unknown";

        dashboardState.endpoint.telemetry =
            data.endpoint?.status === "ACTIVE"
                ? "ACTIVE"
                : "INACTIVE";

    }


    /*
         Incident Twin
    */

    if (data.incident) {

        dashboardState.incident.id =
            data.incident.id ||
            "—";

        dashboardState.incident.type =
            data.incident.type ||
            "—";

        dashboardState.incident.severity =
            data.incident.severity ||
            "—";

    }


    /*
         Security / Risk
    */

    if (data.endpoint || data.incident) {

        dashboardState.security.state =
            data.endpoint?.securityState ||
            data.incident?.state ||
            "UNKNOWN";

        dashboardState.security.riskScore =
            Number(
                data.endpoint?.riskScore ??
                data.incident?.riskScore ??
                0
            );

        dashboardState.security.riskLevel =
            String(
                data.endpoint?.riskLevel ??
                data.incident?.riskLevel ??
                getRiskLevelFromScore(dashboardState.security.riskScore)
            ).toUpperCase();

        dashboardState.security.aiConfidence =
            Number(
                data.endpoint?.confidence ??
                data.incident?.confidence ??
                0
            );

        dashboardState.twin.health =
            data.twinHealth ||
            "UNKNOWN";

        dashboardState.twin.healthScore =
            Number(data.twinHealthScore) || 0;

    }


    /*
         Telemetry overview
    */

    if (data.overview) {

        console.log(
            "[CyberTwin] Telemetry overview:",
            data.overview
        );

    }


    /*
         Evidence
    */

    if (data.evidence) {

        dashboardState.investigation.healthScore =
            Number(
                data.investigationHealthScore ??
                data.evidence.sufficiency ??
                0
            );

    }


    /*
         System information
    */

    if (data.incidentCount !== undefined) {

        dashboardState.twin.incidentCount =
            Number(data.incidentCount) || 0;

    }

    dashboardState.twin.blockchainHealth =
        data.blockchainHealth ||
        "UNKNOWN";


    if (data.system) {

        dashboardState.system.status =
            "ONLINE";

    }

}


/* =========================================================
   07. UPDATE TOPBAR
   ========================================================= */

function updateTopbar() {

    setText(
        dashboardElements.topbarEndpoint,
        dashboardState.endpoint.id
    );

    setText(
        dashboardElements.topbarIncident,
        dashboardState.incident.id
    );

    setText(
        dashboardElements.topbarState,
        dashboardState.security.state
    );

    setText(
        dashboardElements.topbarRisk,
        dashboardState.security.riskScore
    );

    setText(
        dashboardElements.topbarSystemStatus,
        dashboardState.system.status
    );

}


/* =========================================================
   08. UPDATE OVERVIEW
   ========================================================= */

function updateOverview() {

    setText(
        dashboardElements.endpointName,
        dashboardState.endpoint.id
    );

    setText(
        dashboardElements.incidentId,
        dashboardState.incident.id
    );

    setText(
        dashboardElements.incidentSeverity,
        dashboardState.incident.severity
    );



    setText(
        dashboardElements.aiConfidence,
        `${dashboardState.security.aiConfidence}%`
    );

}


/* =========================================================
   09. UPDATE RISK
   ========================================================= */

function updateRisk() {

    const score =
        dashboardState.security.riskScore;

    setText(
        dashboardElements.dashboardRiskScore,
        score
    );

    setText(
        dashboardElements.riskScoreLabel,
        `${score} / 100`
    );

    if (dashboardElements.dashboardRiskBar) {

        dashboardElements.dashboardRiskBar.style.width =
            `${score}%`;

    }

    const riskLevel =
        dashboardState.security.riskLevel ||
        getRiskLevelFromScore(score);

    setText(
        dashboardElements.riskLevel,
        `${riskLevel} RISK`
    );

}


/* =========================================================
   10. UPDATE EVIDENCE
   ========================================================= */

function updateEvidence() {

    const score =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    dashboardState.investigation.healthScore
                ) || 0
            )
        );

    const level =
        getHealthLevel(score);

    setText(
        dashboardElements.investigationHealthScore,
        Math.round(score)
    );

    setText(
        dashboardElements.investigationHealthLabel,
        `${Math.round(score)} / 100`
    );

    setText(
        dashboardElements.investigationHealthLevel,
        level
    );

    if (dashboardElements.investigationHealthBar) {

        dashboardElements.investigationHealthBar.style.width =
            `${score}%`;

    }

}


/* =========================================================
   11. UPDATE AI
   ========================================================= */

function updateAI() {

    dashboardState.ai.confidence =
        dashboardState.security.aiConfidence || 0;

    setText(
        dashboardElements.aiAssessmentConfidence,
        `${dashboardState.ai.confidence}%`
    );

    setText(
        dashboardElements.aiAssessmentTitle,
        dashboardState.ai.title
    );

    setText(
        dashboardElements.aiAssessmentDescription,
        dashboardState.ai.description
    );

    setText(
        dashboardElements.recommendedAction,
        dashboardState.ai.recommendation
    );

}


/* =========================================================
   12. UPDATE SECURITY ASSESSMENT
   ========================================================= */

function updateSecurityAssessment() {

    setText(
        dashboardElements.assessmentBadge,
        dashboardState.security.state
    );

    setText(
        dashboardElements.assessmentTitle,
        "Awaiting security analysis"
    );

    setText(
        dashboardElements.assessmentDescription,
        "Security assessment will be generated from the detection and risk analysis pipeline."
    );

}


/* =========================================================
   13. UPDATE SIMULATION
   ========================================================= */

function updateSimulation() {

    setText(
        dashboardElements.currentSimulationRisk,
        dashboardState.simulation.currentRisk
    );

    setText(
        dashboardElements.simulatedRisk,
        dashboardState.simulation.simulatedRisk
    );

    setText(
        dashboardElements.simulationDescription,
        dashboardState.simulation.description
    );

    setText(
        dashboardElements.simulationRecommendation,
        dashboardState.simulation.recommendation
    );

}


/* =========================================================
   14. UPDATE SYSTEM STATUS
   ========================================================= */

function updateSystemStatus() {

    const status =
        dashboardState.system.status;

    setText(
        dashboardElements.sidebarSystemStatus,
        `SYSTEM ${status}`
    );

    setText(
        dashboardElements.topbarSystemStatus,
        status
    );

    setText(
        dashboardElements.pageSystemStatus,
        `SYSTEM ${status}`
    );

}


/* =========================================================
   15. LAST UPDATED
   ========================================================= */

function updateLastUpdated() {

    if (!dashboardElements.lastUpdated) {
        return;
    }

    const now = new Date();

    const time =
        now.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    dashboardElements.lastUpdated.textContent =
        `Last updated: ${time}`;

}


/* =========================================================
   16. NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(".nav-item");

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            function () {

                navItems.forEach(nav => {
                    nav.classList.remove("active");
                });

                this.classList.add("active");

            }
        );

    });

}


/* =========================================================
   17. PAGE VISIBILITY
   ========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        function () {

            if (!document.hidden) {

                updateLastUpdated();

                fetchDashboardData();
                fetchCyberNews();

            }

        }
    );

}


/* =========================================================
   18. DASHBOARD REFRESH
   ========================================================= */

function refreshDashboard() {

    updateTopbar();

    updateOverview();

    updateRisk();

    updateEvidence();

    updateAI();

    updateSecurityAssessment();

    updateSimulation();

    updateDigitalSecurityTwin();

    updateSystemStatus();

    updateLastUpdated();

}


/* =========================================================
   18.5. UPDATE DIGITAL SECURITY TWIN
   ========================================================= */

function updateDigitalSecurityTwin() {

    const endpoint =
        dashboardState.endpoint;

    const incident =
        dashboardState.incident;

    const security =
        dashboardState.security;

    /*
        Twin Health Score
    */

    const twinHealthScore =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    dashboardState.twin.healthScore
                ) || 0
            )
        );

    const twinHealthLevel =
        getHealthLevel(twinHealthScore);

    setText(
        dashboardElements.twinHealthScore,
        Math.round(twinHealthScore)
    );

    setText(
        dashboardElements.twinHealthLabel,
        `${Math.round(twinHealthScore)} / 100`
    );

    setText(
        dashboardElements.twinHealthLevel,
        twinHealthLevel
    );

    if (dashboardElements.twinHealthBar) {

        dashboardElements.twinHealthBar.style.width =
            `${twinHealthScore}%`;

    }


        /*
        Endpoint
    */

    setText(
        dashboardElements.twinEndpointValue,
        endpoint.id || "—"
    );

    setText(
        dashboardElements.twinEndpointMeta,
        `${endpoint.os || "Unknown"} · Telemetry ${endpoint.telemetry || "UNKNOWN"}`
    );

    setText(
        dashboardElements.twinEndpointNode,
        "ENDPOINT"
    );


    /*
        Incident count
    */

    setText(
        dashboardElements.twinIncidentValue,
        dashboardState.twin.incidentCount
    );

    setText(
        dashboardElements.twinIncidentMeta,
        String(dashboardState.twin.incidentCount) +
            " incident(s) recorded"
    );

    setText(
        dashboardElements.twinIncidentNode,
        "INCIDENTS"
    );


    /*
        Blockchain health
    */

    setText(
        dashboardElements.twinEvidenceValue,
        dashboardState.twin.blockchainHealth
    );

    setText(
        dashboardElements.twinEvidenceMeta,
        "Evidence integrity verification"
    );

    setText(
        dashboardElements.twinEvidenceNode,
        "BLOCKCHAIN"
    );


    /*
        Risk
    */

    const riskScore =
        Number(security.riskScore) || 0;

    setText(
        dashboardElements.twinRiskValue,
        `${riskScore}/100`
    );

    setText(
        dashboardElements.twinRiskMeta,
        `${security.state || "UNKNOWN"} · ${getTwinRiskLevel(riskScore)}`
    );

    setText(
        dashboardElements.twinRiskNode,
        "RISK"
    );


    /*
        Central security state
    */

    setText(
        dashboardElements.twinCoreState,
        security.state || "UNKNOWN"
    );

    setText(
        dashboardElements.twinCoreRisk,
        `Risk ${riskScore}/100`
    );

    setText(
        dashboardElements.twinVisualTitle,
        endpoint.id && endpoint.id !== "Loading..."
            ? endpoint.id
            : "CYBERTWIN"
    );


}


function getHealthLevel(score) {

    if (score >= 80) {
        return "HEALTHY";
    }

    if (score >= 60) {
        return "GOOD";
    }

    if (score >= 40) {
        return "DEGRADED";
    }

    return "POOR";
}


function getTwinRiskLevel(score) {

    if (score >= 70) {
        return "HIGH RISK";
    }

    if (score >= 40) {
        return "MEDIUM RISK";
    }

    if (score > 0) {
        return "LOW RISK";
    }

    return "NO RISK DATA";
}



/* =========================================================
   18.9. GLOBAL CYBER NEWS
   ========================================================= */

async function fetchCyberNews() {

    if (!dashboardElements.cyberNewsFeed) {
        return;
    }

    try {

        setNewsLiveState("LOADING", false);

        const response = await fetch(CYBER_NEWS_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`News HTTP ${response.status}`);
        }

        const data = await response.json();

        const articles = Array.isArray(data.articles)
            ? data.articles
            : [];

        renderCyberNews(articles);

        setText(
            dashboardElements.cyberNewsUpdated,
            `Updated ${new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })}`
        );

        setNewsLiveState("LIVE · WORLDWIDE", true);

    } catch (error) {

        console.error(
            "[CyberTwin] Cyber news error:",
            error
        );

        if (dashboardElements.cyberNewsFeed) {

            dashboardElements.cyberNewsFeed.innerHTML = `
                <div class="cyber-news-empty">
                    Global cyber news is temporarily unavailable. Retrying automatically.
                </div>
            `;

        }

        setText(
            dashboardElements.cyberNewsUpdated,
            "Feed unavailable · retrying"
        );

        setNewsLiveState(
            "FEED OFFLINE",
            false
        );

    }

}


function renderCyberNews(articles) {

    if (!dashboardElements.cyberNewsFeed) {
        return;
    }

    if (!articles.length) {

        dashboardElements.cyberNewsFeed.innerHTML = `
            <div class="cyber-news-empty">
                No recent cybersecurity stories were returned.
            </div>
        `;

        return;
    }

    dashboardElements.cyberNewsFeed.innerHTML =
        articles
            .slice(0, 12)
            .map((article, index) => {

                const title =
                    escapeHTML(
                        article.title ||
                        "Untitled cyber story"
                    );

                const source =
                    escapeHTML(
                        article.domain ||
                        article.sourcecountry ||
                        "Global source"
                    );

                const country =
                    escapeHTML(
                        article.sourcecountry ||
                        "WORLD"
                    );

                const url =
                    article.url ||
                    "#";

                const date =
                    formatCyberNewsDate(
                        article.seendate
                    );

                return `
                    <a
                        class="cyber-news-item"
                        href="${escapeAttribute(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="animation-delay: ${index * 140}ms;"
                    >

                        <div class="cyber-news-meta">

                            <span class="cyber-news-source">
                                ${source}
                            </span>

                            <span>
                                ${country}
                            </span>

                        </div>

                        <h4>
                            ${title}
                        </h4>

                        <p>
                            ${escapeHTML(date)}
                            · GLOBAL CYBER COVERAGE
                        </p>

                    </a>
                `;

            })
            .join("");

}


function formatCyberNewsDate(value) {

    if (!value) {
        return "Recent";
    }

    const normalized =
        String(value).replace(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
            "$1-$2-$3T$4:$5:$6Z"
        );

    const date =
        new Date(normalized);

    if (Number.isNaN(date.getTime())) {
        return "Recent";
    }

    return date.toLocaleString(
        [],
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


function setNewsLiveState(label, live) {

    setText(
        dashboardElements.newsLiveStatus,
        label
    );

    if (dashboardElements.newsLiveStatus) {

        dashboardElements.newsLiveStatus.classList.toggle(
            "news-feed-offline",
            !live
        );

    }

}


function getRiskLevelFromScore(score) {

    if (score >= 60) {
        return "CRITICAL";
    }

    if (score >= 40) {
        return "HIGH";
    }

    if (score >= 25) {
        return "MEDIUM";
    }

    return "LOW";

}


/* =========================================================
   19. INITIALIZE DASHBOARD
   ========================================================= */

async function initializeDashboard() {

    console.log(
        "[CyberTwin] Dashboard initializing..."
    );

    /*
        First render the existing UI
    */

    refreshDashboard();

    /*
        Then fetch real backend data
    */

    await fetchDashboardData();

    await fetchCyberNews();

    if (!newsRefreshTimer) {

        newsRefreshTimer =
            setInterval(
                fetchCyberNews,
                NEWS_REFRESH_INTERVAL
            );

    }

    initializeNavigation();

    initializeVisibilityHandler();

    console.log(
        "[CyberTwin] Dashboard initialized successfully."
    );

}


/* =========================================================
   20. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);