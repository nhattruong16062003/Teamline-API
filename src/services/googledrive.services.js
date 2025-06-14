const { google } = require("googleapis");
const stream = require("stream");
require("dotenv").config(); // Đảm bảo đã dùng dotenv

const auth = new google.auth.GoogleAuth({
  keyFile: "teamline-462903-bca6f824cc99.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

/**
 * Upload buffer lên Google Drive vào folder có sẵn
 * Trả về link công khai để dùng cho frontend
 */
async function uploadImageBuffer({
  buffer,
  fileName,
  mimeType,
  folderId = process.env.IMAGES_FOLDER_ID,
}) {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: "id, name",
  });

  const fileId = uploadRes.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  //   return `https://drive.google.com/uc?id=${fileId}&export=download`;
  return `https://drive.google.com/thumbnail?id=${fileId}`;
  //   return `https://drive.google.com/uc?id=${fileId}&export=media`;
}

async function deleteImageFromDrive(fileId) {
  try {
    await drive.files.delete({ fileId });
    console.log(`Đã xóa ảnh: ${fileId}`);
    return true;
  } catch (error) {
    console.error(`Lỗi khi xóa ảnh ${fileId}:`, error.message);
    return false;
  }
}

function getFileIdFromDriveUrl(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsedUrl = new URL(url);
    const fileId = parsedUrl.searchParams.get("id");

    return fileId || null;
  } catch (e) {
    console.error("Invalid URL:", e.message);
    return null;
  }
}

module.exports = {
  uploadImageBuffer,
  deleteImageFromDrive,
  getFileIdFromDriveUrl,
};
