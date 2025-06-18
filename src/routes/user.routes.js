const express = require("express");
const router = express.Router();
const {
  updateUserInfo,
  changePassword,
  getUserByEmail,
  getConnectedUsers,
} = require("../controllers/user.controllers");

router.get("/connected-users", getConnectedUsers); //router lấy danh sách những người đã chat với user
router.get("/:email", getUserByEmail);
router.put("/:id", updateUserInfo);
router.patch("/change-password/:id", changePassword);

module.exports = router;
