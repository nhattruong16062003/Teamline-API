const Chat = require("../models/Chat");
const mongoose = require("mongoose");

async function getChatsOfUser(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const limit = parseInt(req.query.limit) || 15;
    const before = req.query.before ? new Date(req.query.before) : null;

    const chats = await Chat.aggregate([
      // Lọc các đoạn chat mà user là thành viên
      { $match: { members: userId } },

      // Lấy tin nhắn cuối cùng (nếu có)
      {
        $lookup: {
          from: "messages",
          let: { chatId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "users",
                let: { senderId: "$sender" },
                pipeline: [
                  {
                    $match: { $expr: { $eq: ["$_id", "$$senderId"] } },
                  },
                  {
                    $project: { _id: 1 },
                  },
                ],
                as: "sender",
              },
            },
            {
              $unwind: {
                path: "$sender",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "lastMessage",
        },
      },

      // Gộp lastMessage thành object
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
        },
      },

      // Tạo trường timesort để phục vụ phân trang (fallback về createdAt nếu không có tin nhắn)
      {
        $addFields: {
          timesort: {
            $ifNull: ["$lastMessage.createdAt", "$createdAt"],
          },
        },
      },

      // Lọc theo timesort nếu có before
      ...(before
        ? [
            {
              $match: {
                timesort: { $lt: before },
              },
            },
          ]
        : []),

      // Sắp xếp theo thời gian mới nhất
      { $sort: { timesort: -1 } },

      // Giới hạn số kết quả
      { $limit: limit },

      // Lấy thông tin thành viên
      {
        $lookup: {
          from: "users",
          let: { memberIds: "$members" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$memberIds"] },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                avatar: 1,
              },
            },
          ],
          as: "members",
        },
      },

      // Chỉ giữ các trường cần thiết
      {
        $project: {
          _id: 1,
          members: 1,
          lastMessage: 1,
          name: 1,
          type: 1,
          timesort: 1, // cần để phân trang ở client
        },
      },
    ]);

    return res.status(200).json({
      message: "Danh sách đoạn chat của user",
      data: chats,
      nextCursor: chats.length > 0 ? chats[chats.length - 1]?.timesort : null,
    });
  } catch (error) {
    const retryableErrors = [
      "MongoNetworkError",
      "MongooseServerSelectionError",
    ];
    const isRetryAble =
      retryableErrors.includes(error.name) || error.message.includes("ECONN");

    return res.status(500).json({
      message: "Lỗi khi lấy danh sách đoạn chat của user",
      error: error.message,
      retryAble: isRetryAble,
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

    const chat = await Chat.aggregate([
      { $match: { _id: chatId } },

      // Lấy tin nhắn cuối cùng
      {
        $lookup: {
          from: "messages",
          let: { chatId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$chat", "$$chatId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "users",
                let: { senderId: "$sender" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$senderId"] } } },
                  { $project: { _id: 1 } },
                ],
                as: "sender",
              },
            },
            { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
          ],
          as: "lastMessage",
        },
      },

      // Gộp mảng lastMessage thành object
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
        },
      },

      // Lấy thông tin thành viên
      {
        $lookup: {
          from: "users",
          let: { memberIds: "$members" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$memberIds"] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                avatar: 1,
              },
            },
          ],
          as: "members",
        },
      },

      // Chỉ giữ các trường cần thiết
      {
        $project: {
          _id: 1,
          members: 1,
          lastMessage: 1,
          name: 1,
          type: 1,
        },
      },
    ]);

    if (!chat || chat.length === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    return res.status(200).json(chat[0]);
  } catch (err) {
    console.error("Error fetching chat:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getChatsOfUser,
  getChatById,
};
