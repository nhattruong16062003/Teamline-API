const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const ChatService = require('../services/chat.service');
const verifySocketToken = require('../middleware/socketAuth.middleware');

module.exports = (io) => {
    const chatService = new ChatService();

    io.on('connection', (socket) => {
        //kiểm tra token t=khi kết nối lần đầu
        // Lấy token từ cookie
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const accessToken = cookies.accessToken;

        if (!accessToken) {
            console.log('No access token found in cookies.');
            socket.emit('token-expired', { message: 'No access token provided.' });
            return;
        }

        try {
            // Giải mã token khi kết nối
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.accessToken = accessToken; // Lưu token cho các sự kiện sau
            console.log(`User ${socket.userId} connected`);
        } catch (err) {
            console.error('Token verification error:', err.message);
            if (err.name === 'TokenExpiredError') {
                socket.emit('token-expired', { message: 'Access token has expired.' });
            } else {
                socket.emit('token-invalid', { message: 'Invalid access token.' });
            }
            return;
        }


        // Lắng nghe các sự kiện với kiểm tra token
        socket.on('register', (data) => {
            verifySocketToken(socket, () => {
                chatService.registerUser(socket);
            });
        });

        socket.on('private-message', (data) => {
            verifySocketToken(socket, () => {
                chatService.sendPrivateMessage(socket, io, data);
            });
        });

        socket.on('join-room', (room) => {
            verifySocketToken(socket, () => {
                chatService.joinRoom(socket, io, room);
            });
        });

        socket.on('group-message', (data) => {
            verifySocketToken(socket, () => {
                chatService.sendGroupMessage(socket, io, data);
            });
        });

        socket.on('disconnect', () => {
            chatService.disconnect(socket, io);
        });
    });
};
