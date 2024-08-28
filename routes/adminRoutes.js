const express = require("express");
const { body, validationResult } = require("express-validator");
const adminController = require("../controllers/adminController");
const router = express.Router();

// Middleware de validation
const validateLogin = [
  body("email").isEmail().withMessage("L'adresse email doit être valide."),
  body("password").notEmpty().withMessage("Le mot de passe est requis."),
];
// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

// LOGIN
router.post("/login", validateLogin, handleValidationErrors, adminController.login);

module.exports = router;
