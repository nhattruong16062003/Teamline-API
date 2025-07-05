const { google } = require("googleapis");
const stream = require("stream");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

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

async function deleteFileFromDrive(fileId) {
  try {
    await drive.files.delete({ fileId });
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

//viết hàm upload file lớn (video, file tài liệu)
async function uploadLargeFile({
  localPath,
  fileName,
  mimeType,
  folderId = process.env.FILES_FOLDER_ID, // Có thể dùng cùng IMAGES_FOLDER_ID nếu bạn không tách riêng
}) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(localPath);

    drive.files.create(
      {
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fileStream,
        },
        fields: "id, name",
      },
      async (err, fileRes) => {
        if (err) {
          return reject(err);
        }

        const fileId = fileRes.data.id;

        try {
          await drive.permissions.create({
            fileId,
            requestBody: {
              role: "reader",
              type: "anyone",
            },
          });

          const publicUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
          resolve({ id: fileId, url: publicUrl });
        } catch (permErr) {
          const deleted = await deleteFileFromDrive(fileId);
          reject(permErr);
        }
      }
    );
  });
}

module.exports = {
  uploadImageBuffer,
  deleteFileFromDrive,
  getFileIdFromDriveUrl,
  uploadLargeFile,
};
