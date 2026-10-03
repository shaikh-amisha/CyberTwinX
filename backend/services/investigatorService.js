const IncidentTwin = require("../models/IncidentTwin");
const EndpointTwin = require("../models/EndpointTwin");
const {
    getInvestigation
} = require("./evidenceInvestigationService");


const OLLAMA_API_URL =
    process.env.OLLAMA_API_URL ||
    "http://localhost:11434/api/chat";


const OLLAMA_MODEL =
    process.env.OLLAMA_MODEL ||
    "gemma3:1b";

const OLLAMA_TIMEOUT_MS = 300000;
const OLLAMA_KEEP_ALIVE = "10m";


/* =========================================================
   FIND INCIDENT
   ========================================================= */

async function findIncident(incidentId) {

    if (incidentId) {

        const incident =
            await IncidentTwin.findOne({
                incidentId
            }).lean();

        if (!incident) {
            throw new Error(
                `Incident ${incidentId} not found.`
            );
        }

        return incident;
    }


    /*
     * Temporary fallback:
     * If the frontend does not yet send an incidentId,
     * use the newest active incident.
     */

    const incident =
        await IncidentTwin.findOne({
            currentState: {
                $nin: [
                    "RESOLVED",
                    "CONTAINED"
                ]
            }
        })
        .sort({
            updatedAt: -1
        })
        .lean();


    if (!incident) {
        throw new Error(
            "No active incident is available for investigation."
        );
    }


    return incident;
}


/* =========================================================
   FIND ENDPOINT
   ========================================================= */

async function findEndpoint(
    incident
) {

    if (!incident?.endpointId) {
        return null;
    }


    const endpoint =
        await EndpointTwin.findOne({
            endpointId:
                incident.endpointId
        }).lean();


    return endpoint || null;
}


/* =========================================================
   BUILD INVESTIGATION CONTEXT
   ========================================================= */

function compactEvidence(item) {
    if (!item) return null;

    return {
        evidenceId: item.evidenceId || "",
        type: item.type || "",
        category: item.category || "",
        severity: item.severity || "",
        status: item.status || "",
        description: String(item.description || "").slice(0, 240),
        timestamp: item.timestamp || null
    };
}

function compactTimelineEvent(event) {
    if (!event) return null;

    return {
        time: event.time || null,
        title: event.title || "",
        description: String(event.description || "").slice(0, 240)
    };
}

async function buildInvestigationContext(
    incidentId
) {

    const incident =
        await findIncident(
            incidentId
        );

    let evidenceInvestigation = null;

    try {
        evidenceInvestigation =
            await getInvestigation(
                incident.incidentId
            );
    } catch (error) {
        console.warn(
            "[CyberTwin] Evidence investigation unavailable:",
            error.message
        );
    }

    /*
     * Keep the local-model context intentionally small.
     * Only investigation-relevant fields are sent to the model.
     * Full endpoint telemetry and raw evidence objects are excluded.
     */
    const incidentEvidence = Array.isArray(incident.evidence)
        ? incident.evidence.slice(-6).map(compactEvidence)
        : [];

    const incidentTimeline = Array.isArray(incident.timeline)
        ? incident.timeline.slice(-6).map(compactTimelineEvent)
        : [];

    const incidentLifecycle = Array.isArray(incident.lifecycle)
        ? incident.lifecycle.slice(-4).map(compactTimelineEvent)
        : [];

    const investigation = evidenceInvestigation || {};
    const evidenceSummary = investigation.summary || {};

    const compactDetails = Array.isArray(investigation.details)
        ? investigation.details.map(detail => ({
            category: detail.category || "",
            label: detail.label || "",
            status: detail.status || "MISSING"
        }))
        : [];

    const evidenceTimeline = Array.isArray(investigation.timeline)
        ? investigation.timeline.slice(-6).map(compactTimelineEvent)
        : [];

    const missingEvidence = Array.isArray(investigation.missingEvidence)
        ? investigation.missingEvidence.map(item => ({
            category: item.category || "",
            label: item.label || "",
            description: String(item.description || "").slice(0, 200)
        }))
        : Array.isArray(investigation.missing)
            ? investigation.missing.map(item => ({
                category: item.category || "",
                label: item.label || "",
                description: String(item.description || "").slice(0, 200)
            }))
            : [];

    const supportingEvidence = Array.isArray(investigation.supportingEvidence)
        ? investigation.supportingEvidence.slice(-6).map(compactEvidence)
        : [];

    const contradictingEvidence = Array.isArray(investigation.contradictingEvidence)
        ? investigation.contradictingEvidence.slice(-6).map(compactEvidence)
        : [];

    return {
        incident: {
            incidentId: incident.incidentId,
            incidentType: incident.incidentType,
            severity: incident.severity,
            currentState: incident.currentState,
            confidence: incident.confidence,
            riskScore: incident.riskScore,
            riskLevel: incident.riskLevel,
            endpointId: incident.endpointId,
            endpointHostname: incident.endpointHostname,
            endpointState: incident.endpointState,
            currentObjective: incident.currentObjective || ""
        },

        incidentEvidence,
        incidentTimeline,
        incidentLifecycle,

        evidenceInvestigation: {
            summary: {
                incidentType: evidenceSummary.incidentType,
                detectedAttackTypes: Array.isArray(evidenceSummary.detectedAttackTypes)
                    ? evidenceSummary.detectedAttackTypes
                    : [],
                supportingCount: evidenceSummary.supportingCount ?? 0,
                missingCount: evidenceSummary.missingCount ?? 0,
                sufficiency: evidenceSummary.sufficiency ?? 0,
                currentState: evidenceSummary.currentState || "",
                riskScore: evidenceSummary.riskScore ?? 0,
                riskLevel: evidenceSummary.riskLevel || "",
                confidence: evidenceSummary.confidence ?? 0,
                expectedCategories: evidenceSummary.expectedCategories || [],
                presentCategories: evidenceSummary.presentCategories || [],
                missingCategories: evidenceSummary.missingCategories || []
            },
            details: compactDetails,
            supportingEvidence,
            contradictingEvidence,
            missingEvidence,
            timeline: evidenceTimeline
        }
    };
}


