const express = require("express");
const pointofsellController = require("../controllers/pointofsellController");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create", verifyToken, isAdmin, pointofsellController.create);

// LIST
router.get("/list", verifyToken, isAdmin, pointofsellController.list);

// DELETE
router.delete("/delete", verifyToken, isAdmin, pointofsellController.destroy);

module.exports = router