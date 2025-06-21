const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Người nhận thông báo
    },

    //Để gợi ý hiển thị trên giao diện
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "mention",
        "friend_request",
        "friend_accept",
        "group_invite",
        "group_accept",
        "system",
        "custom",
      ],
      required: true,
    },

    message: { type: String, required: true }, // Nội dung hiển thị
    link: { type: String, default: null }, // URL chuyển hướng

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    isHandled: { type: Boolean, default: false },
    handledAt: { type: Date, default: null },

    isHidden: { type: Boolean, default: false },
    hiddenAt: { type: Date, default: null },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "sourceType",
      default: null,
    },

    sourceType: {
      type: String,
      enum: ["User", "Chat"], //"Post", "Comment",
      default: null,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    expireAt: { type: Date, default: null }, // TTL nếu cần xoá tự động
  },
  { timestamps: true }
);

// Tự động xóa sau khi đến thời điểm expireAt
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
