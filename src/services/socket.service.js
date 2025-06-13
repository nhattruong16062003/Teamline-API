const mongoose = require("mongoose");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");

class SocketService {
  constructor() {
    this.users = new Map(); // socketId -> userId
    // this.rooms = new Map(); // roomID -> Set(socketId)
    this.userToSocket = new Map(); // userId -> socketId
  }

  async registerUser(socket) {
    if (!socket.userId || !mongoose.Types.ObjectId.isValid(socket.userId)) {
      console.log(
        `Đăng ký thất bại: userId không hợp lệ cho socket ${socket.id}`
      );
      socket.emit("error", { message: "ID người dùng không hợp lệ" });
      return false;
    }

    // Kiểm tra userId tồn tại trong database
    const user = await User.findById(socket.userId);
    if (!user) {
      console.log(
        `Đăng ký thất bại: Không tìm thấy người dùng với userId ${socket.userId}`
      );
      socket.emit("error", { message: "Người dùng không tồn tại" });
      return false;
    }

    this.users.set(socket.id, { userId: socket.userId });
    this.userToSocket.set(socket.userId, socket.id);
    console.log(
      `Người dùng đã đăng ký: userId=${socket.userId}, socketId=${socket.id}`
    );
    socket.emit("registered", { userId: socket.userId });
    return true;
  }

  async sendPrivateMessage(socket, io, { toUserId, message }) {
    if (
      !toUserId ||
      !message ||
      typeof message !== "string" ||
      message.trim() === "" ||
      !mongoose.Types.ObjectId.isValid(toUserId)
    ) {
      console.log("Lỗi: Tin nhắn hoặc người nhận không hợp lệ", {
        toUserId,
        message,
      });
      socket.emit("error", {
        message: "Tin nhắn hoặc ID người nhận không hợp lệ",
      });
      return;
    }

    const user = this.users.get(socket.id);
    if (!user) {
      console.log(`Lỗi: Người dùng chưa đăng ký cho socket ${socket.id}`);
      socket.emit("error", {
        message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước.",
      });
      return;
    }

    console.log("fromUserId:", socket.userId);
    console.log("toUserId:", toUserId);

    try {
      // Kiểm tra người nhận tồn tại
      const recipient = await User.findById(toUserId);
      if (!recipient) {
        console.log(`Lỗi: Không tìm thấy người nhận với userId ${toUserId}`);
        socket.emit("error", { message: "Người nhận không tồn tại" });
        return;
      }
      if (socket.userId.toString() === toUserId.toString()) {
        console.log(`Lỗi: Người gửi và người nhận không thể là cùng một người`);
        socket.emit("error", {
          message: "Người gửi và người nhận không thể là cùng một người",
        });
        return;
      }
      // Kiểm tra người gửi có tồn tại
      let chat = await Chat.findOne({
        type: "private",
        members: { $all: [socket.userId, toUserId] },
      });
      if (!chat) {
        // Tạo chat mới nếu chưa tồn tại
        chat = new Chat({
          name: null,
          type: "private",
          members: [socket.userId, toUserId],
          admins: null,
          owner: null,
          pinnedMessages: [],
          allowChat: true,
        });
        await chat.save();
        console.log(`Chat mới đã được tạo: ${chat._id}`);
      }
      const savedMessage = await Message.create({
        sender: socket.userId,
        content: message,
        type: "text",
        fileUrl: null,
        replyTo: null,
        reactions: [],
        seenBy: [],
        chat: chat._id,
      });

      //phải gửi đủ thông tin để hiển thị tin nhắn
      const toSocketId = this.userToSocket.get(toUserId.toString());
      if (toSocketId && io.sockets.sockets.has(toSocketId)) {
        io.to(toSocketId).emit("private-message", savedMessage);
      } else {
        console.log(`Người nhận ${toUserId} không online`);
      }

      socket.emit("message-sent", {
        status: "saved",
        sentAt: savedMessage.createdAt,
      });
    } catch (error) {
      console.error("Lỗi khi lưu tin nhắn:", error);
      socket.emit("error", { message: "Không thể gửi tin nhắn" });
    }
  }

