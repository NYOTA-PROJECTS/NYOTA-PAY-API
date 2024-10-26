const express = require("express");
const casherController = require("../controllers/casherController");
const { verifyToken, isAdmin, isCashier } = require("../middlewares/authMiddleware");
const router = express.Router();

// CREATE
router.post("/create",  verifyToken, isAdmin, casherController.create);

// LIST
router.get("/all-active", verifyToken, isCashier, casherController.allAciveCasher);

// START SESSION
router.post("/start-session", verifyToken, isCashier, casherController.startSession);

module.exports = router;