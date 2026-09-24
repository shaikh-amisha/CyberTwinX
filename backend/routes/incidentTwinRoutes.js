const express = require("express");

const router = express.Router();


/* =========================================================
   INCIDENT TWIN CONTROLLER
   ========================================================= */

const {

    createIncidentTwin,

    getIncidentTwin,

    getAllIncidentTwins,

    updateIncidentTwin,

    deleteIncidentTwin

} = require("../controllers/incidentTwinController");


/* =========================================================
   ROUTES
   ========================================================= */


/*
   GET ALL INCIDENT TWINS

   Example:
   GET /api/incident-twin
*/

router.get(
    "/",
    getAllIncidentTwins
);


/*
   GET ONE INCIDENT TWIN

   Example:
   GET /api/incident-twin/INC-001
*/

router.get(
    "/:incidentId",
    getIncidentTwin
);


/*
   CREATE INCIDENT TWIN

   Example:
   POST /api/incident-twin
*/

router.post(
    "/",
    createIncidentTwin
);


/*
   UPDATE INCIDENT TWIN

   Example:
   PUT /api/incident-twin/INC-001
*/

router.put(
    "/:incidentId",
    updateIncidentTwin
);


/*
   DELETE INCIDENT TWIN

   Example:
   DELETE /api/incident-twin/INC-001
*/

router.delete(
    "/:incidentId",
    deleteIncidentTwin
);


/* =========================================================
   EXPORT ROUTER
   ========================================================= */

module.exports = router;