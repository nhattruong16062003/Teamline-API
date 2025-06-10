const ChatService = require('../service/chat.service');

module.exports = (io) => {
    const chatService = new ChatService();

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('register', (username) => {
            chatService.registerUser(socket, username);
        });

        socket.on('private-message', (data) => {
            chatService.sendPrivateMessage(socket, io, data);
        });

        socket.on('join-room', (room) => {
            chatService.joinRoom(socket, io, room);
        });

        socket.on('group-message', (data) => {
            chatService.sendGroupMessage(socket, io, data);
        });

        socket.on('disconnect', () => {
            chatService.disconnect(socket, io);
        });
    });
};
