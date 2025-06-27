const Chat = require("../models/Chat");
const mongoose = require("mongoose");

const createGroup = async (currentUserId, groupName, memberIds) => {
  try {
    const memberObjectIds = memberIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    if (!memberObjectIds.some((id) => id.equals(currentUserId))) {
      memberObjectIds.push(currentUserId);
    }

    const newGroup = await Chat.create({
      name: groupName,
      type: "group-private",
      members: memberObjectIds,
      owner: currentUserId,
      admins: [currentUserId],
    });

    const chats = await Chat.aggregate(
      formatChatPipeline([{ $match: { _id: newGroup._id } }])
    );

    return chats[0];
  } catch (err) {
    console.error("Error creating group:", err);
    throw new Error("Failed to create group");
  }
};

// Hàm chung để format dữ liệu chat
const formatChatPipeline = (additionalStages = []) => {
  const basePipeline = [
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
    // Thêm trường timesort
    {
      $addFields: {
        timesort: {
          $ifNull: ["$lastMessage.createdAt", "$createdAt"],
        },
      },
    },
    // Sắp xếp theo timesort giảm dần (mới nhất lên đầu)
    {
      $sort: { timesort: -1 },
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
    // Project các trường cần thiết
    {
      $project: {
        _id: 1,
        members: 1,
        lastMessage: 1,
        name: 1,
        type: 1,
        timesort: 1,
      },
    },
  ];

  return [...additionalStages, ...basePipeline];
};

// Hàm chung để xử lý lỗi có thể retry
const isRetryableError = (error) => {
  const retryableErrors = ["MongoNetworkError", "MongooseServerSelectionError"];
  return (
    retryableErrors.includes(error.name) || error.message.includes("ECONN")
  );
};

module.exports = {
  createGroup,
  formatChatPipeline,
  isRetryableError,
};
