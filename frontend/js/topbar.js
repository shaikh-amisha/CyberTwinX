/* =========================================================
   CYBERTWIN — COMMON SYSTEM TOPBAR
   ========================================================= */

(function () {
    "use strict";

    const API_BASE_URL = "http://localhost:5000/api";

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setStateBadge(state) {
        const element = document.getElementById("topbarState");
        if (!element) return;

        const normalized = String(state || "UNKNOWN").toUpperCase();

        element.textContent = normalized;
        element.classList.remove(
            "normal",
            "suspicious",
            "compromised",
            "unknown"
        );

        if (normalized === "NORMAL") {
            element.classList.add("normal");
        } else if (normalized === "SUSPICIOUS") {
            element.classList.add("suspicious");
        } else if (normalized === "COMPROMISED") {
            element.classList.add("compromised");
        } else {
            element.classList.add("unknown");
        }
    }

    function setRisk(score, level) {
        const risk = Math.max(0, Math.min(100, Number(score) || 0));
        const riskElement = document.getElementById("topbarRisk");
        const riskContainer = document.querySelector(".topbar-risk");

        if (riskElement) {
            riskElement.textContent = Math.round(risk);
        }

        if (riskContainer) {
            riskContainer.classList.remove("low", "medium", "high", "critical");

            const normalizedLevel = String(level || "").toUpperCase();

            if (normalizedLevel === "CRITICAL" || risk >= 60) {
                riskContainer.classList.add("critical");
            } else if (normalizedLevel === "HIGH" || risk >= 40) {
                riskContainer.classList.add("high");
            } else if (normalizedLevel === "MEDIUM" || risk >= 25) {
                riskContainer.classList.add("medium");
            } else {
                riskContainer.classList.add("low");
            }

            riskContainer.style.setProperty("--risk-progress", `${risk}%`);
        }
    }

    function setSystemStatus(status) {
        const normalized = String(status || "ONLINE").toUpperCase();
        setText("topbarSystemStatus", normalized);

        const statusContainer = document.getElementById("topbarSystemStatus")?.closest(".system-status");

        if (statusContainer) {
            statusContainer.classList.toggle(
                "offline",
                normalized !== "ONLINE" && normalized !== "ACTIVE" && normalized !== "LIVE"
            );
        }
    }

    function loadLiveAlertNavigation() {
        if (document.getElementById("liveAlertNavigationScript")) {
            return;
        }

        const script = document.createElement("script");
        script.id = "liveAlertNavigationScript";
        script.src = "../js/live-alert-navigation.js";
        script.defer = true;
        document.head.appendChild(script);
    }

    let commonTopbarSnapshot = null;

    async function loadCommonTopbar(force = false) {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Dashboard overview request failed: ${response.status}`);
            }

            const result = await response.json();
            const endpoint = result?.endpoint || {};
            const system = result?.system || {};

            setText(
                "topbarEndpoint",
                endpoint.endpointId ||
                    endpoint.hostname ||
                    "UNKNOWN"
            );

            setStateBadge(endpoint.securityState || "UNKNOWN");
            setRisk(result?.riskScore ?? endpoint.riskScore ?? 0, result?.riskLevel ?? endpoint.riskLevel);
            setSystemStatus("ONLINE");

            commonTopbarSnapshot = {
                endpoint: document.getElementById("topbarEndpoint")?.textContent || "",
                state: document.getElementById("topbarState")?.textContent || "",
                risk: document.getElementById("topbarRisk")?.textContent || "",
                system: document.getElementById("topbarSystemStatus")?.textContent || ""
            };

            document.documentElement.dataset.topbarReady = "true";
        } catch (error) {
            console.warn("[CyberTwin] Common topbar data unavailable:", error);
        }
    }

    function topbarNeedsRefresh() {
        if (!commonTopbarSnapshot) return true;

        return (
            (document.getElementById("topbarEndpoint")?.textContent || "") !== commonTopbarSnapshot.endpoint ||
            (document.getElementById("topbarState")?.textContent || "") !== commonTopbarSnapshot.state ||
            (document.getElementById("topbarRisk")?.textContent || "") !== commonTopbarSnapshot.risk ||
            (document.getElementById("topbarSystemStatus")?.textContent || "") !== commonTopbarSnapshot.system
        );
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadCommonTopbar(true);
        loadLiveAlertNavigation();

        // Page-specific scripts may load their own investigation data.
        // Re-apply the single system-wide topbar only when those values change.
        setInterval(() => {
            if (topbarNeedsRefresh()) {
                loadCommonTopbar(true);
            }
        }, 1000);
    });
})();
