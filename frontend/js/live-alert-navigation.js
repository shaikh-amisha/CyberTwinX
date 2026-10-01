/* =========================================================
   CYBERTWINX
   LIVE ALERT NAVIGATION
   ========================================================= */

(function () {
    "use strict";

    function getIncidentUrl(incidentId) {
        const normalized = String(incidentId || "").trim();

        if (!normalized) {
            return null;
        }

        return `incident-twin.html?incidentId=${encodeURIComponent(normalized)}`;
    }

    function navigateToIncident(incidentId) {
        const url = getIncidentUrl(incidentId);

        if (!url) {
            return;
        }

        window.location.href = url;
    }

    function makeAlertClickable(element, incidentId) {
        if (!element || !incidentId || element.dataset.incidentNavigationReady === "true") {
            return;
        }

        element.classList.add("live-alert-clickable");
        element.setAttribute("role", "link");
        element.setAttribute("tabindex", "0");
        element.setAttribute("title", `Open incident ${incidentId}`);
        element.dataset.incidentNavigationReady = "true";

        element.addEventListener("click", () => {
            navigateToIncident(incidentId);
        });

        element.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigateToIncident(incidentId);
            }
        });
    }

    function getIncidentId(element) {
        return element?.querySelector(".live-alert-meta")?.textContent
            ?.match(/INC-[A-Z0-9-]+/i)?.[0] || "";
    }

    function initializeLiveAlertNavigation() {
        const container = document.getElementById("liveAlertContainer");

        if (container) {
            container.querySelectorAll(".live-alert-toast").forEach(toast => {
                makeAlertClickable(toast, getIncidentId(toast));
            });

            const toastObserver = new MutationObserver(() => {
                container.querySelectorAll(".live-alert-toast").forEach(toast => {
                    makeAlertClickable(toast, getIncidentId(toast));
                });
            });

            toastObserver.observe(container, { childList: true });
        }

        const list = document.getElementById("liveAlertList");

        if (!list) {
            return;
        }

        const observeAlerts = () => {
            list.querySelectorAll(".live-alert-item").forEach(item => {
                makeAlertClickable(item, getIncidentId(item));
            });
        };

        observeAlerts();

        const observer = new MutationObserver(observeAlerts);
        observer.observe(list, { childList: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeLiveAlertNavigation);
    } else {
        initializeLiveAlertNavigation();
    }
})();
