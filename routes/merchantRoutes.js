const express = require("express");
const { verifyToken, isAdmin, isAdminOrMerchant } = require("../middlewares/authMiddleware");
const merchantController = require("../controllers/merchantController");
const upload = require("../utils/merchantMulterConfig");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, upload.single("photo"), merchantController.create);

// UPDATE PHOTO
router.put("/update-photo", verifyToken, isAdminOrMerchant, upload.single("photo"), merchantController.updatePhoto);

// GET ALL INFOS
router.get("/all-details", verifyToken, isAdminOrMerchant, merchantController.getAllInfos);

// CREATION ADMIN MERCHANT
router.post("/create-admin", verifyToken, isAdmin, merchantController.createAdmin);

module.exports = router