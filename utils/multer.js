
const fs = require("fs");
const multer = require("multer");
const path = require("path");

// Create folders if they don't exist
const uploadDirs = ["uploads", "uploads/profilepic", "uploads/postimg"];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define dynamic storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads";

    if (file.fieldname === "avatar") {
      folder = "uploads/profilepic";
    } else if (file.fieldname === "images") {
      folder = "uploads/postimg";
    }

    cb(null, folder);
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${uniqueSuffix}-${base}${ext}`);
  },
});

const upload = multer({ storage });

module.exports=upload;
