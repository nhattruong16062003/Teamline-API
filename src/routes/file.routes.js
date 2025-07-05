const express = require("express");
const router = express.Router();
const chunkUpload = require("../middleware/chunkUpload.middleware");
const {
  mergeAndUploadChunks,
  getUploadedChunks,
  handleChunkUploaded,
  clearUploadData,
} = require("../controllers/file.controllers");

router.get("/upload/status/:fileId", getUploadedChunks);
router.post("/upload/chunk", chunkUpload.single("chunk"), handleChunkUploaded);
router.post("/upload/complete", mergeAndUploadChunks);
router.delete("/upload/:fileId", clearUploadData);

module.exports = router;