/* =========================================================
   BUILD AI PROMPT
   ========================================================= */

function buildInvestigationPrompt(
    question,
    context
) {

    return `
You are the CyberTwinX AI Investigator.

Answer the analyst's question using ONLY the Incident Twin and Evidence Investigation data below.
Do not use or invent endpoint telemetry, processes, network data, credentials, attack steps, timestamps, or facts that are not present in the supplied context.

Focus on:
- incident state and risk
- incident timeline and lifecycle
- supporting or contradicting evidence
- missing evidence
- evidence sufficiency

If evidence is insufficient, state that clearly.
Separate observed evidence from inference and uncertainty.
Keep the answer concise and investigation-focused.

INCIDENT TWIN
=============
${JSON.stringify(context.incident, null, 2)}

INCIDENT EVIDENCE
=================
${JSON.stringify(context.incidentEvidence, null, 2)}

INCIDENT TIMELINE
=================
${JSON.stringify(context.incidentTimeline, null, 2)}

INCIDENT LIFECYCLE
==================
${JSON.stringify(context.incidentLifecycle, null, 2)}

EVIDENCE INVESTIGATION
======================
${JSON.stringify(context.evidenceInvestigation, null, 2)}

ANALYST QUESTION
================
${question}

Return JSON with exactly these fields:
{
    "answer": "Clear investigation answer",
    "confidence": 0,
    "keyFindings": [],
    "evidenceReasoning": [],
    "recommendedChecks": []
}

Confidence must be an integer from 0 to 100.
Do not include markdown outside the JSON.
`.trim();
}


/* =========================================================
   CALL OLLAMA (local, replaces Mistral)
   ========================================================= */

async function askMistral(
    question,
    context
) {

    const prompt =
        buildInvestigationPrompt(
            question,
            context
        );


    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        OLLAMA_TIMEOUT_MS
    );

    let response;

    try {

        response =
            await fetch(
                OLLAMA_API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    signal:
                        controller.signal,

                    body:
                        JSON.stringify({

                            model:
                                OLLAMA_MODEL,

                            messages: [

                                {
                                    role:
                                        "system",

                                    content:
                                        "You are an evidence-grounded cybersecurity investigation assistant."
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        prompt
                                }

                            ],

                            format:
                                "json",

                            stream:
                                false,

                            keep_alive:
                                OLLAMA_KEEP_ALIVE,

                            options: {

                                temperature:
                                    0.2,

                                num_predict:
                                    350

                            }

                        })

                }
            );

    } catch (error) {

        if (error?.name === "AbortError") {

            throw new Error(
                "Ollama request timed out after 5 minutes. The local model may still be loading or generating."
            );

        }

        throw error;

    } finally {

        clearTimeout(timeout);

    }


    const result =
        await response.json();


    if (!response.ok) {

        console.error(
            "[CyberTwin] Ollama API error:",
            result
        );

        throw new Error(
            result?.error ||
            `Ollama API returned ${response.status}.`
        );

    }


    const content =
        result?.message?.content;


    if (!content) {

        throw new Error(
            "Ollama returned an empty response."
        );

    }


    let parsed;


    try {

        parsed =
            typeof content === "string"
                ? JSON.parse(content)
                : content;

    } catch (error) {

        throw new Error(
            "Ollama returned invalid JSON."
        );

    }


    return {

        answer:
            parsed.answer ||
            "No investigation answer was generated.",

        confidence:
            Number(
                parsed.confidence
            ) || 0,

        keyFindings:
            Array.isArray(
                parsed.keyFindings
            )
                ? parsed.keyFindings
                : [],

        evidenceReasoning:
            Array.isArray(
                parsed.evidenceReasoning
            )
                ? parsed.evidenceReasoning
                : [],

        recommendedChecks:
            Array.isArray(
                parsed.recommendedChecks
            )
                ? parsed.recommendedChecks
                : []

    };

}


/* =========================================================
   INVESTIGATE
   ========================================================= */

async function investigate(
    {
        incidentId,
        question
    }
) {

    if (!question ||
        !String(question).trim()) {

        throw new Error(
            "Investigation question is required."
        );

    }


    const context =
        await buildInvestigationContext(
            incidentId
        );


    const aiResult =
        await askMistral(
            String(question).trim(),
            context
        );


    return {

        incidentId:
            context.incident.incidentId,

        question:
            String(question).trim(),

        ...aiResult

    };

}


module.exports = {
    investigate,
    buildInvestigationContext
};