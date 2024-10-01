const express = require("express");
const cashregisterController = require("../controllers/cashregisterController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, cashregisterController.create);

// DELETE
router.delete("/delete", verifyToken, isAdmin, cashregisterController.destroy);

// RECHARGER LE SOLDE DE LA CAISSE
router.put("/recharge", verifyToken, isAdmin, cashregisterController.recharge);

// TRANSFERER LE SOLDE DE LA CAISSE
router.put("/transfer", verifyToken, isAdmin, cashregisterController.transferAmount);

module.exports = router;