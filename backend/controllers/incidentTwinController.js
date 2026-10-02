const IncidentTwin = require("../models/IncidentTwin");


/* =========================================================
   CREATE INCIDENT TWIN
   POST /api/incident-twin
   ========================================================= */

const createIncidentTwin = async (req, res) => {

    try {

        const incidentData = req.body;


        /* ---------------------------------------------
           Check whether incident already exists
        --------------------------------------------- */

        const existingIncident =
            await IncidentTwin.findOne({
                incidentId: incidentData.incidentId
            });


        if (existingIncident) {

            return res.status(409).json({

                success: false,

                message: "Incident Twin already exists",

                incidentId: incidentData.incidentId

            });

        }


        /* ---------------------------------------------
           Create Incident Twin
        --------------------------------------------- */

        const incident =
            await IncidentTwin.create(incidentData);


        return res.status(201).json({

            success: true,

            message: "Incident Twin created successfully",

            data: incident

        });

    }

    catch (error) {

        console.error(
            "[IncidentTwin] Create Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to create Incident Twin",

            error: error.message

        });

    }

};


/* =========================================================
   GET INCIDENT TWIN
   GET /api/incident-twin/:incidentId
   ========================================================= */

const getIncidentTwin = async (req, res) => {

    try {

        const {
            incidentId
        } = req.params;


        /* ---------------------------------------------
           Find Incident Twin
        --------------------------------------------- */

        const incident =
            await IncidentTwin.findOne({
                incidentId: incidentId
            });


        /* ---------------------------------------------
           Incident not found
        --------------------------------------------- */

        if (!incident) {

            return res.status(404).json({

                success: false,

                message: "Incident Twin not found",

                incidentId: incidentId

            });

        }


        /* ---------------------------------------------
           Return Incident Twin
        --------------------------------------------- */

        return res.status(200).json({

            success: true,

            incidentId: incidentId,

            data: incident

        });

    }

    catch (error) {

        console.error(
            "[IncidentTwin] Get Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to retrieve Incident Twin",

            error: error.message

        });

    }

};


/* =========================================================
   GET ALL INCIDENT TWINS
   GET /api/incident-twin
   ========================================================= */

const getAllIncidentTwins = async (req, res) => {

    try {

        const incidents =
            await IncidentTwin
                .find()
                .sort({
                    createdAt: -1
                });


        return res.status(200).json({

            success: true,

            count: incidents.length,

            data: incidents

        });

    }

    catch (error) {

        console.error(
            "[IncidentTwin] Get All Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to retrieve Incident Twins",

            error: error.message

        });

    }

};


/* =========================================================
   UPDATE INCIDENT TWIN
   PUT /api/incident-twin/:incidentId
   ========================================================= */

const updateIncidentTwin = async (req, res) => {

    try {

        const {
            incidentId
        } = req.params;

        const {
            evidence,
            incidentId: ignoredIncidentId,
            _id,
            __v,
            createdAt,
            updatedAt,
            ...updateData
        } = req.body || {};

        /* ---------------------------------------------
           Validate evidence input
        --------------------------------------------- */

        if (
            evidence !== undefined &&
            !Array.isArray(evidence)
        ) {

            return res.status(400).json({

                success: false,

                message: "Evidence must be provided as an array"

            });

        }

        const incomingEvidence = evidence || [];

        const evidenceIds = incomingEvidence.map(
            (record) => record && record.evidenceId
        );

        if (
            evidenceIds.some(
                (evidenceId) =>
                    typeof evidenceId !== "string" ||
                    evidenceId.trim().length === 0
            )
        ) {

            return res.status(400).json({

                success: false,

                message: "Every evidence record must have a valid evidenceId"

            });

        }

        if (
            new Set(evidenceIds).size !== evidenceIds.length
        ) {

            return res.status(409).json({

                success: false,

                message: "Duplicate evidenceId values were provided"

            });

        }

        /* ---------------------------------------------
           Build update operations

           Ordinary incident fields use $set.
           New evidence records use $push/$each so
           existing evidence is never overwritten.
        --------------------------------------------- */

        const updateOperations = {};

        if (Object.keys(updateData).length > 0) {

            updateOperations.$set = updateData;

        }

        if (incomingEvidence.length > 0) {

            updateOperations.$push = {

                evidence: {

                    $each: incomingEvidence

                }

            };

        }

        if (Object.keys(updateOperations).length === 0) {

            return res.status(400).json({

                success: false,

                message: "No valid incident updates were provided"

            });

        }

        /* ---------------------------------------------
           Prevent evidence IDs already stored on this
           incident from being inserted a second time.
           The condition is part of the update query,
           making the duplicate check atomic.
        --------------------------------------------- */

        const query = {
            incidentId: incidentId
        };

        if (evidenceIds.length > 0) {

            query.evidence = {

                $not: {

                    $elemMatch: {

                        evidenceId: {

                            $in: evidenceIds

                        }

                    }

                }

            };

        }

        const incident =
            await IncidentTwin.findOneAndUpdate(

                query,

                updateOperations,

                {
                    new: true,

                    runValidators: true
                }

            );

        /* ---------------------------------------------
           Distinguish duplicate evidence from a missing
           incident when the conditional update matches
           no document.
        --------------------------------------------- */

        if (!incident) {

            const existingIncident =
                await IncidentTwin.findOne({
                    incidentId: incidentId
                }).select("_id");

            if (existingIncident && evidenceIds.length > 0) {

                return res.status(409).json({

                    success: false,

                    message: "One or more evidenceId values already exist for this incident"

                });

            }

            return res.status(404).json({

                success: false,

                message: "Incident Twin not found",

                incidentId: incidentId

            });

        }

        return res.status(200).json({

            success: true,

            message: "Incident Twin updated successfully",

            data: incident

        });

    }

    catch (error) {

        console.error(
            "[IncidentTwin] Update Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Failed to update Incident Twin",

            error: error.message

        });

    }

};

/* =========================================================
   DELETE INCIDENT TWIN
   DELETE /api/incident-twin/:incidentId
   ========================================================= */

const deleteIncidentTwin = async (req, res) => {

    try {

        const {
            incidentId
        } = req.params;


        const incident =
            await IncidentTwin.findOneAndDelete({
                incidentId: incidentId
            });


        if (!incident) {

            return res.status(404).json({

                success: false,

                message: "Incident Twin not found",

                incidentId: incidentId

            });

        }


        return res.status(200).json({

            success: true,

            message: "Incident Twin deleted successfully",

            incidentId: incidentId

        });

    }

    catch (error) {

        console.error(
            "[IncidentTwin] Delete Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Failed to delete Incident Twin",

            error: error.message

        });

    }

};


/* =========================================================
   EXPORT CONTROLLERS
   ========================================================= */

module.exports = {

    createIncidentTwin,

    getIncidentTwin,

    getAllIncidentTwins,

    updateIncidentTwin,

    deleteIncidentTwin

};