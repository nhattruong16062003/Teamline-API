const Chat = require("../models/Chat");
const mongoose = require("mongoose");

const createGroup = async (currentUserId, groupName, memberIds) => {
  try {
    const memberObjectIds = memberIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    //Kiểm tra xem trong danh sách có người dùng hiện tại không?
    //Nếu không có thì auto thêm vào
    if (!memberObjectIds.some((id) => id.equals(currentUserId))) {
      memberObjectIds.push(currentUserId);
    }

    // Tạo nhóm mới
    const newGroup = await Chat.create({
      name: groupName,
      type: "group-private",
      members: memberObjectIds,
      owner: currentUserId,
      admins: [currentUserId],
    });

    // Gọi lại aggregate y hệt như trong getChatsOfUser
    const chats = await Chat.aggregate([
      { $match: { _id: newGroup._id } },

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
      {
        $addFields: {
          timesort: {
            $cond: {
              if: { $gt: [{ $type: "$lastMessage.createdAt" }, "missing"] },
              then: "$lastMessage.createdAt",
              else: "$createdAt",
            },
          },
        },
      },
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
    ]);
    return chats[0];
  } catch (err) {
    console.error("Error creating group:", err);
    throw new Error("Failed to create group");
  }
};

module.exports = {
  createGroup,
};
