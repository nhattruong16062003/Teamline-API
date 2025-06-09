const pug = require("pug");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Poll = require("../models/Poll");
const {
  emailValidator,
  passwordValidator,
} = require("../helpers/authentication");

const sendEmail = require("../services/emailSender");

const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    //Check dữ liệu đầu vào của email và password
    if (!emailValidator(email) || !passwordValidator(password)) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không hợp lệ" });
    }
    //Check xem user đã tồn tại chưa?
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "email đã được sử dụng" });
    //Tạo mới user với dữ liệu đầu vào
    const newUser = new User({
      username,
      password,
      email,
    });
    const savedUser = await newUser.save();

    verifyToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const html = pug.renderFile(
      path.join(__dirname, "../views", "verify-email.pug"),
      {
        name: username,
        verifyUrl: `${process.env.URL_BE}/api/auth/verify-email?token=${verifyToken}`,
      }
    );
    //Gửi email xác thực tài khoản
    await sendEmail({
      to: email,
      subject: "Xác minh tài khoản của bạn",
      html,
    });
    return res
      .status(201)
      .json({ message: "Tài khoản được tạo thành công", user: savedUser });
  } catch (error) {
    return res.status(500).json({
      message: "Đã xảy ra lỗi, vui lòng thử lại sau",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!emailValidator(email) || !passwordValidator(password)) {
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không hợp lệ" });
    }
    const existingUser = await User.findOne({ email });
    if (!existingUser)
      return res.status(409).json({ message: "Tài khoản không tồn tại" });

    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Sai mật khẩu" });
    }

    const accessToken = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login thành công",
      token: { accessToken, refreshToken },
      existingUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Đã có lỗi xảy ra, hãy thử lại sau",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!emailValidator(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    const existingUser = await User.findOne({ email });
    if (!existingUser)
      return res.status(409).json({ message: "Tài khoản không tồn tại" });
    const newPassword = crypto.randomBytes(6).toString("hex");
    existingUser.password = newPassword;
    await existingUser.save();
    const html = pug.renderFile(
      path.join(__dirname, "../views", "reset-password.pug"),
      {
        name: existingUser.name,
        newPassword: newPassword,
      }
    );
    await sendEmail({
      to: existingUser.email,
      subject: "Đặt lại mật khẩu",
      html,
    });

    return res
      .status(200)
      .json({ message: "Mật khẩu mới đã được gửi qua email." });
  } catch (error) {
    return res.status(500).json({
      message: "Đã có lỗi xảy ra, hãy thử lại sau",
      error: error.message,
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }
    if (user.isVerified) {
      return res.status(200).json({ message: "Tài khoản đã được xác minh." });
    }
    user.isVerify = true;
    await user.save();
    console.log("Xác minh email thành công");
    return res
      .status(200)
      .json({ message: "Xác minh email thành công! Bạn có thể đăng nhập." });
  } catch (error) {
    console.log("Liên kết xác minh không hợp lệ hoặc đã hết hạn.");
    return res.status(400).json({
      message: "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
      error: error.message,
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!emailValidator(email)) {
      return res.status(400).json({ message: "Email không hợp lệ" });
    }
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }
    if (existingUser.isVerify) {
      return res.status(200).json({ message: "Tài khoản đã được xác minh." });
    }
    const verifyToken = jwt.sign(
      { id: existingUser._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    const html = pug.renderFile(
      path.join(__dirname, "../views", "verify-email.pug"),
      {
        name: existingUser.username,
        verifyUrl: `${process.env.URL_BE}/api/auth/verify-email?token=${verifyToken}`,
      }
    );
    //Gửi email xác thực tài khoản
    await sendEmail({
      to: email,
      subject: "Xác minh tài khoản của bạn",
      html,
    });
    return res.status(200).json({ message: "Email xác minh đã được gửi lại." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyEmail,
  resendVerificationEmail,
};
