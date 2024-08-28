const express = require("express");
const categoryController = require("../controllers/categoryController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, categoryController.create);

// GET ALL
router.get("/all", verifyToken, isAdmin, categoryController.getAll);

module.exports = router;