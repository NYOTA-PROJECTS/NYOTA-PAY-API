const express = require("express");
const cashregisterController = require("../controllers/cashregisterController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, cashregisterController.create);

module.exports = router;