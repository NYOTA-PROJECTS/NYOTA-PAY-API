const express = require("express");
const casherController = require("../controllers/casherController");
const router = express.Router();

// CREATE
router.post("/create", casherController.create);

// LIST
router.get("/all-active", casherController.allAciveCasher);

module.exports = router;