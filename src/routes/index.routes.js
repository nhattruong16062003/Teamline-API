const express = require("express");
const router = express.Router();
const authRoute = require("./auth.routes");
const chatRoute = require("./chat.routes");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.use("/auth", authRoute);
router.use("/chats", authenticateToken, chatRoute);

module.exports = router;
