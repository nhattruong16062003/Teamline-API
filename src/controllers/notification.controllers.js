const Notification = require("../models/Notification");
const { updateHiddenAndExpire } = require("../services/notification.services");

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
    .limit(+limit)
    .select("_id isRead link message meta sourceId sourceType type createdAt"); // Chỉ lấy các trường này

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

    const notifications = await Notification.find({
      _id: { $in: notificationIds },
      isRead: false,
    });

    let modifiedCount = 0;

    for (const noti of notifications) {
      updateHiddenAndExpire({ noti, action: "read" });
      await noti.save();
      modifiedCount++;
    }

    return res.json({
      success: true,
      modifiedCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return res.status(500).json({ error: error.message });
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

//Hàm xóa mềm notification
const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Missing notification ID" });
    }
    const noti = await Notification.findById(id);
    if (!noti) {
      return res.status(404).json({ message: "Notification not found" });
    }
    // Cập nhật để ẩn thông
    updateHiddenAndExpire({ noti, action: "hide" });
    await noti.save();

    return res
      .status(200)
      .json({ message: "Notification dismissed successfully" });
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Xóa nhiều thông báo cùng lúc
const dismissMultipleNotifications = async (req, res) => {
  console.log("da chay vao nay");
  try {
    const { notificationIds } = req.body;
    console.log(notificationIds);

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Danh sách notificationIds không hợp lệ." });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        isHidden: false,
      },
      {
        $set: {
          isHidden: true,
          hiddenAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      message: "Đã ẩn thông báo thành công.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Lỗi khi ẩn thông báo:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi ẩn thông báo." });
  }
};

//Hàm lấy số lượng notification mà user chưa đọc
const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const count = await Notification.countDocuments({
      receiver: userId,
      isRead: false,
      isHidden: false,
    });

    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getNotifications,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  dismissMultipleNotifications,
  getUnreadNotificationCount,
};
