const mongoose = require("mongoose");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { isLocalChatId } = require("../helpers/LocalChatId");

class SocketService {
  constructor() {
    this.users = new Map(); // socketId -> userId
    this.userToSocket = new Map(); // userId -> socketId
  }

  async joinUser(socket, io, { data }) {
    const userId = socket.userId || null; // Lấy userId từ data
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        socket.emit("error", { message: "ID người dùng không hợp lệ" });
        return;
      }

      // Kiểm tra user có tồn tại không
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", { message: "Người dùng không tồn tại" });
        return;
      }

      // Đăng ký user
      this.users.set(socket.id, { userId: userId });
      this.userToSocket.set(userId, socket.id);

      // Join room cá nhân, để phòng TH nếu user mở nhiều tap thì sau này mình gửi sự kiện cho user đó qua room của họ
      const roomName = `${userId}`;
      socket.join(roomName);

      console.log(`${socket.id} đã đăng ký và tham gia phòng ${roomName}`);

      socket.emit("user-joined"); // Nếu bạn muốn gửi confirm lại cho FE
    } catch (error) {
      console.error("Lỗi join user:", error);
      socket.emit("error", { message: "Không thể tham gia phòng" });
    }
  }

  async joinRoom(socket, io, { data }) {
    const roomId = data.roomId || null; // Lấy roomId từ data
    try {
      if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit("error", { message: "ID phòng không hợp lệ" });
        return;
      }

      // Kiểm tra room có tồn tại không
      const chatRoom = await Chat.findById(roomId);
      if (!chatRoom) {
        return;
      }

      // Tham gia phòng
      socket.join(roomId);
      socket.emit("room-joined"); // Nếu bạn muốn gửi confirm lại cho FE
      console.log(`${socket.id} đã tham gia phòng ${roomId}`);
    } catch (error) {
      console.error("Lỗi join room:", error);
    }
  }

  async sendMessage(socket, io, { data }) {
    const chatId = data.roomId || null;
    const message = data.message || null;
    const toUserId = data.toUserId || null;
    const replyTo = data.replyTo || null;

    let localChatId = null;
    if (!message || typeof message !== "string" || message.trim() === "") {
      console.log("Lỗi: Tin nhắn không hợp lệ", { chatId, message });
      socket.emit("send-error", { message: "Tin nhắn không hợp lệ", localId: data.localId });
      return;
    }

    const userId = this.users.get(socket.id)?.userId;
    if (!userId) {
      console.log(`Lỗi: Người dùng chưa đăng ký cho socket ${socket.id}`);
      socket.emit("send-error", {
        message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước.",
        localId: data.localId
      });
      return;
    }

    try {
      let chat;

      // nếu chatId là id tạm (tạo tin nhắn mới) thì kiểm tra có toUserId không và tạo chat trong db
      if (isLocalChatId(chatId)) {
        localChatId = chatId;
        if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
          console.log("Lỗi: toUserId không hợp lệ");
          socket.emit("send-error", { message: "ID người nhận không hợp lệ", localId: data.localId });
          return;
        }

        chat = new Chat({
          name: null,
          type: "private",
          members: [userId, toUserId],
          admins: null,
          owner: null,
          pinnedMessages: [],
          allowChat: true,
        });

        await chat.save();
        console.log(`Chat mới đã được tạo: ${chat._id}`);
      }
      // Nếu truyền chatId → kiểm tra chat có tồn tại
      else if (chatId && mongoose.Types.ObjectId.isValid(chatId)) {
        chat = await Chat.findById(chatId);
        if (!chat) {
          console.log("Lỗi: Phòng chat không tồn tại");
          socket.emit("send-error", { message: "Phòng chat không tồn tại", localId: data.localId });
          return;
        }
      }

      // Lưu tin nhắn
      const savedMessage = await Message.create({
        sender: userId,
        content: message,
        type: "text",
        fileUrl: null,
        replyTo: replyTo,
        reactions: [],
        seenBy: [],
        chat: chat._id,
      });

      // Populate để trả về giống format khi load danh sách
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'name avatar')
        .populate({
          path: 'replyTo',
          select: 'content sender',
          populate: {
            path: 'sender',
            select: 'name'
          }
        })
        .populate('chat', 'type')
        .lean();

      // Lấy tất cả socketId trong room hiện tại
      const socketIdsInRoom =
        io.sockets.adapter.rooms.get(chat._id.toString()) || new Set();

      // Gửi cho tất cả socket trong room trừ bản thân
      socket.to(chat._id.toString()).emit("received-message", populatedMessage);

      // Gửi trực tiếp cho các user chưa vào room (nhưng đang online)
      for (const memberId of chat.members) {
        // Bỏ qua người gửi
        if (memberId.toString() === userId.toString()) continue;

        const toSocketId = this.userToSocket.get(memberId.toString());
        if (toSocketId && io.sockets.sockets.has(toSocketId)) {
          // Nếu socket đã tham gia room thì không gửi lại nữa
          if (!socketIdsInRoom.has(toSocketId)) {
            io.to(toSocketId).emit("received-message", populatedMessage);
          }
        }
      }

      // Trả về cho người gửi xác nhận đã gửi
      socket.emit("message-sent", {
        status: "saved",
        sentAt: savedMessage.createdAt,
        chatId: chat._id,
        messageContent: savedMessage.content || savedMessage.fileUrl || null,
        messageSender: savedMessage.sender,
        localId: data.localId,
        messageId: savedMessage._id,
        localChatId: localChatId,
      });
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      socket.emit("send-error", { message: "Không thể gửi tin nhắn", localId: data.localId });
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
      socket.emit("error", {
        message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước.",
      });
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

      // Gửi lại cho các client (trừ bản thân)
      socket.to(message.chat.toString()).emit("reaction-added", {
        messageId,
        userId: user.userId,
      });
      //gửi lại cho chính bản thân
      socket.emit("reaction-added", { messageId, userId: user.userId });
      //gửi lại cho bản thân trong trường hợp sau khi refreshtoken chưa join room
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
      socket.emit("error", {
        message: "Người dùng chưa đăng ký. Vui lòng đăng ký trước.",
      });
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

      // Gửi lại cho các client trừ bản thân
      socket.to(message.chat.toString()).emit("reaction-removed", {
        messageId,
        userId: user.userId,
      });
      //gửi lại cho chính bản thân
      socket.emit("reaction-removed", {
        messageId,
        userId: user.userId,
      });

    } catch (error) {
      console.error("Lỗi khi xóa reaction:", error);
      socket.emit("error", { message: "Không thể xóa reaction" });
    }
  }

  async leaveRoom(socket, io, { data }) {
    const roomId = data.roomId || null; // Lấy roomId từ data
    try {
      if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
        socket.emit("error", { message: "ID phòng không hợp lệ" });
        return;
      }

      // Thoát khỏi phòng
      socket.leave(roomId);
      console.log(`${socket.id} đã rời phòng ${roomId}`);
    } catch (error) {
      console.error("Lỗi leave room:", error);
    }
  }

  async newGroupChat(socket, io, newGroup) {
    const members = newGroup?.members || [];

    members.forEach((member) => {
      const socketId = this.userToSocket.get(member._id.toString());
      if (socketId) {
        io.to(socketId).emit("group-new", { newGroup });
      }
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
