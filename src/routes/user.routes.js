const express = require("express");
const router = express.Router();
const {
  updateUserInfo,
  changePassword,
} = require("../controllers/user.controllers");

router.put("/:id", updateUserInfo);
router.patch("/change-password/:id", changePassword);

module.exports = router;
