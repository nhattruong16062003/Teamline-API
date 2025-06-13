const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const verifySocketToken = (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const accessToken = cookies.accessToken;

    if (!accessToken) {
        socket.emit('token-expired', { message: 'No access token provided.' });
        console.log('No access token found in cookies.');
        return; // Không cho phép xử lý tiếp
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next(); // Cho phép xử lý tiếp
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            socket.emit('token-expired', { message: 'Access token has expired.' });
            console.error('Token verification error:', err.message);
        } else {
            socket.emit('token-invalid', { message: 'Invalid access token.' });
            console.error('Token verification error:', err.message);
        }
        // Không gọi next -> chặn sự kiện tiếp theo
    }
};

module.exports = verifySocketToken;
