const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissMultipleNotifications,
} = require("../controllers/notification.controllers");

router.get("/", getNotifications);
router.patch("/mark-read", markMultipleNotificationsAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);
router.patch("/dismiss-multiple", dismissMultipleNotifications);
router.patch("/dismiss/:id", dismissNotification);

module.exports = router;
