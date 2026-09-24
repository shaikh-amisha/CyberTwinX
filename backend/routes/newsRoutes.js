const express = require("express");

const {
    getCyberNews
} = require("../controllers/newsController");

const router = express.Router();

router.get("/", getCyberNews);

module.exports = router;