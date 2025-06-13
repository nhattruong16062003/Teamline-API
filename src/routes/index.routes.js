const express = require("express");
const router = express.Router();
const authRoute = require("./auth.routes");
const messageRoute = require("./message.routes");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.use("/auth", authRoute);
router.use("/messages", authenticateToken, messageRoute);

module.exports = router;
