const express = require("express");
const router = express.Router();
const {
  updateUserInfo,
  changePassword,
  getUserByEmail,
} = require("../controllers/user.controllers");

router.get("/:email", getUserByEmail);
router.put("/:id", updateUserInfo);
router.patch("/change-password/:id", changePassword);

module.exports = router;
