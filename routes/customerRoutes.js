const express = require("express");
const customerController = require("../controllers/customerController");
const { verifyToken, isCustomer } = require("../middlewares/authMiddleware");
const router = express.Router();

// LOGIN
router.post("/login", customerController.login);

module.exports = router;