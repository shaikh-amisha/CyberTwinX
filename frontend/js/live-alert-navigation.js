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

    function getIncidentId(element) {
        return element?.querySelector(".live-alert-meta")?.textContent
            ?.match(/INC-[A-Z0-9-]+/i)?.[0] || "";
    }

    function addCloseButton(toast) {
        if (!toast || toast.dataset.dismissReady === "true") {
            return toast;
        }

        /*
         * dashboard.js has a seven-second removal timer on the original
         * toast. Clone the toast so that timer only removes the original
         * node; the visible alert remains until the user dismisses it.
         */
        const replacement = toast.cloneNode(true);
        replacement.dataset.dismissReady = "true";
        replacement.style.position = "relative";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "live-alert-dismiss";
        closeButton.setAttribute("aria-label", "Dismiss alert");
        closeButton.title = "Dismiss alert";
        closeButton.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

        closeButton.style.position = "absolute";
        closeButton.style.top = "9px";
        closeButton.style.right = "10px";
        closeButton.style.width = "26px";
        closeButton.style.height = "26px";
        closeButton.style.display = "inline-flex";
        closeButton.style.alignItems = "center";
        closeButton.style.justifyContent = "center";
        closeButton.style.padding = "0";
        closeButton.style.border = "1px solid rgba(148,163,184,.22)";
        closeButton.style.borderRadius = "6px";
        closeButton.style.background = "rgba(255,255,255,.04)";
        closeButton.style.color = "#aebdca";
        closeButton.style.cursor = "pointer";
        closeButton.style.zIndex = "3";

        closeButton.addEventListener("mouseenter", () => {
            closeButton.style.color = "#f1f7fb";
            closeButton.style.borderColor = "rgba(239,68,68,.55)";
            closeButton.style.background = "rgba(239,68,68,.10)";
        });

        closeButton.addEventListener("mouseleave", () => {
            closeButton.style.color = "#aebdca";
            closeButton.style.borderColor = "rgba(148,163,184,.22)";
            closeButton.style.background = "rgba(255,255,255,.04)";
        });

        closeButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            replacement.remove();
        });

        replacement.appendChild(closeButton);
        toast.replaceWith(replacement);

        return replacement;
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

        element.addEventListener("click", event => {
            if (event.target.closest(".live-alert-dismiss")) {
                return;
            }

            navigateToIncident(incidentId);
        });

        element.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigateToIncident(incidentId);
            }
        });
    }

    function prepareToast(toast) {
        if (!toast || toast.dataset.alertNavigationProcessed === "true") {
            return;
        }

        toast.dataset.alertNavigationProcessed = "true";
        const visibleToast = addCloseButton(toast);
        makeAlertClickable(visibleToast, getIncidentId(visibleToast));
    }

    function initializeLiveAlertNavigation() {
        const container = document.getElementById("liveAlertContainer");

        if (container) {
            container.querySelectorAll(".live-alert-toast").forEach(prepareToast);

            const toastObserver = new MutationObserver(() => {
                container.querySelectorAll(".live-alert-toast").forEach(prepareToast);
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
