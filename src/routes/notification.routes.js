const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notification.controllers");

router.get("/", getNotifications);
router.post("/mark-read", markMultipleNotificationsAsRead);
router.post("/mark-all-read", markAllNotificationsAsRead);

module.exports = router;
