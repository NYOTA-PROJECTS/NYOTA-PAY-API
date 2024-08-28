const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Admin } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "L'email est requis.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(409).json({
        status: "error",
        message:
          "Adresse email non enregistrée ou incorrecte. Veuillez réessayer.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Mot de passe invalide ou incorrect. Veuillez réessayer.",
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        role: "isAdmin",
      },
      process.env.JWT_SECRET
    );

    const adminResponse = {
      email: admin.email,
      photo: admin.photo,
      token: token,
    };

    return res.status(200).json({
      status: "success",
      data: adminResponse,
    });
  } catch (error) {
    console.error(`ERROR LOGIN: ${error}`);
    appendErrorLog(`ERROR LOGIN: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la connexion.",
    });
  }
};

module.exports = { login };