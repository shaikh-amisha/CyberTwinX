/* =========================================================
   CYBERTWIN
   AI INVESTIGATOR JAVASCRIPT
   ========================================================= */


/* =========================================================
   01. AI INVESTIGATOR STATE
   ========================================================= */

const aiInvestigatorState = {

    endpoint: "",

    incident: "",

    securityState: "",

    riskScore: 0,

    confidence: 0,

    assessment: {

        title:
            "Waiting for investigation",

        description:
            "Ask the Investigator a question to generate an incident-specific assessment."

    },

    recommendation: {

        title:
            "Waiting for recommendation",

        description:
            "Recommendations will appear after the AI analyzes the selected incident.",

        priority:
            "PENDING"

    },

    recommendations: [],

    currentIncidentId: ""

};


/* =========================================================
   02. DOM REFERENCES
   ========================================================= */

const elements = {

    /* Topbar */

    topbarEndpoint:
        document.getElementById(
            "topbarEndpoint"
        ),

    topbarIncident:
        document.getElementById(
            "topbarIncident"
        ),

    topbarState:
        document.getElementById(
            "topbarState"
        ),

    topbarRisk:
        document.getElementById(
            "topbarRisk"
        ),

    topbarSystemStatus:
        document.getElementById(
            "topbarSystemStatus"
        ),


    /* Sidebar */

    sidebarSystemStatus:
        document.getElementById(
            "sidebarSystemStatus"
        ),


    /* AI */

    aiConfidenceBadge:
        document.getElementById(
            "aiConfidenceBadge"
        ),

    aiAssessmentTitle:
        document.getElementById(
            "aiAssessmentTitle"
        ),

    aiAssessmentDescription:
        document.getElementById(
            "aiAssessmentDescription"
        ),

    aiConfidence:
        document.getElementById(
            "aiConfidence"
        ),

    aiRecommendationTitle:
        document.getElementById(
            "aiRecommendationTitle"
        ),

    aiRecommendationDescription:
        document.getElementById(
            "aiRecommendationDescription"
        ),

    aiPriority:
        document.getElementById(
            "aiPriority"
        ),


    /* Chat */

    chatMessages:
        document.getElementById(
            "chatMessages"
        ),

    questionInput:
        document.getElementById(
            "ai-question"
        ),

    askButton:
        document.getElementById(
            "ask-ai"
        ),


    /* Recommendations */

    recommendationList:
        document.getElementById(
            "recommendationList"
        )

};


/* =========================================================
   03. SAFE HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   04. UPDATE TOPBAR
   ========================================================= */

function updateTopbar() {

    elements.topbarEndpoint.textContent =
        aiInvestigatorState.endpoint ||
        "—";


    elements.topbarIncident.textContent =
        aiInvestigatorState.incident ||
        "—";


    elements.topbarState.textContent =
        aiInvestigatorState.securityState ||
        "—";


    elements.topbarRisk.textContent =
        aiInvestigatorState.riskScore || 0;


    elements.topbarSystemStatus.textContent =
        "ONLINE";


    elements.sidebarSystemStatus.textContent =
        "SYSTEM ONLINE";

}


/* =========================================================
   05. UPDATE AI ASSESSMENT
   ========================================================= */

function updateAssessment() {

    const assessment =
        aiInvestigatorState.assessment;


    elements.aiAssessmentTitle.textContent =
        assessment.title;


    elements.aiAssessmentDescription.textContent =
        assessment.description;


    elements.aiConfidence.textContent =
        `${aiInvestigatorState.confidence}%`;


    elements.aiConfidenceBadge.textContent =
        `${aiInvestigatorState.confidence}% CONFIDENCE`;

}


/* =========================================================
   06. UPDATE RECOMMENDATION
   ========================================================= */

function updateRecommendation() {

    const recommendation =
        aiInvestigatorState.recommendation;


    elements.aiRecommendationTitle.textContent =
        recommendation.title;


    elements.aiRecommendationDescription.textContent =
        recommendation.description;


    elements.aiPriority.textContent =
        recommendation.priority;

}


