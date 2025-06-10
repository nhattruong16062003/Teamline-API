const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  verifyEmail,
  resendVerificationEmail,
  refreshToken,
  getCurrentUser,
  logout,
} = require("../controllers/auth.controllers");
const { authenticateToken } = require("../middleware/jwt.middleware");

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/resend-verify", resendVerificationEmail);
router.post("/refresh-token", refreshToken);
router.get("/me", authenticateToken, getCurrentUser);
router.post("/logout", logout);

module.exports = router;
