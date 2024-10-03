const express = require("express");
const customerController = require("../controllers/customerController");
const { verifyToken, isCustomer } = require("../middlewares/authMiddleware");
const upload = require("../utils/customerMulterConfig");
const router = express.Router();

// LOGIN
router.post("/login", customerController.login);

// CREATE
router.post("/create", customerController.create);

// UPDATE PASSWORD
router.put("/update-password", verifyToken, isCustomer, customerController.updatePassword);

// UPDATE NAME
router.put("/update-name", verifyToken, isCustomer, customerController.updateName);

// UPDATE PROFILE PHOTO
router.put("/update-photo", verifyToken, isCustomer, upload.single("photo"), customerController.updatePhoto);

// BALANCE
router.get("/balance", verifyToken, isCustomer, customerController.balance);

// UPDATE TOKEN NOTIFICATION
router.put("/update-token", verifyToken, isCustomer, customerController.updateToken);

// HISTORIQUE DES TRANSACTIONS
router.get('/transactions', verifyToken, isCustomer,  customerController.getCustomerTransactions);

// SUPPRIMER LE COMPTE
router.delete("/delete-account", verifyToken, isCustomer, customerController.destroy);

// DESACTIVER LE COMPTE
router.post("/destroy-account", customerController.deleteAccount);

// LISTE DES MARCHANTS
router.get("/all-merchants", verifyToken, isCustomer, customerController.getMerchants);

module.exports = router;