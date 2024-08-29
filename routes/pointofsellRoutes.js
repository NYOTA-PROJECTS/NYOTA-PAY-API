const express = require("express");
const pointofsellController = require("../controllers/pointofsellController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// LIST
router.get("/list", verifyToken, isAdmin, pointofsellController.list);

module.exports = router