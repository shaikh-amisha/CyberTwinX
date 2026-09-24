const EndpointTwin = require("../models/EndpointTwin");
const SecurityStateHistory = require("../models/securityStateHistory");

// Get the current Endpoint Twin
const getEndpointTwin = async (req, res) => {
    try {

        const endpoint = await EndpointTwin.findOne(
            {},
            {
                endpointId: 1,
                hostname: 1,
                os: 1,
                ip: 1,
                status: 1,

                telemetry: 1,

                securityState: 1,

                riskScore: 1,
                riskLevel: 1,
                riskBreakdown: 1,

                evidenceConfidence: 1,

                lastUpdated: 1
            }
        ).lean();


        if (!endpoint) {

            return res.status(404).json({
                success: false,
                message: "Endpoint Twin not found"
            });

        }


        /*
         * Get the latest security-state history
         * for THIS endpoint only.
         */
        const latestHistory =
            await SecurityStateHistory
                .findOne({
                    endpointId: endpoint.endpointId
                })
                .sort({
                    changedAt: -1
                })
                .lean();


        /*
         * Get the previous state-history record.
         * This allows the frontend to understand
         * the actual transition.
         */
        let previousHistory = null;

        if (latestHistory) {

            previousHistory =
                await SecurityStateHistory
                    .findOne({
                        endpointId: endpoint.endpointId,
                        changedAt: {
                            $lt: latestHistory.changedAt
                        }
                    })
                    .sort({
                        changedAt: -1
                    })
                    .lean();

        }


        /*
         * Build security transition information.
         */
        let stateTransition = null;

        if (latestHistory) {

            stateTransition = {

                id:
                    latestHistory._id.toString(),

                endpointId:
                    latestHistory.endpointId,

                previousState:
                    previousHistory
                        ? previousHistory.state
                        : null,

                currentState:
                    latestHistory.state,

                previousRiskScore:
                    previousHistory
                        ? previousHistory.riskScore
                        : null,

                currentRiskScore:
                    latestHistory.riskScore,

                previousRiskLevel:
                    previousHistory
                        ? previousHistory.riskLevel
                        : null,

                currentRiskLevel:
                    latestHistory.riskLevel,

                confidence:
                    latestHistory.confidence,

                findings:
                    latestHistory.findings || [],

                changedAt:
                    latestHistory.changedAt

            };

        }


        res.status(200).json({

            success: true,

            data: {

                ...endpoint,

                stateTransition

            }

        });


    } catch (error) {

        console.error(
            "Endpoint Twin error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to fetch Endpoint Twin",

            error:
                error.message

        });

    }
};


module.exports = {
    getEndpointTwin
};