  async addReaction(socket, io, { messageId }) {
    if (!messageId) {
      console.log("Lỗi: Tin nhắn không hợp lệ", { messageId });
      socket.emit("error", { message: "Tin nhắn không tồn tại" });
      return;
    }

    const user = this.users.get(socket.id);
    if (!user) {
      console.log(`Lỗi: Người dùng chưa đăng ký cho socket ${socket.id}`);
      socket.emit("error", { message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước." });
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`Lỗi: Không tìm thấy tin nhắn với ID ${messageId}`);
        socket.emit("error", { message: "Tin nhắn không tồn tại" });
        return;
      }

      // Kiểm tra xem người dùng đã thả tim chưa
      const alreadyReacted = message.reactions.some(
        (userId) => userId.toString() === user.userId.toString()
      );

      if (alreadyReacted) {
        console.log(`Lỗi: Người dùng đã thả tim tin nhắn ${messageId}`);
        // socket.emit("error", { message: "Bạn đã thả tim tin nhắn này" });
        return;
      }

      // Thêm userId vào mảng reactions
      message.reactions.push(user.userId);
      await message.save();

      // Gửi lại cho các client
      io.to(message.chat.toString()).emit("reaction-added", { messageId, userId: user.userId });
    } catch (error) {
      console.error("Lỗi khi thêm reaction:", error);
      socket.emit("error", { message: "Không thể thêm reaction" });
    }
  }

  async removeReaction(socket, io, { messageId }) {
    if (!messageId) {
      console.log("Lỗi: Tin nhắn không hợp lệ", { messageId });
      socket.emit("error", { message: "Tin nhắn không tồn tại" });
      return;
    }

    const user = this.users.get(socket.id);
    if (!user) {
      console.log(`Lỗi: Người dùng chưa đăng ký cho socket ${socket.id}`);
      socket.emit("error", { message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước." });
      return;
    }

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.log(`Lỗi: Không tìm thấy tin nhắn với ID ${messageId}`);
        socket.emit("error", { message: "Tin nhắn không tồn tại" });
        return;
      }

      // Kiểm tra xem người dùng đã thả tim chưa
      const hasReacted = message.reactions.some(
        (userId) => userId.toString() === user.userId.toString()
      );

      if (!hasReacted) {
        console.log(`Lỗi: Người dùng chưa thả tim tin nhắn ${messageId}`);
        socket.emit("error", { message: "Bạn chưa thả tim tin nhắn này" });
        return;
      }

      // Xóa reaction của user
      message.reactions = message.reactions.filter(
        (userId) => userId.toString() !== user.userId.toString()
      );
      await message.save();

      // Gửi lại cho các client
      io.to(message.chat.toString()).emit("reaction-removed", { messageId, userId: user.userId });
    } catch (error) {
      console.error("Lỗi khi xóa reaction:", error);
      socket.emit("error", { message: "Không thể xóa reaction" });
    }
  }

  async joinRoom(socket, io) {
    socket.on("join-room", async ({ roomId }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          socket.emit("error", { message: "ID phòng không hợp lệ" });
          return;
        }

        // Optional: kiểm tra room có tồn tại không
        const chatRoom = await Chat.findById(roomId);
        if (!chatRoom) {
          socket.emit("error", { message: "Phòng không tồn tại" });
          return;
        }

        // Tham gia phòng
        socket.join(roomId);
        console.log(`${socket.id} đã tham gia phòng ${roomId}`);

      } catch (error) {
        console.error('Lỗi join room:', error);
        socket.emit("error", { message: "Lỗi khi tham gia phòng." });
      }
    });
  };

  async leaveRoom(socket, io) {
    socket.on("leave-room", ({ roomId }) => {
      if (!roomId) {
        socket.emit("error", { message: "Room ID không hợp lệ" });
        return;
      }

      // Thoát khỏi phòng
      socket.leave(roomId);
      console.log(`${socket.id} đã rời phòng ${roomId}`);

    });
  };

  sendGroupMessage(socket, io, { roomName, message }) {
    if (
      !roomName ||
      !message ||
      typeof message !== "string" ||
      message.trim() === ""
    ) {
      console.log("Lỗi: Tin nhắn hoặc phòng không hợp lệ", {
        roomName,
        message,
      });
      socket.emit("error", { message: "Tin nhắn hoặc phòng không hợp lệ" });
      return;
    }

    const user = this.users.get(socket.id);
    const username = user ? user.username : "Người dùng ẩn danh";
    io.to(roomName).emit("group-message", {
      from: username,
      message,
    });
  }

  disconnect(socket, io) {
    // Xóa user khỏi danh sách quản lý
    this.users.delete(socket.id);

    // Lặp qua tất cả các phòng mà socket đang tham gia
    socket.rooms.forEach((roomId) => {
      // Bỏ qua phòng mặc định là chính socket id
      if (roomId === socket.id) return;

      // Cập nhật danh sách socketId trong phòng nếu bạn đang lưu thủ công
      if (this.rooms.has(roomId)) {
        const socketIds = this.rooms.get(roomId);
        socketIds.delete(socket.id);

        // Nếu phòng không còn người, bạn có thể xóa phòng
        if (socketIds.size === 0) {
          this.rooms.delete(roomId);
          console.log(`Phòng ${roomId} đã bị xóa vì không còn người dùng`);
        }
      }
    });

    console.log(`${socket.id} đã ngắt kết nối và rời tất cả phòng`);
  }

}

module.exports = SocketService;
