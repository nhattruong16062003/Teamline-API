const pug = require("pug");
const path = require("path");
const jwt = require("jsonwebtoken");
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
    const exitedUser = await User.findOne({ email });
    if (exitedUser)
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

const login = (req, res) => {
  // const { email, password } = req.body;
  // User.findOne({ email })
  //   .then((user) => {
  //     if (!user) {
  //       return res.status(404).json({ message: "User not found" });
  //     }
  //     if (user.password != password) {
  //       return res.status(401).json({ message: "Invalid password" });
  //     }
  //     res.status(200).json({ message: "User logged in successfully", user });
  //   })
  //   .catch((error) => {
  //     console.error("Error finding user:", error);
  //     res.status(500).json({ message: "Error finding user", error });
  //   });
  res.status(200).json({ message: "User logged in successfully", user });
};

const forgotPassword = (req, res) => {};

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
    const exitingUser = await User.findOne({ email });
    if (!exitingUser) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }
    if (exitingUser.isVerify) {
      return res.status(200).json({ message: "Tài khoản đã được xác minh." });
    }
    const verifyToken = jwt.sign(
      { id: exitingUser._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    const html = pug.renderFile(
      path.join(__dirname, "../views", "verify-email.pug"),
      {
        name: exitingUser.username,
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
