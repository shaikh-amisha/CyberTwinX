const {
    investigate
} = require("../services/investigatorService");

/* =========================================================
   ASK AI INVESTIGATOR
   ========================================================= */

async function askInvestigator(req, res) {
    try {
        const body = req.body || {};
        const incidentId = body.incidentId;
        const question = body.question ?? body.query ?? body.message;

        if (!question || !String(question).trim()) {
            return res.status(400).json({
                success: false,
                message: "Investigation question is required."
            });
        }

        const data = await investigate({
            incidentId,
            question
        });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("[CyberTwin] AI Investigator Error:", error.message);

        const statusCode = Number.isInteger(error.statusCode)
            && error.statusCode >= 400
            && error.statusCode <= 599
            ? error.statusCode
            : 500;

        return res.status(statusCode).json({
            success: false,
            message: error.message || "AI investigation failed."
        });
    }
}

module.exports = {
    askInvestigator
};
