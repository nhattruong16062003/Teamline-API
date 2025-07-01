const multer = require("multer");
const path = require("path");
const fs = require("fs");
const createError = require("http-errors");

//Lưu vào ổ cứng, multer đã dùng stream để đọc file và ghi file vào ổ cứng rồi.
//Đây là đoạn code dùng để cấu hình nơi lưu trữ và tên file lưu trữ cho mỗi chunk
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const { fileId } = req.query;
    if (!fileId) return callback(createError(400, "Thiếu fileId"), null); //không cần gọi next(err) vì callback tự gọi
    const uploadPath = path.join(__dirname, `../../uploads/${fileId}/chunks`);
    fs.mkdirSync(uploadPath, { recursive: true });
    callback(null, uploadPath); //Xác nhận thành công
  },
  filename: (req, file, callback) => {
    const { chunkIndex } = req.query;
    if (chunkIndex === undefined)
      return callback(createError(400, "Thiếu chunkIndex"), null); //không cần gọi next(err) vì callback tự gọi
    callback(null, `chunk_${chunkIndex}`); //Xác nhận thành công
  },
});

const chunkUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max mỗi chunk là 5MB
});

module.exports = chunkUpload;

//middleware sẽ có nguy cơ lỗi và tồn tại chunk đã lưu trước đó
//-Ổ đĩa đầy hoặc không đủ quyền ghi
