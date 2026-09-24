const {
    investigate
} = require("../services/investigatorService");


/* =========================================================
   ASK AI INVESTIGATOR
   ========================================================= */

async function askInvestigator(
    req,
    res
) {

    try {

        const {
            incidentId,
            question
        } = req.body;


        if (!question ||
            !String(question).trim()) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Investigation question is required."

            });

        }


        const data =
            await investigate({

                incidentId,

                question

            });


        return res.status(200).json({

            success:
                true,

            data

        });

    } catch (error) {

        console.error(
            "AI Investigator Error:",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                error.message ||
                "AI investigation failed."

        });

    }

}


module.exports = {
    askInvestigator
};