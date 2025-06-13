const Chat = require("../models/Chat");
const Message = require("../models/Message");

async function getChatsOfUser(req, res) {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const chats = await Chat.find({ members: userId })
      .populate("members", "username avatar")
      .populate("owner", "username")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalChats = await Chat.countDocuments({ members: userId });

    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chat: chat._id })
          .sort({ createdAt: -1 })
          .populate("sender", "username avatar")
          .lean();

        return {
          ...chat,
          lastMessage,
        };
      })
    );

    return res.status(200).json({
      message: "Danh sách đoạn chat của user",
      chatsWithLastMessage,
      total: totalChats,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách đoạn chat của user",
      error: error.message,
    });
  }
}

module.exports = {
  getChatsOfUser,
};
