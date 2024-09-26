const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const sharp = require("sharp");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const {
  Customer,
  CustomerBalance,
  Transaction,
  Merchant,
} = require("../models");
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
        "isMobile",
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

    if (customer.isMobile === false) {
      return res.status(401).json({
        status: "error",
        message:
          "Ce compte n'existe pas encore sur l'application. Nous vous invitons à créer un compte pour accéder aux services.",
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

    // Vérifications des données d'entrée
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

    // Recherche du client par son numéro de téléphone
    const customer = await Customer.findOne({ where: { phone } });

    // Si le client existe et que isMobile est à true, retournez une erreur
    if (customer && customer.isMobile === true) {
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

    let newCustomer;

    // Si le client existe mais isMobile est à false, on met à jour son compte
    if (customer && customer.isMobile === false) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const uuid = uuidv4();

      // Mise à jour des informations du client
      await Customer.update(
        {
          firstName,
          lastName,
          phone,
          isMobile: true,
          qrcode: uuid,
          password: hashedPassword,
        },
        {
          where: { id: customer.id },
        }
      );

      // Récupération des nouvelles informations après mise à jour
      newCustomer = await Customer.findOne({ where: { id: customer.id } });
    } else {
      // Si le client n'existe pas, on crée un nouveau client
      const hashedPassword = await bcrypt.hash(password, 10);
      const uuid = uuidv4();

      newCustomer = await Customer.create({
        firstName,
        lastName,
        phone,
        isMobile: true,
        qrcode: uuid,
        password: hashedPassword,
      });

      // Créer le solde initial du client
      await CustomerBalance.create({
        customerId: newCustomer.id,
        balance: 0,
      });
    }

    // Génération du token JWT pour authentifier le client
    const token = jwt.sign(
      {
        id: newCustomer.id,
        role: "isCustomer",
      },
      process.env.JWT_SECRET
    );

    // Préparation de la réponse client avec les informations nécessaires
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
      message: "Une erreur s'est produite lors de la création du compte.",
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
        message:
          "Mot de passe invalide ou ne corresponde pas. Veuillez réessayer.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await customer.update({ password: hashedPassword });
    return res.status(200).json({
      status: "success",
      message: "Votre mot de passe à été mis à jour avec succes.",
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

    await customer.update(
      { thumbnail: thumbnailUrl },
      { where: { id: customerId } }
    );

    const url = {
      photo: imageUrl,
      thumbnail: thumbnailUrl,
    };

    return res.status(200).json({
      status: "success",
      message: "Votre photo de profil a éte mise à jour avec succes.",
      data: url,
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

const updateToken = async (req, res) => {
  try {
    const tokenHeader = req.headers.authorization;
    const { token } = req.body;
    if (!tokenHeader) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!tokenHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const customToken = tokenHeader.substring(7);
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
    const existingCustomer = await Customer.findByPk(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        status: "error",
        message: "Ce compte n'existe pas.",
      });
    }

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Veuillez fournir un token.",
      });
    }

    await Customer.update(
      { token },
      {
        where: { id: customerId },
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Le token a été mis à jour avec succès.",
    });
  } catch (error) {
    console.error(`ERROR UPDATE CUSTOMER TOKEN: ${error}`);
    appendErrorLog(`ERROR UPDATE CUSTOMER TOKEN: ${error.message}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la mise à jours du mot de passe.",
    });
  }
};

const updateName = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { firstName, lastName } = req.body;

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

    if (!firstName) {
      return res.status(400).json({
        status: "error",
        message: "Le prénom actuel est requis.",
      });
    }

    if (!lastName) {
      return res.status(400).json({
        status: "error",
        message: "Le nom est requis.",
      });
    }

    await customer.update({ firstName, lastName });
    return res.status(200).json({
      status: "success",
      message: "Votre mot de passe à été mis à jour avec succes.",
      data: { firstName, lastName },
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

const getCustomerTransactions = async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token non fourni.",
      });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const workerToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(workerToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Token invalide ou expiré.",
      });
    }

    const customerId = decodedToken.id;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message:
          "Compte non trouvé. Veuillez réessayer ou en créant un nouveau.",
      });
    }

    const transactions = await Transaction.findAll({
      where: { customerId },
      include: [
        {
          model: Merchant,
          attributes: ["name", "photo"],
        },
      ],
      attributes: ["amount", "createdAt", "type"],
      order: [["createdAt", "DESC"]],
    });

    const response = transactions.map((transaction) => {
      const merchant = transaction.Merchant;

      // Formater la date selon l'image (ex: "Aujourd'hui", "Hier" ou format complet)
      const createdAt = moment(transaction.createdAt);
      const now = moment();

      let formattedDate;
      if (createdAt.isSame(now, "day")) {
        formattedDate = `Aujourd'hui, ${createdAt.format("HH:mm")}`;
      } else if (createdAt.isSame(now.subtract(1, "days"), "day")) {
        formattedDate = `Hier, ${createdAt.format("HH:mm")}`;
      } else {
        formattedDate = createdAt.format("DD MMM YYYY, HH:mm"); // Exemple: "16 juin 2024, 16:11"
      }

      // Déterminer le signe du montant en fonction du type de transaction
      let formattedAmount = transaction.amount;
      if (transaction.type === "SEND") {
        formattedAmount = `+${transaction.amount}`;
      } else if (transaction.type === "COLLECT") {
        formattedAmount = `-${transaction.amount}`;
      }

      return {
        name: merchant.name,
        photo: merchant.photo,
        amount: formattedAmount,
        date: formattedDate,
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Transactions réussies.",
      data: response,
    });
  } catch (error) {
    console.error(`ERROR GET CUSTOMER TRANSACTIONS: ${error}`);
    appendErrorLog(`ERROR GET CUSTOMER TRANSACTIONS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recuperation des transactions.",
    });
  }
};

const destroy = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Token non fourni.",
      });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const workerToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(workerToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Token invalide ou expiré.",
      });
    }

    const customerId = decodedToken.id;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        status: "error",
        message:
          "Compte non trouvé. Veuillez réessayer ou en créant un nouveau.",
      });
    }

    const newPhone = `DELETED_${customer.phone}`;

    await Customer.update(
      {
        phone: newPhone,
      },
      {
        where: {
          id: customerId,
        },
      }
    );
    return res.status(200).json({
      status: "success",
      message: "Compte supprimé.",
    });
  } catch (error) {
    console.error(`ERROR DELETE CUSTOMER: ${error}`);
    appendErrorLog(`ERROR DELETE CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la suppression du compte.",
    });
  }
};

module.exports = {
  login,
  create,
  updatePassword,
  updatePhoto,
  balance,
  updateToken,
  updateName,
  getCustomerTransactions,
  destroy,
};
