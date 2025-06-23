const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissMultipleNotifications,
  getUnreadNotificationCount,
} = require("../controllers/notification.controllers");

router.get("/", getNotifications);
router.get("/unread", getUnreadNotificationCount);
router.patch("/mark-read", markMultipleNotificationsAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);
router.patch("/dismiss-multiple", dismissMultipleNotifications);
router.patch("/dismiss/:id", dismissNotification);

module.exports = router;
