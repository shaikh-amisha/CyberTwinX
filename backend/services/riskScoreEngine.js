/**
 * CyberTwinX
 * Risk Score Engine
 *
 * Converts security findings into:
 * - Risk score
 * - Score breakdown
 * - Risk level
 */


/* =====================================================
   SEVERITY WEIGHTS
   ===================================================== */

const SEVERITY_WEIGHTS = {
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30
};


/* =====================================================
   CALCULATE RISK
   ===================================================== */

function calculateRiskScore(findings = []) {

    let totalScore = 0;

    const breakdown = [];


    for (const finding of findings) {

        const severity =
            String(finding.severity || "LOW").toUpperCase();

        const weight =
            SEVERITY_WEIGHTS[severity] || 0;

        totalScore += weight;


        breakdown.push({
            type: finding.type,
            severity,
            score: weight,
            count: finding.count || 1,
            description: finding.description
        });

    }


    /* Never allow score above 100 */

    totalScore =
        Math.min(totalScore, 100);


    /* =================================================
       RISK LEVEL
       ================================================= */

    let level = "LOW";

    if (totalScore >= 60) {

        level = "CRITICAL";

    }

    else if (totalScore >= 40) {

        level = "HIGH";

    }

    else if (totalScore >= 25) {

        level = "MEDIUM";

    }


    return {

        score: totalScore,

        level,

        breakdown

    };

}


module.exports = {
    calculateRiskScore,
    SEVERITY_WEIGHTS
};