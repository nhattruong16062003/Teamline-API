const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Poll = require("../models/Poll");
const register = (req, res) => {
  // const { username, password, email } = req.body;
  // const newUser = new User({
  //   username,
  //   password,
  //   email,
  // });
  // newUser.save()
  //   .then((user) => {
  //     res.status(201).json({ message: "User registered successfully", user });
  //   })
  //   .catch((error) => {
  //     console.error("Error creating user:", error);
  //     res.status(500).json({ message: "Error creating user", error });
  //   });
  res.status(201).json({ message: "User registered successfully", user });

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

module.exports = {
  register,
  login,
};
