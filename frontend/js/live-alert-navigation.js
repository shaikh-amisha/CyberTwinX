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
        if (!element || !incidentId) {
            return;
        }

        element.classList.add("live-alert-clickable");
        element.setAttribute("role", "link");
        element.setAttribute("tabindex", "0");
        element.setAttribute("title", `Open incident ${incidentId}`);

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

    function initializeLiveAlertNavigation() {
        const originalAppendChild = Element.prototype.appendChild;

        Element.prototype.appendChild = function (child) {
            const result = originalAppendChild.call(this, child);

            if (
                this.id === "liveAlertContainer" &&
                child?.classList?.contains("live-alert-toast")
            ) {
                const incidentId = child.querySelector(".live-alert-meta")?.textContent
                    ?.match(/INC-[A-Z0-9-]+/i)?.[0];

                makeAlertClickable(child, incidentId);
            }

            return result;
        };

        const list = document.getElementById("liveAlertList");

        if (!list) {
            return;
        }

        const observeAlerts = () => {
            list.querySelectorAll(".live-alert-item").forEach(item => {
                if (item.dataset.incidentNavigationReady === "true") {
                    return;
                }

                const incidentId = item.querySelector(".live-alert-meta")?.textContent
                    ?.match(/INC-[A-Z0-9-]+/i)?.[0];

                if (incidentId) {
                    makeAlertClickable(item, incidentId);
                    item.dataset.incidentNavigationReady = "true";
                }
            });
        };

        observeAlerts();

        const observer = new MutationObserver(observeAlerts);
        observer.observe(list, { childList: true });
    }

    document.addEventListener("DOMContentLoaded", initializeLiveAlertNavigation);
})();
