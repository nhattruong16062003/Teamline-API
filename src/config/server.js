const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const indexRoute = require("../routes/index.routes");
const connectDB = require("../config/db");
const app = express();

app.use(express.json());
require("dotenv").config();
app.use(morgan("dev"));

//Cấu hình parser để đọc cookie do client gửi xuống (gửi refreshtoken)
app.use(cookieParser());

//Cấu hình cros để be có thể nhận request từ fe
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Các phương thức HTTP được phép
    allowedHeaders: ["Content-Type", "Authorization"], // Các header được phép
    credentials: true, // Cho phép gửi cookie
  })
);

//Thiết lập Pug làm template engine
app.set("view engine", "pug");
app.set("views", "./views");

connectDB();
app.use("/api", indexRoute);

module.exports = app;
