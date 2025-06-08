const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  avatar: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  cloudStorage: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

