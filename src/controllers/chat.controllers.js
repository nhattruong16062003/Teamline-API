const Chat = require("../models/Chat");
const Message = require("../models/Message");
const mongoose = require("mongoose");

async function getChatsOfUser(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    console.log("userud", userId);
    const limit = parseInt(req.query.limit) || 15;
    const before = req.query.before ? new Date(req.query.before) : null;

    const chats = await Chat.aggregate([
      // Chỉ lấy các chat mà user là thành viên
      { $match: { members: userId } },

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
                  {
                    $match: { $expr: { $eq: ["$_id", "$$senderId"] } },
                  },
                  {
                    $project: { _id: 1 }, //chỉ lấy sender._id
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

      // Gộp mảng lastMessage thành object
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
        },
      },

      // Lọc theo thời gian nếu có
      ...(before
        ? [
            {
              $match: {
                "lastMessage.createdAt": { $lt: before },
              },
            },
          ]
        : []),

      // Sắp xếp theo thời gian tin nhắn mới nhất
      { $sort: { "lastMessage.createdAt": -1 } },

      // Giới hạn số kết quả
      { $limit: limit },

      // Lấy thông tin thành viên (chỉ id, name, avatar)
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
                username: 1,
                avatar: 1,
              },
            },
          ],
          as: "members",
        },
      },

      //Chỉ giữ các trường cần thiết sau cùng
      {
        $project: {
          _id: 1,
          members: 1,
          lastMessage: 1,
          name: 1, // giữ nếu bạn có tên nhóm
          type: 1, // giữ nếu có loại nhóm (private/group)
        },
      },
    ]);

    return res.status(200).json({
      message: "Danh sách đoạn chat của user",
      data: chats,
      nextCursor:
        chats.length > 0
          ? chats[chats.length - 1]?.lastMessage?.createdAt
          : null,
    });
  } catch (error) {
    //Kiểm tra lỗi ngoại cảnh
    const retryableErrors = [
      "MongoNetworkError",
      "MongooseServerSelectionError",
    ];
    const isRetryable =
      retryableErrors.includes(error.name) || error.message.includes("ECONN");

    return res.status(500).json({
      message: "Lỗi khi lấy danh sách đoạn chat của user",
      error: error.message,
      retryable: isRetryable, //giúp FE biết nên thử lại hay không
    });
  }
}

module.exports = {
  getChatsOfUser,
};
