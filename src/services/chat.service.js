const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

class ChatService {
    constructor() {
        this.users = new Map(); // socketId -> userId
        this.rooms = new Map(); // roomName -> Set(socketId)
        this.userToSocket = new Map(); // userId -> socketId
    }

    async registerUser(socket, userId) {
        if (!socket.userId || !mongoose.Types.ObjectId.isValid(socket.userId)) {
            console.log(`Đăng ký thất bại: userId không hợp lệ cho socket ${socket.id}`);
            socket.emit('error', { message: 'ID người dùng không hợp lệ' });
            return false;
        }

        // Kiểm tra userId tồn tại trong database
        const user = await User.findById(socket.userId);
        if (!user) {
            console.log(`Đăng ký thất bại: Không tìm thấy người dùng với userId ${socket.userId}`);
            socket.emit('error', { message: 'Người dùng không tồn tại' });
            return false;
        }

        this.users.set(socket.id, { userId: socket.userId });
        this.userToSocket.set(socket.userId, socket.id);
        console.log(`Người dùng đã đăng ký: userId=${socket.userId}, socketId=${socket.id}`);
        socket.emit('registered', { userId: socket.userId });
        return true;

    }

    async sendPrivateMessage(socket, io, { toUserId, message }) {
        if (!toUserId || !message || typeof message !== 'string' || message.trim() === '' || !mongoose.Types.ObjectId.isValid(toUserId)) {
            console.log('Lỗi: Tin nhắn hoặc người nhận không hợp lệ', { toUserId, message });
            socket.emit('error', { message: 'Tin nhắn hoặc ID người nhận không hợp lệ' });
            return;
        }

        const user = this.users.get(socket.id);
        if (!user) {
            console.log(`Lỗi: Người dùng chưa đăng ký cho socket ${socket.id}`);
            socket.emit('error', { message: 'Người dùng chưa đăng ký. Vui lòng đăng ký trước.' });
            return;
        }

        console.log('fromUserId:', socket.userId);
        console.log('toUserId:', toUserId);

        try {
            // Kiểm tra người nhận tồn tại
            const recipient = await User.findById(toUserId);
            if (!recipient) {
                console.log(`Lỗi: Không tìm thấy người nhận với userId ${toUserId}`);
                socket.emit('error', { message: 'Người nhận không tồn tại' });
                return;
            }
            if (socket.userId.toString() === toUserId.toString()) {
                console.log(`Lỗi: Người gửi và người nhận không thể là cùng một người`);
                socket.emit('error', { message: 'Người gửi và người nhận không thể là cùng một người' });
                return;
            }
            // Kiểm tra người gửi có tồn tại
            let chat = await Chat.findOne({
                type: 'private',
                members: { $all: [socket.userId, toUserId] }
            });
            if (!chat) {
                // Tạo chat mới nếu chưa tồn tại
                chat = new Chat({
                    name: null,
                    type: 'private',
                    members: [socket.userId, toUserId],
                    admins: null,
                    owner: null,
                    pinnedMessages: [],
                    allowChat: true
                });
                await chat.save();
                console.log(`Chat mới đã được tạo: ${chat._id}`);
            }
            const savedMessage = await Message.create({
                sender: socket.userId,
                content: message,
                type: 'text',
                fileUrl: null,
                replyTo: null,
                reactions: [],
                seenBy: [],
                chat: chat._id,
            });

            const toSocketId = this.userToSocket.get(toUserId.toString());
            if (toSocketId && io.sockets.sockets.has(toSocketId)) {
                io.to(toSocketId).emit('private-message', {
                    fromUserId: socket.userId,
                    message,
                    sentAt: savedMessage.createdAt,
                });
            } else {
                console.log(`Người nhận ${toUserId} không online`);
            }

            socket.emit('message-sent', {
                status: 'saved',
                sentAt: savedMessage.createdAt,
            });

        } catch (error) {
            console.error('Lỗi khi lưu tin nhắn:', error);
            socket.emit('error', { message: 'Không thể gửi tin nhắn' });
        }
    }

    joinRoom(socket, io, roomName) {
        if (!roomName || typeof roomName !== 'string' || roomName.trim() === '') {
            console.log('Lỗi: Tên phòng không hợp lệ', { roomName });
            socket.emit('error', { message: 'Tên phòng không hợp lệ' });
            return;
        }

        socket.join(roomName);

        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, new Set());
        }
        this.rooms.get(roomName).add(socket.id);

        const user = this.users.get(socket.id);
        const username = user ? user.username : 'Người dùng ẩn danh';
        io.to(roomName).emit('system-message', `${username} đã tham gia phòng ${roomName}`);
    }

    sendGroupMessage(socket, io, { roomName, message }) {
        if (!roomName || !message || typeof message !== 'string' || message.trim() === '') {
            console.log('Lỗi: Tin nhắn hoặc phòng không hợp lệ', { roomName, message });
            socket.emit('error', { message: 'Tin nhắn hoặc phòng không hợp lệ' });
            return;
        }

        const user = this.users.get(socket.id);
        const username = user ? user.username : 'Người dùng ẩn danh';
        io.to(roomName).emit('group-message', {
            from: username,
            message,
        });
    }

    disconnect(socket, io) {
        // const user = this.users.get(socket.id);
        // if (!user) {
        //     console.log(`Không tìm thấy người dùng cho socket ${socket.id} khi ngắt kết nối`);
        //     return;
        // }

        // const { userId, username } = user;
        this.users.delete(socket.id);
        // this.userToSocket.delete(userId.toString());

        // for (const [roomName, socketIds] of this.rooms) {
        //     if (socketIds.has(socket.id)) {
        //         socketIds.delete(socket.id);
        //         io.to(roomName).emit('system-message', `${username} đã rời phòng ${roomName}`);

        //         if (socketIds.size === 0) {
        //             this.rooms.delete(roomName);
        //             console.log(`Phòng ${roomName} đã bị xóa vì không còn người dùng`);
        //         }
        //     }
        // }
    }
}

module.exports = ChatService;