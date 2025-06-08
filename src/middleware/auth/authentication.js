const { model } = require("mongoose");

const emailValidator = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Email không hợp lệ" });
  }

  next();
};

const passwordValidator = (req, res, next) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Mật khẩu phải có ít nhất 8 ký tự." });
  }
  if (!/[A-Z]/.test(password)) {
    return res
      .status(400)
      .json({ error: "Mật khẩu phải chứa ít nhất một chữ cái in hoa." });
  }
  if (!/[a-z]/.test(password)) {
    return res
      .status(400)
      .json({ error: "Mật khẩu phải chứa ít nhất một chữ cái thường." });
  }
  if (!/[0-9]/.test(password)) {
    return res
      .status(400)
      .json({ error: "Mật khẩu phải chứa ít nhất một chữ số." });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res
      .status(400)
      .json({ error: "Mật khẩu phải chứa ít nhất một ký tự đặc biệt." });
  }

  next();
};

module.exports = {
  emailValidator,
  passwordValidator,
};
