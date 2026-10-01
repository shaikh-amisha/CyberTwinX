/* =========================================================
   CYBERTWIN — COMMON SYSTEM TOPBAR
   ========================================================= */

(function () {
    "use strict";

    const API_BASE_URL = "http://localhost:5000/api";
    const NOTIFICATION_STORAGE_KEY = "cybertwinxNotificationSeenAt";
    let notificationItems = [];
    let unreadCount = 0;
    let notificationStream = null;

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

    function loadNotificationStyles() {
        if (document.getElementById("topbarNotificationStyles")) return;

        const link = document.createElement("link");
        link.id = "topbarNotificationStyles";
        link.rel = "stylesheet";
        link.href = "../css/topbar-notifications.css";
        document.head.appendChild(link);
    }

    function formatNotificationTime(value) {
        if (!value) return "Just now";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Just now";
        return date.toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getNotificationIncidentId(alert) {
        return String(alert?.incidentId || "").trim();
    }

    function getNotificationSeverityClass(severity) {
        return String(severity || "MEDIUM").toLowerCase();
    }

    function getNotificationTitle(alert) {
        return String(alert?.detectionType || "SECURITY ALERT")
            .replace(/_/g, " ");
    }

    function createNotificationBell() {
        if (document.getElementById("topbarNotification")) return;

        const systemStatus = document.querySelector(".system-status");
        const topbar = document.querySelector(".topbar");
        if (!topbar) return;

        const wrapper = document.createElement("div");
        wrapper.className = "topbar-notification";
        wrapper.id = "topbarNotification";
        wrapper.innerHTML = `
            <button
                type="button"
                class="topbar-notification-button"
                id="topbarNotificationButton"
                aria-label="Notifications"
                aria-expanded="false"
                title="Notifications"
            >
                <i class="bi bi-bell-fill" aria-hidden="true"></i>
                <span class="topbar-notification-badge" id="topbarNotificationBadge">0</span>
            </button>
            <div class="topbar-notification-panel" id="topbarNotificationPanel" aria-hidden="true">
                <div class="topbar-notification-header">
                    <div>
                        <strong>Notifications</strong>
                        <span>SECURITY ALERT HISTORY</span>
                    </div>
                    <button type="button" class="topbar-notification-clear" id="topbarNotificationClear">MARK READ</button>
                </div>
                <div class="topbar-notification-list" id="topbarNotificationList">
                    <div class="topbar-notification-empty">Loading notifications...</div>
                </div>
            </div>
        `;

        if (systemStatus) {
            systemStatus.insertAdjacentElement("afterend", wrapper);
        } else {
            topbar.appendChild(wrapper);
        }

        const button = document.getElementById("topbarNotificationButton");
        const panel = document.getElementById("topbarNotificationPanel");
        const clearButton = document.getElementById("topbarNotificationClear");

        button?.addEventListener("click", event => {
            event.stopPropagation();
            const isOpen = panel?.classList.toggle("open");
            button.setAttribute("aria-expanded", String(Boolean(isOpen)));
            panel?.setAttribute("aria-hidden", String(!isOpen));

            if (isOpen) {
                markNotificationsRead();
            }
        });

        clearButton?.addEventListener("click", event => {
            event.stopPropagation();
            markNotificationsRead();
        });

        document.addEventListener("click", event => {
            if (!wrapper.contains(event.target)) {
                panel?.classList.remove("open");
                button?.setAttribute("aria-expanded", "false");
                panel?.setAttribute("aria-hidden", "true");
            }
        });

        renderNotifications();
    }

    function markNotificationsRead() {
        unreadCount = 0;
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, new Date().toISOString());
        updateNotificationBadge();
    }

    function updateNotificationBadge() {
        const badge = document.getElementById("topbarNotificationBadge");
        const button = document.getElementById("topbarNotificationButton");
        if (!badge || !button) return;

        badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
        badge.classList.toggle("visible", unreadCount > 0);
        button.classList.toggle("has-unread", unreadCount > 0);
    }

    function calculateUnreadCount(items) {
        const seenAt = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
        if (!seenAt) return items.length;

        const seenTime = new Date(seenAt).getTime();
        if (Number.isNaN(seenTime)) return items.length;

        return items.filter(item => {
            const detectedAt = new Date(item?.detectedAt || item?.createdAt || 0).getTime();
            return detectedAt > seenTime;
        }).length;
    }

    function renderNotifications() {
        const list = document.getElementById("topbarNotificationList");
        if (!list) return;

        if (!notificationItems.length) {
            list.innerHTML = `<div class="topbar-notification-empty">No security notifications yet.</div>`;
            updateNotificationBadge();
            return;
        }

        list.innerHTML = notificationItems.map(alert => {
            const incidentId = getNotificationIncidentId(alert);
            const severity = getNotificationSeverityClass(alert?.severity);
            const title = getNotificationTitle(alert);
            const description = String(alert?.description || "Security detection recorded.");
            const meta = [
                incidentId || "NO INCIDENT ID",
                alert?.hostname || alert?.endpointId || "Unknown endpoint",
                formatNotificationTime(alert?.detectedAt || alert?.createdAt)
            ].join(" · ");

            return `
                <button
                    type="button"
                    class="topbar-notification-item ${severity}"
                    data-incident-id="${incidentId.replace(/"/g, "&quot;")}"
                >
                    <div class="topbar-notification-item-title">${title}</div>
                    <div class="topbar-notification-item-description">${description}</div>
                    <div class="topbar-notification-item-meta">${meta}</div>
                </button>
            `;
        }).join("");

        list.querySelectorAll(".topbar-notification-item").forEach(item => {
            item.addEventListener("click", () => {
                const incidentId = item.dataset.incidentId;
                if (!incidentId) return;
                window.location.href = `incident-twin.html?incidentId=${encodeURIComponent(incidentId)}`;
            });
        });

        updateNotificationBadge();
    }

    function addNotification(alert) {
        if (!alert) return;

        const alertId = String(alert.alertId || "");
        if (alertId && notificationItems.some(item => String(item.alertId || "") === alertId)) {
            return;
        }

        notificationItems.unshift(alert);
        notificationItems = notificationItems.slice(0, 20);
        unreadCount = calculateUnreadCount(notificationItems);
        renderNotifications();
    }

    async function loadRecentNotifications() {
        try {
            const response = await fetch(`${API_BASE_URL}/alerts/recent`, { cache: "no-store" });
            if (!response.ok) throw new Error(`Alert history request failed: ${response.status}`);

            const result = await response.json();
            const items = Array.isArray(result) ? result : (result?.data || result?.alerts || []);
            notificationItems = items.slice(0, 20);
            unreadCount = calculateUnreadCount(notificationItems);
            renderNotifications();
        } catch (error) {
            console.warn("[CyberTwin] Notification history unavailable:", error);
            const list = document.getElementById("topbarNotificationList");
            if (list) {
                list.innerHTML = `<div class="topbar-notification-empty">Notifications are unavailable right now.</div>`;
            }
        }
    }

    function connectNotificationStream() {
        if (notificationStream || !window.EventSource) return;

        try {
            notificationStream = new EventSource(`${API_BASE_URL}/alerts/stream`);

            notificationStream.onmessage = event => {
                try {
                    const alert = JSON.parse(event.data);
                    addNotification(alert);
                } catch (error) {
                    console.warn("[CyberTwin] Invalid notification event:", error);
                }
            };

            notificationStream.onerror = () => {
                notificationStream?.close();
                notificationStream = null;
                setTimeout(connectNotificationStream, 5000);
            };
        } catch (error) {
            console.warn("[CyberTwin] Notification stream unavailable:", error);
        }
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
        loadNotificationStyles();
        createNotificationBell();
        loadCommonTopbar(true);
        loadRecentNotifications();
        connectNotificationStream();
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
