const express = require("express");
const { verifyToken, isAdmin, isAdminOrMerchant } = require("../middlewares/authMiddleware");
const merchantController = require("../controllers/merchantController");
const upload = require("../utils/merchantMulterConfig");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, upload.fields([{ name: "photo" }, { name: "cover" }]), merchantController.create);

// UPDATE PHOTO 
router.put("/update-photo", verifyToken, isAdminOrMerchant, upload.single("photo"), merchantController.updatePhoto);

// UPDATE COVER
router.put("/update-cover", verifyToken, isAdminOrMerchant, upload.single("cover"), merchantController.updateCover);

// GET ALL INFOS
router.get("/all-details", verifyToken, isAdminOrMerchant, merchantController.getAllInfos);

// CREATION ADMIN MERCHANT
router.post("/create-admin", verifyToken, isAdmin, merchantController.createAdmin);

// RECHARGER LE SOLDE DU MARCHANT
router.put("/recharge", verifyToken, isAdminOrMerchant, merchantController.recharge);

// SOMME DE LA SOLDE DES MARCHANTS
router.get("/all-balance", verifyToken, isAdminOrMerchant, merchantController.balanceAllMerchants);

// LISTE DE TOUS LES MARCHANTS
router.get("/all-merchants", verifyToken, isAdmin, merchantController.allMerchant);

module.exports = router