const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const verifySocketToken = (socket, callback, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || "");
  const accessToken = cookies.accessToken;

  if (!accessToken) {
    // socket.emit("token-expired", { message: "No access token provided." });
    console.log("No access token found in cookies.");
    return callback("token-expired");
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next(); // Cho phép xử lý tiếp
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      //   socket.emit("token-expired", { message: "Access token has expired." });
      console.error("Token verification error:", err.message);
      return callback("token-expired");
    } else {
      //   socket.emit("token-invalid", { message: "Invalid access token." });
      console.error("Token verification error:", err.message);
      return callback("token-expired");
    }
    // Không gọi next -> chặn sự kiện tiếp theo
  }
};

module.exports = verifySocketToken;
