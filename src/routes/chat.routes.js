const express = require("express");
const router = express.Router();
const {
  getChatsOfUser,
  getChatById,
} = require("../controllers/chat.controllers");

router.get("/", getChatsOfUser);
router.get("/:id", getChatById);

module.exports = router;
