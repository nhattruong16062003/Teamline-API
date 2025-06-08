const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // Bearer <token>
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token

  if (!token)
    return res.status(401).json({ message: "Access token is missing" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Invalid or expired token" });

    req.user = user; // lưu user vào request để controller có thể dùng
    next();
  });
};

module.exports = {
  authenticateToken,
};
