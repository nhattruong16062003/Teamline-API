const Chat = require("../models/Chat");
const mongoose = require("mongoose");
const {
  formatChatPipeline,
  isRetryableError,
} = require("../services/chat.services");

async function getChatsOfUser(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const limit = parseInt(req.query.limit) || 15;
    const before = req.query.before ? new Date(req.query.before) : null;

    const additionalStages = [
      { $match: { members: userId } },
      ...(before
        ? [
            {
              $match: {
                timesort: { $lt: before },
              },
            },
          ]
        : []),
      { $sort: { timesort: -1 } },
      { $limit: limit },
    ];

    const chats = await Chat.aggregate(formatChatPipeline(additionalStages));

    return res.status(200).json({
      message: "Danh sách đoạn chat của user",
      data: chats,
      nextCursor: chats.length > 0 ? chats[chats.length - 1]?.timesort : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách đoạn chat của user",
      error: error.message,
      retryAble: isRetryableError(error),
    });
  }
}

const getChatById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid chat ID" });
  }

  try {
    const chatId = new mongoose.Types.ObjectId(id);
    const chats = await Chat.aggregate(
      formatChatPipeline([{ $match: { _id: chatId } }])
    );

    if (!chats || chats.length === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    return res.status(200).json(chats[0]);
  } catch (err) {
    console.error("Error fetching chat:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getChatsOfUser,
  getChatById,
};
