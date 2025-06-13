const User = require("../models/User");

const updateUserInfo = async (req, res) => {
  //lay thong tin username, image, voi mat khau
};

const changePassword = async (req, res) => {};

const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }
    return res.status(200).json({ message: "Thông tin user", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Đã có lỗi xảy ra", error: error.message });
  }
};

module.exports = {
  updateUserInfo,
  changePassword,
  getUserByEmail,
};