/* =========================================================
   07. RENDER RECOMMENDATIONS
   ========================================================= */

function renderRecommendations() {

    if (!elements.recommendationList) {
        return;
    }


    elements.recommendationList.innerHTML = "";


    if (
        !Array.isArray(
            aiInvestigatorState.recommendations
        ) ||
        aiInvestigatorState.recommendations.length === 0
    ) {

        const emptyItem =
            document.createElement("div");

        emptyItem.innerHTML = `
            <p>No recommendations returned for this investigation.</p>
        `;

        elements.recommendationList.appendChild(
            emptyItem
        );

        return;
    }


    aiInvestigatorState.recommendations.forEach(
        recommendation => {


            const item =
                document.createElement(
                    "div"
                );


            item.innerHTML = `

                <strong>
                    ${escapeHTML(
                        recommendation.number
                    )}.
                    ${escapeHTML(
                        recommendation.title
                    )}
                </strong>

                <p>
                    ${escapeHTML(
                        recommendation.description
                    )}
                </p>

            `;


            elements.recommendationList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   08. ADD CHAT MESSAGE
   ========================================================= */

function addChatMessage(
    role,
    message
) {

    if (!elements.chatMessages) {
        return;
    }


    const messageContainer =
        document.createElement(
            "div"
        );


    messageContainer.className =
        `chat-message ${role}`;


    const roleName =
        role === "user"
            ? "ANALYST"
            : "CYBERTWIN AI";


    messageContainer.innerHTML = `

        <span class="chat-role">
            ${roleName}
        </span>

        <p>
            ${escapeHTML(message)}
        </p>

    `;


    elements.chatMessages.appendChild(
        messageContainer
    );


    /*
        Automatically move the chat
        to the latest message.
    */

    elements.chatMessages.scrollTop =
        elements.chatMessages.scrollHeight;

}


/* =========================================================
   09. ASK AI
   ========================================================= */

async function askInvestigator() {

    if (!elements.questionInput ||
        !elements.askButton) {

        return;

    }


    const question =
        elements.questionInput.value.trim();


    if (!question) {
        return;
    }


    addChatMessage(
        "user",
        question
    );


    elements.questionInput.value = "";


    elements.askButton.disabled =
        true;

    elements.askButton.textContent =
        "ANALYZING...";


    try {

        /*
            Send the currently selected incident.
            The backend will investigate only this incident.
        */

        const incidentId =
            aiInvestigatorState.currentIncidentId ||
            aiInvestigatorState.incident ||
            null;


        const response =
            await fetch(
                "http://localhost:5000/api/investigator/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        incidentId,
                        question
                    })
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                "Investigator request failed."
            );

        }


        const data =
            result.data || {};


        /*
            Store the incident returned by the backend.
        */

        aiInvestigatorState.currentIncidentId =
            data.incidentId ||
            incidentId ||
            "";

        aiInvestigatorState.incident =
            aiInvestigatorState.currentIncidentId;


        /*
            Render the actual AI confidence.
        */

        if (
            typeof data.confidence === "number"
        ) {

            aiInvestigatorState.confidence =
                data.confidence;

        }


        /*
            Use the AI answer as the assessment.
        */

        aiInvestigatorState.assessment = {

            title:
                "AI Investigation Assessment",

            description:
                data.answer ||
                "No investigation answer was generated."

        };


        /*
            Convert key findings into recommendations
            only when the backend actually returns them.
        */

        const findings =
            Array.isArray(data.keyFindings)
                ? data.keyFindings
                : [];

        const checks =
            Array.isArray(data.recommendedChecks)
                ? data.recommendedChecks
                : [];


        aiInvestigatorState.recommendations =
            checks.map(
                (check, index) => ({

                    number:
                        String(index + 1)
                            .padStart(2, "0"),

                    title:
                        typeof check === "string"
                            ? check
                            : check.title ||
                              check.check ||
                              "Recommended Check",

                    description:
                        typeof check === "string"
                            ? ""
                            : check.description ||
                              ""

                })
            );


        if (findings.length > 0) {

            aiInvestigatorState.recommendation = {

                title:
                    "Key Investigation Findings",

                description:
                    findings
                        .map(
                            finding =>
                                typeof finding === "string"
                                    ? finding
                                    : finding.description ||
                                      finding.finding ||
                                      finding.type ||
                                      ""
                        )
                        .filter(Boolean)
                        .join(" • "),

                priority:
                    "AI GENERATED"

            };

        } else if (checks.length > 0) {

            aiInvestigatorState.recommendation = {

                title:
                    "Recommended Investigation Checks",

                description:
                    "The AI identified additional checks based on the evidence available for this incident.",

                priority:
                    "AI GENERATED"

            };

        } else {

            aiInvestigatorState.recommendation = {

                title:
                    "No Additional Checks",

                description:
                    "The Investigator did not return additional checks for the current question.",

                priority:
                    "INFORMATIONAL"

            };

        }


        /*
            Refresh the existing UI using the real backend result.
        */

        updateTopbar();
        updateAssessment();
        updateRecommendation();
        renderRecommendations();


        /*
            Show the complete investigation answer in chat.
        */

        addChatMessage(
            "ai",
            data.answer ||
            "No investigation answer was generated."
        );


    } catch (error) {

        console.error(
            "[CyberTwin] AI Investigator error:",
            error
        );


        addChatMessage(
            "ai",
            "Unable to process the investigation request. Please try again."
        );

    } finally {

        elements.askButton.disabled =
            false;

        elements.askButton.textContent =
            "Ask Investigator";

    }

}

