const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 900 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      return callback(new Error("Yalnizca png, jpg veya webp yuklenebilir."));
    }
    return callback(null, true);
  },
});

module.exports = upload;
