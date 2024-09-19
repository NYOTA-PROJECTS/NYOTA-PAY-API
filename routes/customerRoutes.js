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

// UPDATE PROFILE PHOTO
router.put("/update-photo", verifyToken, isCustomer, upload.single("photo"), customerController.updatePhoto);

// BALANCE
router.get("/balance", verifyToken, isCustomer, customerController.balance);

module.exports = router;