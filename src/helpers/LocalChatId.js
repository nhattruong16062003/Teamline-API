const isLocalChatId = (chatId) => {
    return typeof chatId === 'string' && chatId.startsWith('chatId_');
};

module.exports = { isLocalChatId };