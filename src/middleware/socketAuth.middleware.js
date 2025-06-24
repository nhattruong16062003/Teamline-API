const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const verifySocketToken = (socket, callback, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || "");
  const accessToken = cookies.accessToken;

  if (!accessToken) {
    // socket.emit("token-expired", { message: "No access token provided." });
    callback("token-expired");
    console.log("No access token found in cookies.");
    return; // Không cho phép xử lý tiếp
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next(); // Cho phép xử lý tiếp
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      //   socket.emit("token-expired", { message: "Access token has expired." });
      callback("token-expired");
      console.error("Token verification error:", err.message);
    } else {
      //   socket.emit("token-invalid", { message: "Invalid access token." });
      callback("token-expired");
      console.error("Token verification error:", err.message);
    }
    // Không gọi next -> chặn sự kiện tiếp theo
  }
};

module.exports = verifySocketToken;
