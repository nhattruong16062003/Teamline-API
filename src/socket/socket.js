const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const ChatService = require("../services/socket.service");
const verifySocketToken = require("../middleware/socketAuth.middleware");

module.exports = (io) => {
  const chatService = new ChatService();

  io.on("connection", (socket) => {
    //kiểm tra token khi kết nối lần đầu
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
    socket.on("join-user", (data, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.joinUser(socket, io, { data });
      });
    });

    socket.on("join-room", (data, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.joinRoom(socket, io, { data });
      });
    });

    socket.on("leave-room", (data, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.leaveRoom(socket, io, { data });
      });
    });

    socket.on("send-message", (data, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.sendMessage(socket, io, { data });
      });
    });

    //Sự kiện reaction tin nhắn
    socket.on("add-reaction", (messageId, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.addReaction(socket, io, messageId);
      });
    });

    //Sự kiện xóa reaction tin nhắn
    socket.on("remove-reaction", (messageId, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.removeReaction(socket, io, messageId);
      });
    });

    socket.on("group-created", async (groupData, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.newGroupChat(socket, io, groupData, callback);
      });
    });

    socket.on("accept-group-invite", async (data, callback) => {
      verifySocketToken(socket, callback, () => {
        chatService.acceptGroupInvite(socket, io, data, callback);
      });
    });

    socket.on("disconnect", () => {
      chatService.disconnect(socket, io);
    });
  });
};
