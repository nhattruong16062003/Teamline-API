const mongoose = require('mongoose');
const Message = require('../models/Message'); // Đường dẫn đến Message model
const Chat = require('../models/Chat'); // Đường dẫn đến Chat model

const getMessages = async (req, res) => {
    try {
        const userId = req.userId; // Lấy userId từ token
        const { chatId, page } = req.params; // Lấy chatId và page từ query string, mặc định page = 1
        const limit = 15;
        const skip = (page - 1) * limit;

        if (!userId || !chatId) {
            return res.status(400).json({ message: "User ID và Chat ID là bắt buộc" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({ message: "ID không hợp lệ" });
        }

        const totalMessages = await Message.countDocuments({ chat: chatId });

        const messages = await Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name')
            .populate('replyTo', 'content')
            .lean();

        if (!messages || messages.length === 0) {
            return res.status(200).json({
                messages: [],
                currentPage: page,
                totalPages: 0,
                totalMessages: 0,
            });
        }

        const totalPages = Math.ceil(totalMessages / limit);

        return res.status(200).json({
            messages: messages.reverse(),
            currentPage: page,
            totalPages,
            totalMessages,
        });
        // setTimeout(() => {
        //     return res.status(200).json({
        //         messages: messages.reverse(),
        //         currentPage: page,
        //         totalPages,
        //         totalMessages,
        //     });
        // }, 5000); // Delay
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