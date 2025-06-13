const mongoose = require('mongoose');
const Message = require('../models/Message'); // Đường dẫn đến Message model
const Chat = require('../models/Chat'); // Đường dẫn đến Chat model

const getMessages = async (req, res) => {
    try {
        const userId = req.userId; // Lấy userId từ token (giả định middleware đã thêm vào req.user)
        const { activeChatUserId, page } = req.params; // Lấy activeChatUserId từ tham số URL
        const limit = 20; // Số tin nhắn mỗi trang
        const skip = (page - 1) * limit; // Tính số tin nhắn cần bỏ qua

        console.log("Lấy tin nhắn cho userId:", userId, "với activeChatUserId:", activeChatUserId, "trang:", page);

        // Kiểm tra userId và activeChatUserId
        if (!userId || !activeChatUserId) {
            return res.status(400).json({ message: "User ID và Active Chat User ID là bắt buộc" });
        }

        // Đảm bảo userId và activeChatUserId là ObjectId hợp lệ
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(activeChatUserId)) {
            return res.status(400).json({ message: "ID người dùng không hợp lệ" });
        }

        // Tìm cuộc trò chuyện mà cả userId và activeChatUserId đều là thành viên
        const chat = await Chat.findOne({
            members: { $all: [userId, activeChatUserId] },
            type: 'private', // Chỉ lấy cuộc trò chuyện cá nhân
        });

        if (!chat) {
            return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
        }

        // Lấy tổng số tin nhắn để tính phân trang
        const totalMessages = await Message.countDocuments({ chat: chat._id });

        // Lấy 20 tin nhắn cuối cùng từ cuộc trò chuyện
        const messages = await Message.find({ chat: chat._id })
            .sort({ createdAt: -1 }) // Sắp xếp theo thời gian giảm dần
            .skip(skip) // Bỏ qua các tin nhắn của trang trước
            .limit(limit) // Giới hạn 20 tin nhắn
            .populate('sender', 'name') // Populate tên người gửi (tùy chỉnh theo schema User)
            .populate('replyTo', 'content') // Populate nội dung tin nhắn được trả lời (nếu có)
            .lean(); // Chuyển đổi sang plain JavaScript object để tối ưu

        // Nếu không có tin nhắn
        if (!messages || messages.length === 0) {
            return res.status(200).json({
                messages: [],
                currentPage: page,
                totalPages: 0,
                totalMessages: 0,
            });
        }

        // Tính tổng số trang
        const totalPages = Math.ceil(totalMessages / limit);

        // Trả về kết quả
        return res.status(200).json({
            messages: messages.reverse(), // Đảo ngược để hiển thị tin nhắn theo thứ tự thời gian tăng dần
            currentPage: page,
            totalPages,
            totalMessages,
        });
    } catch (error) {
        console.error("Lỗi khi lấy tin nhắn:", error);
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy tin nhắn",
            error: error.message,
        });
    }
};

module.exports = {
    getMessages,
};