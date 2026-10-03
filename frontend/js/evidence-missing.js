/* =========================================================
   CYBERTWIN
   MISSING EVIDENCE DISPLAY FALLBACK
   ========================================================= */

/*
 * The evidence service already returns missingEvidence.
 * If that array is empty, derive the missing evidence directly
 * from the category details returned for the selected incident.
 * This keeps the Evidence Investigation page useful even when
 * the backend summary does not populate missingCategories.
 */

function renderMissingEvidence() {

    const container =
        elements.missingEvidenceList;

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const backendMissing =
        Array.isArray(evidenceState.missingEvidenceRecords)
            ? evidenceState.missingEvidenceRecords
            : [];

    const detailMissing =
        Array.isArray(evidenceState.evidenceDetails)
            ? evidenceState.evidenceDetails.filter(
                detail =>
                    String(detail?.status || "").toUpperCase() === "MISSING"
            ).map(detail => ({
                category: detail.category,
                label: detail.label || detail.category,
                description: detail.description || "Additional evidence may improve investigation confidence."
            }))
            : [];

    const missingRecords =
        backendMissing.length
            ? backendMissing
            : detailMissing;

    evidenceState.missingEvidenceRecords =
        missingRecords;

    evidenceState.missingEvidence =
        missingRecords.length;

    setText(
        elements.missingEvidence,
        evidenceState.missingEvidence
    );

    if (!missingRecords.length) {

        const item =
            document.createElement("div");

        item.className = "missing-item";

        const content =
            document.createElement("div");

        const title =
            document.createElement("strong");

        title.textContent =
            "Evidence coverage complete";

        const description =
            document.createElement("p");

        description.textContent =
            "No additional evidence is currently required for this investigation.";

        content.append(title, description);
        item.appendChild(content);
        container.appendChild(item);

        return;
    }

    missingRecords.forEach(missing => {

        const item =
            document.createElement("div");

        item.className = "missing-item";

        const content =
            document.createElement("div");

        const title =
            document.createElement("strong");

        title.textContent =
            missing.label ||
            missing.category ||
            "Missing Evidence";

        const description =
            document.createElement("p");

        description.textContent =
            missing.description ||
            "Additional evidence is required.";

        content.append(title, description);

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "card-button request-evidence";
        button.dataset.evidence = String(
            missing.category || ""
        ).toLowerCase().replace(/_/g, "-");
        button.textContent = "Request Evidence";

        button.addEventListener("click", () => {
            handleEvidenceRequest(missing);
        });

        item.append(content, button);
        container.appendChild(item);

    });
}

/* Extend the existing backend-data application with the fallback source. */
const originalApplyEvidenceInvestigationData =
    applyEvidenceInvestigationData;

applyEvidenceInvestigationData = function (data) {

    originalApplyEvidenceInvestigationData(data);

    evidenceState.evidenceDetails =
        Array.isArray(data?.details)
            ? data.details
            : [];

    renderMissingEvidence();
};
