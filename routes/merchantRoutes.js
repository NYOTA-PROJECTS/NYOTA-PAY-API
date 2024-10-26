const express = require("express");
const { verifyToken, isAdmin, isAdminOrMerchant } = require("../middlewares/authMiddleware");
const merchantController = require("../controllers/merchantController");
const upload = require("../utils/merchantMulterConfig");
const picture = require("../utils/merchantPictureMulterConfig");
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

// LISTE DE TOUS LES ADMINS DU MARCHANTS
router.get("/all-merchant-admins", verifyToken, isAdmin, merchantController.allAdminMarchants);

// LISTE DE TOUTES LES CAISSES DU MARCHANTS
router.get("/all-merchant-cashiers", verifyToken, isAdmin, merchantController.merchantCashier);

// LISTE DES CAISSES DU MARCHANT
router.get("/merchant-cashier", verifyToken, isAdmin, merchantController.allCashregister);

// DETAILS DU MARCHANT
router.get("/merchant-details", verifyToken, isAdmin, merchantController.merchantDetails);

// DESTROY
router.delete("/destroy-merchant-admin", verifyToken, isAdmin, merchantController.destroyMerchantAdmin);

// LES UTILISATEURS DU MARCHANT
router.get("/merchant-workers", verifyToken, isAdmin, merchantController.merchantWorkers);

// MISE EN LIGNE DES PHOTOS DU MARCHANT
router.post("/merchant-photo", verifyToken, isAdminOrMerchant, picture.single("photo"), merchantController.merchantPhotos);

module.exports = router