const express = require("express");
const router = express.Router();
const { getMessages } = require("../controllers/message.controllers");

router.get('/:chatId/:page', getMessages);

module.exports = router;