const mongoose = require("mongoose");
const User = require("../models/User");
const Chat = require("../models/Chat");

const {
  uploadImageBuffer,
  deleteImageFromDrive,
  getFileIdFromDriveUrl,
} = require("../services/googledrive.services");
const updateUserInfo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const { username, removeAvatar } = req.body;
    const avatarFile = req.files.find((f) => f.fieldname === "avatar");

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const updateData = { username };
    let oldAvatarFileId = getFileIdFromDriveUrl(user.avatar);

    // Nếu người dùng upload ảnh mới
    if (avatarFile) {
      // Nếu có avatar cũ → xóa
      if (oldAvatarFileId) {
        const deleted = await deleteImageFromDrive(oldAvatarFileId);
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
        const deleted = await deleteImageFromDrive(oldAvatarFileId);
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
        username: updatedUser.username,
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
    console.log("helo");
    const { email } = req.params;
    console.log(email);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const user = await User.findOne({ email });
    let chat = null;
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    // Kiểm tra xem có chat nào giữa người tìm kiếm và user._id hay không
    if (userId.toString() != user._id.toString()) {
      chat = await Chat.findOne({
        type: "private",
        members: { $all: [userId, user._id], $size: 2 },
      });
    }
    return res.status(200).json({
      message: "Thông tin user",
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      chatId: chat ? chat._id : null,
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

module.exports = {
  updateUserInfo,
  changePassword,
  getUserByEmail,
};
