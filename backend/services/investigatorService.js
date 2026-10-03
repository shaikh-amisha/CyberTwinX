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
        const incident = await IncidentTwin.findOne({ incidentId }).lean();

        if (!incident) {
            throw new Error(`Incident ${incidentId} not found.`);
        }

        return incident;
    }

    const incident = await IncidentTwin.findOne({
        currentState: {
            $nin: ["RESOLVED", "CONTAINED"]
        }
    })
        .sort({ updatedAt: -1 })
        .lean();

    if (!incident) {
        throw new Error("No active incident is available for investigation.");
    }

    return incident;
}

/* =========================================================
   FIND ENDPOINT
   ========================================================= */

async function findEndpoint(incident) {
    if (!incident?.endpointId) {
        return null;
    }

    const endpoint = await EndpointTwin.findOne({
        endpointId: incident.endpointId
    }).lean();

    return endpoint || null;
}

/* =========================================================
   BUILD MINIMAL INVESTIGATION CONTEXT
   ========================================================= */

function compactEvidence(item) {
    if (!item) return null;

    return {
        type: item.type || "",
        status: item.status || "",
        description: String(item.description || "").slice(0, 180)
    };
}

function compactTimelineEvent(event) {
    if (!event) return null;

    return {
        time: event.time || null,
        title: event.title || "",
        description: String(event.description || "").slice(0, 180)
    };
}

async function buildInvestigationContext(incidentId) {
    const incident = await findIncident(incidentId);

    let evidenceInvestigation = null;

    try {
        evidenceInvestigation = await getInvestigation(incident.incidentId);
    } catch (error) {
        console.warn(
            "[CyberTwin] Evidence investigation unavailable:",
            error.message
        );
    }

    const investigation = evidenceInvestigation || {};

    // Minimal context for the local 1B model.
    const incidentEvidence = Array.isArray(incident.evidence)
        ? incident.evidence.slice(-3).map(compactEvidence)
        : [];

    const incidentTimeline = Array.isArray(incident.timeline)
        ? incident.timeline.slice(-3).map(compactTimelineEvent)
        : [];

    const missingEvidence = Array.isArray(investigation.missingEvidence)
        ? investigation.missingEvidence.map(item => ({
            category: item.category || "",
            label: item.label || ""
        }))
        : [];

    return {
        incident: {
            incidentId: incident.incidentId,
            incidentType: incident.incidentType,
            severity: incident.severity,
            currentState: incident.currentState,
            riskScore: incident.riskScore ?? 0
        },
        evidence: incidentEvidence,
        missingEvidence,
        timeline: incidentTimeline
    };
}

/* =========================================================
   BUILD AI PROMPT
   ========================================================= */

function buildInvestigationPrompt(question, context) {
    return `
You are the CyberTwinX AI Investigator.

Answer the analyst's question using ONLY the minimal incident context below.
Do not invent facts. If the supplied evidence is insufficient, say so.
Keep the answer concise and investigation-focused.

INCIDENT
========
${JSON.stringify(context.incident)}

EVIDENCE
========
${JSON.stringify(context.evidence)}

MISSING EVIDENCE
===============
${JSON.stringify(context.missingEvidence)}

TIMELINE
========
${JSON.stringify(context.timeline)}

QUESTION
========
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
   CALL OLLAMA
   ========================================================= */

async function askMistral(question, context) {
    const prompt = buildInvestigationPrompt(question, context);
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        OLLAMA_TIMEOUT_MS
    );

    let response;

    try {
        response = await fetch(OLLAMA_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            signal: controller.signal,
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are an evidence-grounded cybersecurity investigation assistant."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                format: "json",
                stream: false,
                keep_alive: OLLAMA_KEEP_ALIVE,
                options: {
                    temperature: 0.2,
                    num_predict: 350
                }
            })
        });
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

    const result = await response.json();

    if (!response.ok) {
        console.error("[CyberTwin] Ollama API error:", result);

        throw new Error(
            result?.error ||
            `Ollama API returned ${response.status}.`
        );
    }

    const content = result?.message?.content;

    if (!content) {
        throw new Error("Ollama returned an empty response.");
    }

    let parsed;

    try {
        parsed = typeof content === "string"
            ? JSON.parse(content)
            : content;
    } catch (error) {
        throw new Error("Ollama returned invalid JSON.");
    }

    return {
        answer: parsed.answer || "No investigation answer was generated.",
        confidence: Number(parsed.confidence) || 0,
        keyFindings: Array.isArray(parsed.keyFindings)
            ? parsed.keyFindings
            : [],
        evidenceReasoning: Array.isArray(parsed.evidenceReasoning)
            ? parsed.evidenceReasoning
            : [],
        recommendedChecks: Array.isArray(parsed.recommendedChecks)
            ? parsed.recommendedChecks
            : []
    };
}

/* =========================================================
   INVESTIGATE
   ========================================================= */

async function investigate({ incidentId, question }) {
    if (!question || !String(question).trim()) {
        throw new Error("Investigation question is required.");
    }

    const context = await buildInvestigationContext(incidentId);

    const aiResult = await askMistral(
        String(question).trim(),
        context
    );

    return {
        incidentId: context.incident.incidentId,
        question: String(question).trim(),
        ...aiResult
    };
}

module.exports = {
    investigate,
    buildInvestigationContext
};