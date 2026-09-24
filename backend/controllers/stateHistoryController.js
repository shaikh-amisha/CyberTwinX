const SecurityStateHistory = require("../models/securityStateHistory");


// =====================================================
// GET SECURITY STATE HISTORY
// =====================================================

const getSecurityStateHistory = async (req, res) => {

    try {

        const endpointId =
            req.query.endpointId ||
            "CyberTwin Linux Agent";


        const history =
            await SecurityStateHistory
                .find({ endpointId })
                .sort({ changedAt: -1 })
                .limit(20);


        res.status(200).json({

            success: true,

            endpointId,

            count: history.length,

            data: history

        });


    } catch (error) {

        console.error(
            "Security State History error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch security state history",

            error:
                error.message

        });

    }

};


module.exports = {

    getSecurityStateHistory

};