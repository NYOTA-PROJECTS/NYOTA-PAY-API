const multer = require("multer");
const path = require("path");

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/merchants/"); // Dossier où les images seront stockées
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Nom du fichier unique
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp|jfif|avif|svg|tiff|tif|bmp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only .png, .jpg and .jpeg .gif .webp .jfif .avif .svg .tiff .tif .bmp format allowed!"));
    }
});

module.exports = upload;
