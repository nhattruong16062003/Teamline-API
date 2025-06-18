const express = require("express");
const router = express.Router();
const {
  getChatsOfUser,
  getChatById,
  createChatGroup,
} = require("../controllers/chat.controllers");

router.get("/", getChatsOfUser);
router.get("/:id", getChatById);
router.post("/create-group", createChatGroup);

module.exports = router;
