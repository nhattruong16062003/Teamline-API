const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/auth.controllers");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/resend-verify", resendVerificationEmail);

module.exports = router;
