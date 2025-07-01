const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { uploadLargeFile } = require("../services/googledrive.services");

const mergeAndUploadChunks = async (req, res) => {
  const { fileId, fileName } = req.body;
  if (!fileId || !fileName) {
    return res.status(400).json({ error: "Missing fileId or fileName" });
  }

  const uploadRoot = path.join(__dirname, "../../uploads", fileId);
  const chunkDir = path.join(uploadRoot, "chunks");
  const mergedPath = path.join(uploadRoot, fileName);

  try {
    const chunkDirExists = await fsp
      .stat(chunkDir)
      .then(() => true)
      .catch(() => false);

    if (!chunkDirExists) {
      return res.status(404).json({ error: "Chunk directory not found" });
    }

    // Đọc danh sách chunk và sắp xếp
    let chunkFiles = await fsp.readdir(chunkDir);
    chunkFiles = chunkFiles.sort((a, b) => {
      const aIndex = parseInt(a.split("_")[1], 10);
      const bIndex = parseInt(b.split("_")[1], 10);
      return aIndex - bIndex;
    });

    // Gộp file từ các chunk
    const writeStream = fs.createWriteStream(mergedPath);
    for (const chunk of chunkFiles) {
      const chunkPath = path.join(chunkDir, chunk);
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on("error", reject);
        readStream.on("end", resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on("finish", resolve));

    const { fileTypeFromFile } = await import("file-type");
    const typeInfo = await fileTypeFromFile(mergedPath);
    const mimeType = typeInfo?.mime || "application/octet-stream";

    // Upload lên Drive
    const result = await uploadLargeFile({
      localPath: mergedPath,
      fileName,
      mimeType,
    });

    // Dọn dẹp
    await fsp.rm(uploadRoot, { recursive: true, force: true });

    return res.json({
      success: true,
      fileUrl: result.url || result,
    });
  } catch (err) {
    console.log("da co loi xay ra", err.message);
    try {
      await fsp.rm(uploadRoot, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("Cleanup failed:", cleanupErr);
    }
    return res
      .status(500)
      .json({ error: "Internal server error during merge/upload" });
  }
};

module.exports = { mergeAndUploadChunks };
