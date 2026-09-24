const express =
    require("express");

const {
    askInvestigator
} =
    require("../controllers/investigatorController");


const router =
    express.Router();


router.post(
    "/ask",
    askInvestigator
);


module.exports =
    router;