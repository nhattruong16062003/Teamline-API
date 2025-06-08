const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // Bearer <token>
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token

  if (!token) return res.status(401).json({ message: "Thiếu token truy cập" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });

    req.user = user; // Lưu thông tin user vào req để controller sử dụng
    next();
  });
};

module.exports = {
  authenticateToken,
};
