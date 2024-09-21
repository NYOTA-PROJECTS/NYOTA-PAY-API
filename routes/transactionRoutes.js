const express = require("express");
const transactionController = require("../controllers/transactionController");
const { verifyToken, isWorker } = require("../middlewares/authMiddleware");
const router = express.Router();

// RENDU MONAIS
router.post("/render-money", verifyToken, isWorker, transactionController.renderMonais);

// RECEIVE MONAIS
router.post("/receive-money", verifyToken, isWorker, transactionController.receiveMonais);

// UPDATE TRANSACTION AMOUNT
router.put("/update-amount", verifyToken, isWorker, transactionController.updateTransactionAmount);

module.exports = router;