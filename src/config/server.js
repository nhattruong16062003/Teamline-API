const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");
const app = express();
const http = require("http");
const server = http.createServer(app);
const cookieParser = require("cookie-parser");
const indexRoute = require("../routes/index.routes");
const connectDB = require("../config/db");
const chatSocket = require("../socket/socket");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Cho phép FE từ cổng này
    methods: ["GET", "POST"], // Phương thức HTTP được phép
    credentials: true, // Cho phép gửi cookie nếu cần
  },
});

app.use(express.json());
require("dotenv").config();
app.use(morgan("dev"));

//Cấu hình parser để đọc cookie do client gửi xuống (gửi refreshtoken)
app.use(cookieParser());

//Cấu hình để be có thể nhận dữ liệu formdata (cấu hình nơi lưu file và tên file)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
app.use("/api", upload.any(), indexRoute);

chatSocket(io); // khởi động Socket.IO

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
