const Notification = require("../models/Notification");

// GET /notifications?cursor=<timestamp>_<id>&limit=10
const getNotifications = async (req, res) => {
  const userId = req.userId;
  const { cursor, limit = 10 } = req.query;

  let query = { receiver: userId, isHidden: false };
  if (cursor) {
    const [time, id] = cursor.split("_");
    query.$or = [
      { createdAt: { $lt: new Date(time) } },
      { createdAt: new Date(time), _id: { $lt: id } },
    ];
  }

  const items = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(+limit);

  let nextCursor = null;
  if (items.length === +limit) {
    const last = items[items.length - 1];
    nextCursor = `${last.createdAt.toISOString()}_${last._id}`;
  }

  res.json({ items, nextCursor });
};

//Hàm cập nhật trạng thái cho một noti
const markNotificationAsRead = async () => {
  try {
    const { notificationId } = req.body;
    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true } // Trả về document sau khi update
    );

    return updatedNotification;
  } catch (error) {
    throw new Error(`Error marking notification as read: ${error.message}`);
  }
};

//Hàm cập nhật trạng thái cho nhiều noti
const markMultipleNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res
        .status(400)
        .json({ error: "notificationIds must be an array" });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: error.message });
  }
};

//Hàm cập nhất isRead cho tất cả thong báo của một người
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await Notification.updateMany(
      {
        receiver: userId,
        isRead: true,
      },
      {
        $set: {
          isRead: false,
          readAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  } catch (error) {
    throw new Error(
      `Error marking all notifications as read: ${error.message}`
    );
  }
};

module.exports = {
  getNotifications,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
};
