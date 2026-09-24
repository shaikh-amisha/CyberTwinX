const {
    getWhatIfContext,
    simulateWhatIf
} = require("../services/whatIfService");

const IncidentTwin =
    require("../models/IncidentTwin");


/* =========================================================
   GET WHAT-IF CONTEXT
   ========================================================= */

async function getWhatIfContextController(req, res) {

    try {

        const {
            endpointId,
            incidentId,
            attackType
        } = req.query;


        const context =
            await getWhatIfContext({

                endpointId,
                incidentId,
                attackType

            });


        return res.status(200).json({

            success: true,

            data: context

        });

    }

    catch (error) {

        console.error(
            "[What-If] Context error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load What-If context.",

            error:
                error.message

        });

    }

}


/* =========================================================
   SIMULATE WHAT-IF
   ========================================================= */

async function simulateWhatIfController(req, res) {

    try {

        const {
            endpointId,
            incidentId,
            attackType,
            action
        } = req.body;


        if (!action) {

            return res.status(400).json({

                success: false,

                message:
                    "Simulation action is required."

            });

        }


        const result =
            await simulateWhatIf({

                endpointId,
                incidentId,
                attackType,
                action

            });


        return res.status(200).json({

            success: true,

            data: result

        });

    }

    catch (error) {

        console.error(
            "[What-If] Simulation error:",
            error
        );


        const statusCode =
            error.statusCode || 500;


        return res.status(statusCode).json({

            success: false,

            message:
                error.message ||
                "Failed to run What-If simulation.",

            error:
                error.message

        });

    }

}

/* =========================================================
   GET INCIDENT LIST
   ========================================================= */

async function getWhatIfIncidentsController(
    req,
    res
) {

    try {

        const incidents =
            await IncidentTwin
                .find({})
                .sort({
                    updatedAt: -1
                })
                .select({
                    _id: 0,
                    incidentId: 1,
                    incidentType: 1,
                    severity: 1,
                    currentState: 1,
                    confidence: 1,
                    riskScore: 1,
                    riskLevel: 1,
                    endpointId: 1,
                    endpointHostname: 1,
                    updatedAt: 1
                })
                .lean();


        return res.status(200).json({

            success: true,

            data: incidents

        });

    }

    catch (error) {

        console.error(
            "[What-If] Incident list error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to load incidents.",

            error:
                error.message

        });

    }

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

    getWhatIfContextController,

    simulateWhatIfController,

    getWhatIfIncidentsController

};