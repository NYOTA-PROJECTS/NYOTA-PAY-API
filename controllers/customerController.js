const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const sharp = require("sharp");
const moment = require("moment");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const {
  Admin,
  Customer,
  CustomerBalance,
  Transaction,
  Merchant,
  Category,
  MerchantPicture,
} = require("../models");
const { sequelize } = require("../models");
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
        formattedDate = createdAt.format("DD MMM YYYY, HH:mm");
      }

      // Arrondir le montant à 0 chiffre après la virgule
      let roundedAmount = Math.round(transaction.amount); // ou transaction.amount.toFixed(0)

      // Déterminer le signe du montant en fonction du type de transaction
      let formattedAmount = roundedAmount;
      if (transaction.type === "SEND") {
        formattedAmount = `+${roundedAmount}`;
      } else if (transaction.type === "COLLECT") {
        formattedAmount = `-${roundedAmount}`;
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

const getMerchants = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [
        {
          model: Merchant,
          attributes: ["id", "name", "cover", "photo"],
          include: [
            {
              model: Transaction,
              attributes: [],
            },
          ],
          // Compter le nombre de transactions par marchand
          attributes: {
            include: [
              [
                sequelize.fn(
                  "COUNT",
                  sequelize.col("Merchants->Transactions.id")
                ),
                "merchantTransactionCount",
              ],
            ],
          },
          group: ["Merchant.id"],
        },
      ],
      // Ajouter une condition pour ne récupérer que les catégories ayant au moins un marchand
      where: sequelize.literal(`
        (
          SELECT COUNT(*)
          FROM "Merchants"
          WHERE "Merchants"."categoryId" = "Category"."id"
        ) > 0
      `),
      // Avoir uniquement les catégories et les marchands triés par transaction
      attributes: {
        include: [
          // Utiliser un simple COUNT au niveau de la catégorie
          [
            sequelize.literal(`(
              SELECT COUNT("Transactions"."id")
              FROM "Transactions"
              JOIN "Merchants" ON "Transactions"."merchantId" = "Merchants"."id"
              WHERE "Merchants"."categoryId" = "Category"."id"
            )`),
            "categoryTransactionCount",
          ],
        ],
      },
      group: ["Category.id", "Merchants.id"],
      // Trier les catégories par le nombre total de transactions
      order: [[sequelize.literal(`"categoryTransactionCount"`), "DESC"]],
    });

    if (!categories) {
      return res.status(404).json({
        status: "error",
        message: "Aucune catégorie trouvée.",
      });
    }

    // Transformer les catégories pour les rendre compatibles avec le frontend
    const formattedCategories = categories.map((category) => {
      // Trier les marchands à l'intérieur de chaque catégorie par le nombre de transactions
      const sortedMerchants = category.Merchants.sort((a, b) => {
        return (
          b.dataValues.merchantTransactionCount -
          a.dataValues.merchantTransactionCount
        );
      });

      return {
        categoryName: category.name,
        totalTransactions: category.dataValues.categoryTransactionCount, // Nombre total de transactions de la catégorie
        merchants: sortedMerchants.map((merchant) => ({
          id: merchant.id,
          name: merchant.name,
          cover: merchant.cover,
          photo: merchant.photo,
        })),
      };
    });

    return res.status(200).json({
      status: "success",
      data: formattedCategories,
    });
  } catch (error) {
    console.error(`ERROR GET MERCHANT LIST: ${error}`);
    appendErrorLog(`ERROR GET MERCHANT LIST: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la récupération des marchants.",
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { phone, reason } = req.body;
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de portable est requis.",
      });
    }

    const admins = await Admin.findAll();
    const adminEmails = admins.map((admin) => admin.email);

    if (adminEmails.length === 0) {
      return res.status(500).json({
        status: "error",
        message: "Aucun email d'administrateur trouvé.",
      });
    }

    // Création du transporteur nodemailer
    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Création du contenu de l'email
    let mailOptions = {
      from: `NYOTA PAY<${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: "Demande de suppression de compte",
      text: `L'utilisateur avec le numéro de téléphone ${phone} a demandé la suppression de son compte.\nRaison: ${
        reason || "Non spécifiée"
      }`,
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);

    // Répondre à l'utilisateur après envoi de l'email
    return res.status(200).json({
      status: "success",
      message:
        "Votre demande de suppression de compte a été envoyée à tous les administrateurs.",
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

const resetPassword = async (req, res) => {
  try {
    const { phone } = req.body;

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

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Le client n'existe pas.",
      });
    }

    // Envoyer un email au admin que ce n'uméro de téléphone é demandé a réinitialiser le mot de passe
    const admins = await Admin.findAll();
    const adminEmails = admins.map((admin) => admin.email);

    if (adminEmails.length === 0) {
      return res.status(500).json({
        status: "error",
        message: "Aucun email d'administrateur è.",
      });
    }

    // Création du transporteur nodemailer
    let transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Création du contenu de l'email
    let mailOptions = {
      from: `NYOTA PAY<${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: "Demande de réinitialisation du mot de passe",
      text: `Le client ${customer.firstName} ${customer.lastName} avec le numéro de portable ${phone} a demandé la réinitialisation du mot de passe.`,
    };

    // Envoyer l'email
    await transporter.sendMail(mailOptions);

    // Répondre à l'utilisateur après envoi de l'email
    return res.status(200).json({
      status: "success",
      message:
        "Votre demande de réinitialisation de mot de passe a été prise en compte, vous serez contacté dans les plus brefs delés afin de récuperer votre mot de passe. Merci.",
    });
  } catch (error) {
    console.error(`ERROR RESET CUSTOMER PASSWORD: ${error}`);
    appendErrorLog(`ERROR RESET CUSTOMER PASSWORD: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la modification du mot de passe.",
    });
  }
};

const getMerchantDetails = async (req, res) => {
  try {
    const merchantId = req.headers.merchantid;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "Identifiant du marchant requis.",
      });
    }

    const merchant = await Merchant.findOne({
      where: { id: merchantId },
      attributes: [
        "whatsapp",
        "facebook",
        "tiktok",
        "instagram",
      ],
      include: [
        {
          model: MerchantPicture,
          attributes: ["photo"],
        },
      ],
    });

    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Marchand non trouvé.",
      });
    }

    // Formater la réponse pour inclure les informations des réseaux sociaux et les photos
    const pictures = merchant.MerchantPictures.map((picture) => picture.photo);

    return res.status(200).json({
      status: "success",
      data: {
        whatsapp: merchant.whatsapp,
        facebook: merchant.facebook,
        tiktok: merchant.tiktok,
        instagram: merchant.instagram,
        pictures: pictures.reduce((acc, photo) => {
          acc[`photo`] = photo;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error(`ERROR GET MERCHANT DETAILS: ${error}`);
    appendErrorLog(`ERROR GET MERCHANT DETAILS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la récupération des informations du marchant.",
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
  getMerchants,
  deleteAccount,
  resetPassword,
  getMerchantDetails,
};
