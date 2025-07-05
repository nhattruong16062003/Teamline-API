const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { uploadLargeFile } = require("../services/googledrive.services");

const getMetaPath = (fileId) =>
  path.join(__dirname, `../../uploads/${fileId}/meta.json`);

const loadMeta = async (fileId) => {
  try {
    const metaPath = getMetaPath(fileId);
    const data = await fsp.readFile(metaPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      uploadedChunks: [],
      mergedChunks: [],
      merged: false,
    };
  }
};

const saveMeta = async (fileId, meta) => {
  const metaPath = getMetaPath(fileId);
  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));
};

const markChunkUploaded = async (fileId, chunkIndex) => {
  const meta = await loadMeta(fileId);
  meta.uploadedChunks.push(chunkIndex);
  meta.uploadedChunks.sort((a, b) => a - b); // Giữ thứ tự tăng dần
  await saveMeta(fileId, meta);
};

// GET /upload/status/:fileId
const getUploadedChunks = async (req, res) => {
  const { fileId } = req.params;
  const meta = await loadMeta(fileId);
  res.json({
    uploadedChunks: meta.uploadedChunks,
    mergedChunks: meta.mergedChunks,
    merged: meta.merged,
  });
};

//POST /upload/chunk
const handleChunkUploaded = async (req, res) => {
  const { fileId, chunkIndex } = req.query;
  try {
    await markChunkUploaded(fileId, parseInt(chunkIndex, 10));
    return res.json({ success: true });
  } catch (err) {
    console.error("Lỗi ghi metadata chunk:", err);
    return res.status(500).json({ error: "Không thể lưu trạng thái chunk" });
  }
};

// POST /upload/merge
const mergeAndUploadChunks = async (req, res) => {
  const { fileId, fileName } = req.body;
  if (!fileId || !fileName) {
    return res.status(400).json({ error: "Missing fileId or fileName" });
  }

  const uploadRoot = path.join(__dirname, "../../uploads", fileId);
  const chunkDir = path.join(uploadRoot, "chunks");
  const mergedPath = path.join(uploadRoot, fileName);
  const meta = await loadMeta(fileId);

  try {
    const chunkDirExists = await fsp
      .stat(chunkDir)
      .then(() => true)
      .catch(() => false);
    if (!chunkDirExists) {
      return res.status(404).json({ error: "Chunk directory not found" });
    }

    let chunkFiles = await fsp.readdir(chunkDir);
    chunkFiles = chunkFiles
      .filter((name) => name.startsWith("chunk_"))
      .sort((a, b) => {
        const aIndex = parseInt(a.split("_")[1], 10);
        const bIndex = parseInt(b.split("_")[1], 10);
        return aIndex - bIndex;
      });

    const writeStream = fs.createWriteStream(mergedPath, { flags: "a" });

    for (const chunk of chunkFiles) {
      const chunkIndex = parseInt(chunk.split("_")[1], 10);
      if (meta.mergedChunks.includes(chunkIndex)) continue;

      const chunkPath = path.join(chunkDir, chunk);
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on("error", reject);
        readStream.on("end", resolve);
        readStream.pipe(writeStream, { end: false });
      });

      meta.mergedChunks.push(chunkIndex);
      await saveMeta(fileId, meta);
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on("finish", resolve));

    const { fileTypeFromFile } = await import("file-type");
    const typeInfo = await fileTypeFromFile(mergedPath);
    const mimeType = typeInfo?.mime || "application/octet-stream";

    meta.merged = true;
    await saveMeta(fileId, meta);

    const result = await uploadLargeFile({
      localPath: mergedPath,
      fileName,
      mimeType,
    });

    // Dọn dẹp nếu muốn
    await fsp.rm(uploadRoot, { recursive: true, force: true });

    return res.json({
      success: true,
      fileUrl: result.url || result,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Internal server error during merge/upload" });
  }
};

// DELETE /upload/:fileId
const clearUploadData = async (req, res) => {
  const { fileId } = req.params;
  const uploadRoot = path.join(__dirname, "../../uploads", fileId);

  try {
    const exists = await fsp
      .stat(uploadRoot)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return res.status(404).json({ error: "Folder không tồn tại" });
    }

    await fsp.rm(uploadRoot, { recursive: true, force: true });
    return res.json({ success: true, message: "Đã xoá folder upload" });
  } catch (err) {
    console.error("Lỗi xoá folder:", err);
    return res.status(500).json({ error: "Không thể xoá folder upload" });
  }
};

module.exports = {
  getUploadedChunks,
  mergeAndUploadChunks,
  handleChunkUploaded,
  clearUploadData,
};
