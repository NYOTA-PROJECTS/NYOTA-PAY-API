const express = require("express");
const cashregisterController = require("../controllers/cashregisterController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, cashregisterController.create);

// DELETE
router.delete("/delete", verifyToken, isAdmin, cashregisterController.destroy);

module.exports = router;