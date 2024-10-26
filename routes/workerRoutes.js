const express = require("express");
const workerController = require("../controllers/workerController");
const { verifyToken, isAdmin, isWorker } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, workerController.create);

// DELETE
router.delete("/delete", verifyToken, isAdmin, workerController.destroy);

// UPDATE PASSWORD
router.put("/update-password", verifyToken, isAdmin, workerController.updatePassword);

// DISABLE ACCOUNT
router.put("/disable-account", verifyToken, isAdmin, workerController.disableAccount);

// ACTIVATE ACCOUNT
router.put("/activate-account", verifyToken, isAdmin, workerController.activateAccount);

// GET ALL
router.get("/all", verifyToken, isAdmin, workerController.getAll);

// LOGIN
router.post("/login", workerController.login);

// ALL USER CASHREGISTERS
router.get("/all-cashregisters", verifyToken, isWorker, workerController.getAllCashregisters);

// BALANCE OF CASH REGISTER
router.get("/cashregister-balance", verifyToken, isWorker, workerController.getCashBalance);

// END SESSION
router.post("/end-session", verifyToken, isWorker, workerController.endSession);

// SCAN CUSTOMER
router.post("/scan-customer", verifyToken, isWorker, workerController.scanCustomer);

// GET CUSTOMER DETAILS
router.post("/customer-details", verifyToken, isWorker, workerController.getCustomerInfos);

// HISTORIQUE DES TRANSACTIONS
router.get('/transactions', verifyToken, isWorker,  workerController.getWorkerTransactions);

module.exports = router