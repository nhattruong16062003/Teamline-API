const express = require("express");
const router = express.Router();
const { getChatsOfUser } = require("../controllers/chat.controllers");

router.get("/", getChatsOfUser);

module.exports = router;
