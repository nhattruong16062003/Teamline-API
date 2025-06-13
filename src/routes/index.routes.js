const express = require("express");
const router = express.Router();
const authRoute = require("./auth.routes");
const messageRoute = require("./message.routes");
const chatRoute = require("./chat.routes");
const userRoute = require("./user.routes");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.use("/auth", authRoute);
router.use("/messages", authenticateToken, messageRoute);
router.use("/chats", authenticateToken, chatRoute);
router.use("/users", authenticateToken, userRoute);

module.exports = router;
