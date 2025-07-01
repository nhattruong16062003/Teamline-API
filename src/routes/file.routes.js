const express = require("express");
const router = express.Router();
const chunkUpload = require("../middleware/chunkUpload.middleware");
const { mergeAndUploadChunks } = require("../controllers/file.controllers");

router.post("/upload/chunk", chunkUpload.single("chunk"), (req, res) => {
  res.status(200).json({ success: true });
});

router.post("/upload/complete", mergeAndUploadChunks);

module.exports = router;
