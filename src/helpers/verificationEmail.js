const pug = require("pug");
const path = require("path");
const jwt = require("jsonwebtoken");
const sendEmail = require("../services/emailSender");

const prepareSendVerificationEmail = async (req, res, user) => {
  try {
    const verifyToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const html = pug.renderFile(
      path.join(__dirname, "../views", "verify-email.pug"),
      {
        name: user.username,
        verifyUrl: `${process.env.URL_BE}/api/auth/verify-email?token=${verifyToken}`,
      }
    );
    //Gửi email xác thực tài khoản
    await sendEmail({
      to: user.email,
      subject: "Xác minh tài khoản của bạn",
      html,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

module.exports = {
  prepareSendVerificationEmail,
};
