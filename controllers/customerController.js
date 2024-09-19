const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { Customer, CustomerBalance } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de portable est requis.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    const customer = await Customer.findOne({
      where: { phone },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "phone",
        "photo",
        "thumbnail",
        "qrcode",
        "password",
      ],
      include: [
        {
          model: CustomerBalance,
          attributes: ["id", "amount"],
        },
      ],
    });

    if (!customer) {
      return res.status(409).json({
        status: "error",
        message: "Compte non enregistrée ou incorrecte. Veuillez réessayer.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Mot de passe invalide ou incorrect. Veuillez réessayer.",
      });
    }

    const token = jwt.sign(
      {
        id: customer.id,
        role: "isCustomer",
      },
      process.env.JWT_SECRET
    );

    const customerResponse = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      photo: customer.photo,
      thumbnail: customer.thumbnail,
      qrcode: customer.qrcode,
      balance: customer.CustomerBalance.amount,
      token: token,
    };

    return res.status(200).json({
      status: "success",
      data: customerResponse,
    });
  } catch (error) {
    console.error(`ERROR LOGIN CUSTOMER: ${error}`);
    appendErrorLog(`ERROR LOGIN CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la connexion.",
    });
  }
};

const create = async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;

    if (!firstName) {
      return res.status(400).json({
        status: "error",
        message: "Le nom est requis.",
      });
    }

    if (!lastName) {
      return res.status(400).json({
        status: "error",
        message: "Le prénom est requis.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de portable est requis.",
      });
    }

    const congoPhoneRegex = /^(04|05|06)\d{7}$/;

    if (!congoPhoneRegex.test(phone)) {
      return res.status(400).json({
        status: "error",
        message:
          "Le numéro de téléphone doit être un numéro valide du Congo-Brazzaville.",
      });
    }

    const customer = await Customer.findOne({ where: { phone } });
    if (customer) {
      return res.status(409).json({
        status: "error",
        message:
          "Un compte avec ce numéro de portable existe déjà, veuillez vous connecter pour continuer.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    const newCustomer = await Customer.create({
      firstName,
      lastName,
      phone,
      isMobile: true,
      qrcode: uuid,
      password: hashedPassword,
    });

    await CustomerBalance.create({
      customerId: newCustomer.id,
      balance: 0,
    });

    const token = jwt.sign(
      {
        id: newCustomer.id,
        role: "isCustomer",
      },
      process.env.JWT_SECRET
    );

    const customerResponse = {
      firstName: newCustomer.firstName,
      lastName: newCustomer.lastName,
      phone: newCustomer.phone,
      qrcode: newCustomer.qrcode,
      token: token,
    };

    return res.status(200).json({
      status: "success",
      data: customerResponse,
    });
  } catch (error) {
    console.error(`ERROR CREATE CUSTOMER: ${error}`);
    appendErrorLog(`ERROR CREATE CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la creation du compte.",
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { oldPassword, newPassword } = req.body;

    // Récupérer le worker et vérifier s'il existe
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const customToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(customToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ status: "error", message: "TokenExpiredError" });
      }
      return res
        .status(401)
        .json({ status: "error", message: "Token invalide." });
    }

    const customerId = decodedToken.id;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message:
          "Compte non trouvé. Veuillez réessayer ou en créer un nouveau.",
      });
    }

    if (!oldPassword) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe actuel est requis.",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Le nouveau mot de passe est requis.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      customer.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Mot de passe invalide ou incorrect. Veuillez réessayer.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await customer.update({ password: hashedPassword });
    return res.status(200).json({
      status: "success",
      message: "Mot de passe mis à jour avec succes.",
    });
  } catch (error) {
    console.error(`ERROR UPDATE PASSWORD CUSTOMER: ${error}`);
    appendErrorLog(`ERROR UPDATE PASSWORD CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la mise à jour du mot de passe.",
    });
  }
};

const updatePhoto = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const host = req.get("host");
    const photo = req.file;
    // Récupérer le worker et vérifier s'il existe
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const customToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(customToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ status: "error", message: "TokenExpiredError" });
      }
      return res
        .status(401)
        .json({ status: "error", message: "Token invalide." });
    }

    const customerId = decodedToken.id;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message:
          "Compte non trouvé. Veuillez réessayer ou en créer un nouveau.",
      });
    }

    if (!photo) {
      return res.status(400).json({
        status: "error",
        message: "La photo est requise.",
      });
    }

    // Générez et enregistrez l'image et le thumbnail
    const imagePath = `customers/${photo.filename}`;
    const imageUrl = `${req.protocol}://${host}/${imagePath}`;
    const thumbnailFilename = `thumb_${photo.filename}`;
    const thumbnailPath = `customers/${thumbnailFilename}`;
    const thumbnailUrl = `${req.protocol}://${host}/${thumbnailPath}`;

    // Créer le thumbnail avec sharp
    await sharp(photo.path)
      .resize(200, 200) // Taille du thumbnail
      .toFile(path.join(__dirname, `../public/${thumbnailPath}`));

    // Mettre à jour le profil avec l'image et le thumbnail
    await customer.update(
      { photo: imageUrl, thumbnail: thumbnailUrl }, // Enregistre l'URL de la photo et du thumbnail
      { where: { id: customerId } }
    );

    await customer.update({ photo: imageUrl }, { where: { id: customerId } });
    return res.status(200).json({
      status: "success",
      message: "Votre photo de profil a éte mise à jour avec succes.",
    });
  } catch (error) {
    console.error(`ERROR UPDATE PHOTO CUSTOMER: ${error}`);
    appendErrorLog(`ERROR UPDATE PHOTO CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la mise à jour de la photo.",
    });
  }
};

const balance = async (req, res) => {
  try {
    const token = req.headers.authorization;
    // Récupérer le worker et vérifier s'il existe
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const customToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(customToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ status: "error", message: "TokenExpiredError" });
      }
      return res
        .status(401)
        .json({ status: "error", message: "Token invalide." });
    }

    const customerId = decodedToken.id;
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message:
          "Compte non trouvé. Veuillez réessayer ou en création un nouveau.",
      });
    }
    const balance = await CustomerBalance.findOne({
      where: { customerId: customerId },
    });
    if (!balance) {
      return res.status(404).json({
        status: "error",
        message: "Solde non défini. Veuillez en creer un compte actif.",
      });
    }
    return res.status(200).json({
      status: "success",
      data: balance.amount,
    });
  } catch (error) {
    console.error(`ERROR BALANCE CUSTOMER: ${error}`);
    appendErrorLog(`ERROR BALANCE CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la recuperation du solde.",
    });
  }
};

module.exports = { login, create, updatePassword, updatePhoto, balance };
