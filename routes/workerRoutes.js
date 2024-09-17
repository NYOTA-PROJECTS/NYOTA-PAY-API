const express = require("express");
const workerController = require("../controllers/workerController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
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

module.exports = router