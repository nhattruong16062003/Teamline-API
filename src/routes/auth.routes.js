const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controllers");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
