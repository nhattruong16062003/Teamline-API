const express = require("express");
const router = express.Router();
const authRoute = require("./auth.routes");
const messageRoute = require("./message.routes");
const chatRoute = require("./chat.routes");
const userRoute = require("./user.routes");
const notificationRoute = require("./notification.routes");
const fileRoute = require("./file.routes");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.use("/auth", authRoute);
router.use("/messages", authenticateToken, messageRoute);
router.use("/chats", authenticateToken, chatRoute);
router.use("/users", authenticateToken, userRoute);
router.use("/notifications", authenticateToken, notificationRoute);
router.use("/file", fileRoute);
module.exports = router;
