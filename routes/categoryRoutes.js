const express = require("express");
const categoryController = require("../controllers/categoryController");
const router = express.Router();

// CREATE
router.post("/create", categoryController.create);

// GET ALL
router.get("/all", categoryController.getAll);

module.exports = router;