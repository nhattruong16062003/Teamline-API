const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const ChatService = require('../services/socket.service');
const verifySocketToken = require('../middleware/socketAuth.middleware');

module.exports = (io) => {
  const chatService = new ChatService();

  io.on("connection", (socket) => {
    //kiểm tra token t=khi kết nối lần đầu
    // Lấy token từ cookie
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      console.log("No access token found in cookies.");
      socket.emit("token-expired", { message: "No access token provided." });
      return;
    }

    try {
      // Giải mã token khi kết nối
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.accessToken = accessToken; // Lưu token cho các sự kiện sau
      console.log(`User ${socket.userId} connected`);
    } catch (err) {
      console.error("Token verification error:", err.message);
      if (err.name === "TokenExpiredError") {
        socket.emit("token-expired", { message: "Access token has expired." });
      } else {
        socket.emit("token-invalid", { message: "Invalid access token." });
      }
      return;
    }

    //join room theo userId và đăng ký người dùng
    socket.on('join-user', (data) => {
      verifySocketToken(socket, () => {
        chatService.joinUser(socket, io, { data });
      });
    });

    socket.on('join-room', (data) => {
      verifySocketToken(socket, () => {
        chatService.joinRoom(socket, io, { data });
      });
    });

    socket.on('leave-room', (data) => {
      verifySocketToken(socket, () => {
        chatService.leaveRoom(socket, io, { data });
      });
    });

    socket.on('send-message', (data) => {
      verifySocketToken(socket, () => {
        chatService.sendMessage(socket, io, { data });
      });
    });

    //Sự kiện reaction tin nhắn
    socket.on('add-reaction', messageId => {
      verifySocketToken(socket, () => {
        chatService.addReaction(socket, io, messageId);
      });
    });

    //Sự kiện xóa reaction tin nhắn
    socket.on('remove-reaction', (messageId) => {
      verifySocketToken(socket, () => {
        chatService.removeReaction(socket, io, messageId);
      });
    });

    socket.on('disconnect', () => {
      chatService.disconnect(socket, io);
    });
  });
};
