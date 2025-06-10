const pug = require("pug");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Poll = require("../models/Poll");
const { emailValidator, passwordValidator } = require("../helpers/validation");
const sendEmail = require("../services/emailSender");
const generateValidPassword = require("../helpers/passwordGenerator");
const {
  prepareSendVerificationEmail,
} = require("../helpers/verificationEmail");

const register = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { username, password, email } = req.body;
    session.startTransaction();
    //Check dữ liệu đầu vào của email và password
    if (!emailValidator(email) || !passwordValidator(password)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Email hoặc mật khẩu không hợp lệ" });
    }
    //Check xem user đã tồn tại chưa?
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "email đã được sử dụng" });

    //check them tai khoan duoc tao nhưng chưa được kích hoạt

    //Tạo mới user với dữ liệu đầu vào
    const newUser = new User({
      username,
      password,
      email,
    });
    const savedUser = await newUser.save({ session });

    await prepareSendVerificationEmail(req, res, savedUser);
    await session.commitTransaction();
    session.endSession();
    return res
      .status(201)
      .json({ message: "Tài khoản được tạo thành công", user: savedUser });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
    if (!existingUser.isVerify)
      return res
        .status(403)
        .json({ message: "Tài khoản của bạn chưa được kích hoạt" });
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
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
    // Gửi access token trong cookie HttpOnly
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true nếu deploy production
      sameSite: "strict", // hoặc 'lax' tùy app
      maxAge: 15 * 60 * 1000, // 15 phút
    });
    // Set refreshToken trong  cookie HttpOnly
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // JS không truy cập được
      secure: process.env.NODE_ENV === "production", // chỉ gửi cookie qua HTTPS khi deploy
      sameSite: "Strict", // chống CSRF (nếu frontend khác domain có thể dùng "Lax")
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    return res.status(200).json({
      message: "Login thành công",
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
    const newPassword = generateValidPassword();
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
    await prepareSendVerificationEmail(req, res, existingUser);
    return res.status(200).json({ message: "Email xác minh đã được gửi lại." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Không có refresh token" });
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res
          .status(403)
          .json({ message: "Refresh token không hợp lệ hoặc đã hết hạn" });
      }

      // Tao accesstoken moi
      const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
        expiresIn: "15m",
      });

      // Tao refresh token moi
      const newRefreshToken = jwt.sign(
        { id: decoded.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ accessToken });
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    return res.status(200).json({ user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    console.log("da vao day");
    // Xóa cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    return res.status(200).json({ message: "Logout thành công" });
  } catch (error) {
    console.error("Lỗi khi logout:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra khi logout" });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyEmail,
  resendVerificationEmail,
  refreshToken,
  getCurrentUser,
  logout,
};
