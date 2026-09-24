const express = require("express");

const {
    getWhatIfContextController,
    simulateWhatIfController,
    getWhatIfIncidentsController
} = require("../controllers/whatIfController");


const router = express.Router();


/* =========================================================
   INCIDENT LIST
   ========================================================= */

router.get(
    "/incidents",
    getWhatIfIncidentsController
);


/* =========================================================
   GET CURRENT WHAT-IF CONTEXT
   ========================================================= */

router.get(
    "/",
    getWhatIfContextController
);


/* =========================================================
   RUN COUNTERFACTUAL SIMULATION
   ========================================================= */

router.post(
    "/simulate",
    simulateWhatIfController
);


module.exports = router;