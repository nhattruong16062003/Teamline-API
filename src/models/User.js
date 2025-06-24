const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    cloudStorage: [{ type: String }],
    isVerify: { type: Boolean, default: false },
  },
  { timestamps: true }
);

//Thiết lập xóa các chat của người dùng này nếu người dùng này bị xóa

// Mã hóa mật khẩu khi tạo hoặc gọi user.save()
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Mã hóa mật khẩu khi cập nhật bằng findOneAndUpdate
userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  try {
    // Trường hợp dùng $set hoặc cập nhật trực tiếp
    const plainPassword =
      update.password || (update.$set && update.$set.password);

    if (plainPassword) {
      const saltRounds = 10;
      const hashed = await bcrypt.hash(plainPassword, saltRounds);

      // Cập nhật lại đúng chỗ
      if (update.password) {
        update.password = hashed;
      } else if (update.$set && update.$set.password) {
        update.$set.password = hashed;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

//Thiết lập tự động xóa các notification khi user bị xóa, sử dụng post thay vì
//pre vì đôi lúc mình sẽ dùng findOneAndDelete thay vì dùng remove
userSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      await Notification.deleteMany({ receiver: doc._id });
      console.log(`All notifications for user ${doc._id} have been deleted.`);
    } catch (err) {
      console.error("Error deleting notifications for deleted user:", err);
    }
  }
});
//THiết lập tự động xóa các notification khi user bị xóa, nếu sử dụng remove
userSchema.pre("remove", async function (next) {
  try {
    await Notification.deleteMany({ receiver: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
