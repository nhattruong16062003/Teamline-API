const mongoose = require("mongoose");
const User = require("../models/User");
const Chat = require("../models/Chat");

const {
  uploadImageBuffer,
  deleteFileFromDrive,
  getFileIdFromDriveUrl,
} = require("../services/googledrive.services");
const updateUserInfo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const { name, removeAvatar } = req.body;
    const avatarFile = req.files.find((f) => f.fieldname === "avatar");

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const updateData = { name };
    let oldAvatarFileId = getFileIdFromDriveUrl(user.avatar);

    // Nếu người dùng upload ảnh mới
    if (avatarFile) {
      // Nếu có avatar cũ → xóa
      if (oldAvatarFileId) {
        const deleted = await deleteFileFromDrive(oldAvatarFileId);
        if (!deleted) throw new Error("Failed to delete old avatar");
      }

      // Upload ảnh mới
      const newUrl = await uploadImageBuffer({
        buffer: avatarFile.buffer,
        fileName: `${userId}_${Date.now()}_${avatarFile.originalname}`,
        mimeType: avatarFile.mimetype,
        folderId: process.env.GDRIVE_AVATAR_FOLDER_ID,
      });
      updateData.avatar = newUrl;
    }

    // Nếu người dùng chọn xóa avatar
    if (removeAvatar === "true") {
      if (oldAvatarFileId) {
        const deleted = await deleteFileFromDrive(oldAvatarFileId);
        if (!deleted) throw new Error("Failed to delete avatar");
      }
      updateData.avatar = "";
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      session,
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update user error:", err.message);
    return res.status(500).json({ message: "Update failed" });
  }
};

const changePassword = async (req, res) => {};

const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const userId = new mongoose.Types.ObjectId(req.userId);
    console.log(email);
    const user = await User.findOne({ email, isVerify: true });
    let chat = null;
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    // Kiểm tra xem có chat nào giữa người tìm kiếm và user._id hay không
    if (userId.toString() !== user._id.toString()) {
      chat = await Chat.findOne({
        type: "private",
        members: { $all: [userId, user._id], $size: 2 },
      });
    }
    return res.status(200).json({
      message: "Thông tin user",
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
      chatId: chat ? chat._id : null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};
const getConnectedUsers = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const chats = await Chat.find({ members: userId });

    // Tạo map từ connectedUserId -> chatId
    const connectedUserMap = new Map();
    chats.forEach((chat) => {
      chat.members.forEach((memberId) => {
        if (memberId.toString() !== userId.toString()) {
          connectedUserMap.set(memberId.toString(), chat._id);
        }
      });
    });

    const connectedUserIds = Array.from(connectedUserMap.keys());

    const limit = parseInt(req.query.limit) || 10;
    const lastId = req.query.lastId;

    const query = {
      _id: { $in: connectedUserIds },
    };

    if (lastId) {
      query._id.$gt = new mongoose.Types.ObjectId(lastId);
    }

    const users = await User.find(query)
      .sort({ _id: 1 })
      .limit(limit)
      .select("_id name avatar");

    // Gắn chatId vào từng user
    const usersWithChatId = users.map((user) => ({
      ...user.toObject(),
      chatId: connectedUserMap.get(user._id.toString()),
    }));

    const hasMore = users.length === limit;
    const nextCursor = hasMore ? users[users.length - 1]._id : null;

    res.status(200).json({ users: usersWithChatId, hasMore, nextCursor });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách người đã kết nối:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  updateUserInfo,
  changePassword,
  getUserByEmail,
  getConnectedUsers,
};
