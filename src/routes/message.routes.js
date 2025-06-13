const express = require("express");
const router = express.Router();
const { getMessages } = require("../controllers/message.controllers");

router.get('/:activeChatUserId/:page', getMessages);

module.exports = router;