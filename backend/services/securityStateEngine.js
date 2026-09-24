/**
 * CyberTwinX
 * Security State Engine
 *
 * Evaluates security findings and produces:
 * - Security state
 * - Risk score
 * - Confidence
 * - Risk breakdown
 */


/* =====================================================
   DEPENDENCIES
   ===================================================== */

const {
    calculateRiskScore
} = require("./riskScoreEngine");


const {
    detectThreats
} = require("./detectionEngine");


/* =====================================================
   SECURITY STATE ENGINE
   ===================================================== */

function evaluateSecurityState(telemetry) {

    /* =================================================
       01. DETECTION
       ================================================= */

    const findings =
        detectThreats(telemetry);


    /* =================================================
       02. RISK SCORE
       ================================================= */

    const riskAnalysis =
        calculateRiskScore(findings);


    const riskScore =
        riskAnalysis.score;


    /* =================================================
       03. SECURITY STATE
       ================================================= */

    let state = "NORMAL";


    if (riskScore >= 60) {

        state = "COMPROMISED";

    }

    else if (riskScore >= 25) {

        state = "SUSPICIOUS";

    }


    /* =================================================
       04. CONFIDENCE
       ================================================= */

    let confidence = 70;


    /*
     * No findings
     * -----------------------------------------------
     * Endpoint is currently operating normally.
     */

    if (findings.length === 0) {

        confidence = 70;

    }


    /*
     * HIGH severity finding
     * -----------------------------------------------
     * Strong evidence of suspicious activity.
     */

    else if (
        findings.some(
            finding =>
                finding.severity === "HIGH"
        )
    ) {

        confidence = 90;

    }


    /*
     * Findings exist but none are HIGH.
     */

    else {

        confidence = 80;

    }


    /* =================================================
       05. RESULT
       ================================================= */

    return {

        state,

        score:
            riskScore,

        riskLevel:
            riskAnalysis.level,

        confidence,

        findings,

        riskBreakdown:
            riskAnalysis.breakdown,

        evaluatedAt:
            new Date()

    };

}


/* =====================================================
   EXPORTS
   ===================================================== */

module.exports = {

    evaluateSecurityState

};