/* =========================================================
   09A. LOAD INCIDENT CONTEXT
   ========================================================= */

function loadIncidentContext() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const urlIncidentId =
        params.get("incidentId");


    const storedIncidentId =
        localStorage.getItem(
            "cybertwinxIncidentId"
        );


    const incidentId =
        urlIncidentId ||
        storedIncidentId ||
        "";


    if (incidentId) {

        aiInvestigatorState.currentIncidentId =
            incidentId;

        aiInvestigatorState.incident =
            incidentId;

        updateTopbar();

    }

}


/* =========================================================
   10. INITIALIZE CHAT
   ========================================================= */

function initializeChat() {

    if (
        !elements.askButton ||
        !elements.questionInput
    ) {

        return;

    }


    elements.askButton.addEventListener(
        "click",
        askInvestigator
    );


    /*
        Allow ENTER to submit.
    */

    elements.questionInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                askInvestigator();

            }

        }
    );

}


/* =========================================================
   11. NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            function () {


                navItems.forEach(nav => {

                    nav.classList.remove(
                        "active"
                    );

                });


                this.classList.add(
                    "active"
                );

            }
        );

    });

}


/* =========================================================
   12. PAGE VISIBILITY
   ========================================================= */

function initializeVisibilityHandler() {

    document.addEventListener(
        "visibilitychange",
        function () {


            if (!document.hidden) {

                updateTopbar();

                updateAssessment();

                updateRecommendation();

            }

        }
    );

}


/* =========================================================
   13. REFRESH
   ========================================================= */

function refreshAIInvestigator() {

    updateTopbar();

    updateAssessment();

    updateRecommendation();

    renderRecommendations();

}


/* =========================================================
   14. INITIALIZE
   ========================================================= */

function initializeAIInvestigator() {

    console.log(
        "[CyberTwin] AI Investigator initializing..."
    );


    loadIncidentContext();

    refreshAIInvestigator();


    initializeChat();


    initializeNavigation();


    initializeVisibilityHandler();


    console.log(
        "[CyberTwin] AI Investigator initialized successfully."
    );

}


/* =========================================================
   15. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeAIInvestigator
);