const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotpassword,
} = require("../controllers/auth.controllers");
const { authenticateToken } = require("../middleware/auth/jwt.middleware");
const {
  emailValidator,
  passwordValidator,
} = require("../middleware/auth/authentication");

router.post("/register", [emailValidator, passwordValidator], register);
router.post("/login", [authenticateToken], login);
router.post("/forgot-password", emailValidator, forgotpassword);

module.exports = router;
