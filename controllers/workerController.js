const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const nodemailer = require('nodemailer');
const path = require("path");
const fs = require('fs-extra');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const  { Op } = require("sequelize");
const { Worker, Merchant, CashRegister, PointOfSale, WorkerSession, CashRegisterBalance, MerchantAdmin, Customer, CustomerBalance, Transaction } = require("../models");
const { appendErrorLog } = require("../utils/logging");
const { sequelize } = require("../models");

const create = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { merchantId, name, phone, password } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    if (!name) {
      return res
        .status(400)
        .json({ status: "error", message: "Le nom est requis." });
    }

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de portable est requis.",
      });
    }

    if (!password) {
      return res
        .status(400)
        .json({ status: "error", message: "Le mot de passe est requis." });
    }

    if (password.length < 4) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe doit avoir 4 caractères.",
      });
    }

    if (!merchantId) {
      return res
        .status(400)
        .json({ status: "error", message: "L'ID du marchand est requis." });
    }

    // Vérifier si l'utilisateur existe dans la base de données en utilisant son ID
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'existe pas.",
      });
    }

    const existingWorker = await Worker.findOne({
      where: { merchantId, phone },
    });
    if (existingWorker) {
      return res.status(400).json({
        status: "error",
        message:
          "Ce compte utilisateur existe déjà, veuillez en créer un autre.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Worker.create({
      name,
      phone,
      password: hashedPassword,
      merchantId,
    });

    return res.status(201).json({
      status: "success",
      message: "Compte utilisateur creé avec succes.",
    });
  } catch (error) {
    console.error(`ERROR CREATING WORKER: ${error}`);
    appendErrorLog(`ERROR CREATING WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la creation du travailleur.",
    });
  }
};

const destroy = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { workerId } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    if (!workerId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de l'utilisateur est requis.",
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

    const merchantId = decodedToken.id;
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'existe pas.",
      });
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(400).json({
        status: "error",
        message: "Ce compte utilisateur n'existe pas.",
      });
    }

    await Worker.destroy({
      where: { id: workerId, merchantId },
    });
    return res.status(200).json({
      status: "success",
      message: "Compte utilisateur supprimé avec succes.",
    });
  } catch (error) {
    console.error(`ERROR DELETE WORKER: ${error}`);
    appendErrorLog(`ERROR DELETE WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la suppression du travailleur.",
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { workerId, password } = req.body;

    if (!workerId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de l'utilisateur est requis.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe actuel est requis.",
      });
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(400).json({
        status: "error",
        message: "Ce compte utilisateur n'existe pas.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Worker.update(
      { password: hashedPassword },
      { where: { id: workerId } }
    );
    return res.status(200).json({
      status: "success",
      message: "Mot de passe mis à jour avec succes.",
    });
  } catch (error) {
    console.error(`ERROR UPDATE WORKER PASSWORD: ${error}`);
    appendErrorLog(`ERROR UPDATE WORKER PASSWORD: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la mise à jour du mot de passe.",
    });
  }
};

const getAll = async (req, res) => {
  try {
    const token = req.headers.authorization;
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

    const merchantId = decodedToken.id;
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'existe pas.",
      });
    }

    const workers = await Worker.findAll({
      where: { merchantId: merchantId, isActive: true },
      attributes: ["id", "name", "phone", "isActive"],
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      status: "success",
      data: workers,
    });
  } catch (error) {
    console.error(`ERROR GETTING WORKERS: ${error}`);
    appendErrorLog(`ERROR GETTING WORKERS: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la récupération des utilisateurs.",
    });
  }
};

const disableAccount = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { workerId } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    if (!workerId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de l'utilisateur est requis.",
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

    const merchantId = decodedToken.id;
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'existe pas.",
      });
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "L'utilisateur n'existe pas.",
      });
    }

    await Worker.update({ isActive: false }, { where: { id: workerId } });
    return res.status(200).json({
      status: "success",
      message: "Compte utilisateur desactivé avec succes.",
    });
  } catch (error) {
    console.error(`ERROR DISABLE WORKER: ${error}`);
    appendErrorLog(`ERROR DISABLE WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la desactivation du compte utilisateur.",
    });
  }
};

const activateAccount = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { workerId } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
    }

    if (!workerId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de l'utilisateur est requis.",
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

    const merchantId = decodedToken.id;
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({
        status: "error",
        message: "Le marchand n'existe pas.",
      });
    }

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "L'utilisateur n'existe pas.",
      });
    }

    await Worker.update({ isActive: true }, { where: { id: workerId } });
    return res.status(200).json({
      status: "success",
      message: "Compte utilisateur desactivé avec succes.",
    });
  } catch (error) {
    console.error(`ERROR DISABLE WORKER: ${error}`);
    appendErrorLog(`ERROR DISABLE WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la desactivation du compte utilisateur.",
    });
  }
};

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
      return res
        .status(400)
        .json({ status: "error", message: "Le mot de passe est requis." });
    }

    const worker = await Worker.findOne({ where: { phone } });
    if (!worker) {
      return res.status(409).json({
        status: "error",
        message: "Compte non enregistrée ou incorrecte. Veuillez réessayer.",
      });
    }

    if (!worker.isActive) {
      return res.status(409).json({
        status: "error",
        message:
          "Votre compte est inactif. Veuillez contacter l'administrateur.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, worker.password);
    if (!isPasswordValid) {
      return res.status(409).json({
        status: "error",
        message: "Mot de passe invalide ou incorrect. Veuillez réessayer.",
      });
    }

    const id = worker.id;
    const currentSession = await WorkerSession.findOne({
      where: { id, endTime: null },
    });
    
    if (currentSession) {
      return res.status(404).json({
        status: "error",
        message: "Une session est déjà ouverte pour ce compte utilisateur, veuillez attendre la fin de cette session ou contacter l'administrateur." ,
      });
    }

    const token = jwt.sign(
      {
        id: id,
        role: "isWorker",
      },
      process.env.JWT_SECRET
    );

    const dataResponse = {
      name: worker.name,
      phone: worker.phone,
      token: token,
    };

    return res.status(200).json({
      status: "success",
      data: dataResponse,
    });
  } catch (error) {
    console.error(`ERROR LOGIN WORKER: ${error}`);
    appendErrorLog(`ERROR LOGIN WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la connexion de l'utilisateur.",
    });
  }
};

const getAllCashregisters = async (req, res) => {
  try {
    const token = req.headers.authorization;
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

    const workerId = decodedToken.id;

    // Récupérer le worker et vérifier s'il existe
    const worker = await Worker.findByPk(workerId, {
      include: {
        model: Merchant,
        attributes: ["id", "name"],
        include: {
          model: CashRegister,
          attributes: ["id", "name"],
          include: {
            model: PointOfSale,
            attributes: ["id", "urlLink"],
          },
        },
      },
    });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Compte utilisateur non trouvé. Veuillez réessayer.",
      });
    }

    // Récupérer les caisses associées au Merchant du worker
    const cashRegisters = worker.Merchant.CashRegisters;
    const merchantName = worker.Merchant.name;
    const merchantId = worker.Merchant.id;

    // Vérifier si des caisses sont trouvées
    if (!cashRegisters || cashRegisters.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Aucune caisse trouvée pour ce worker.",
      });
    }

    // Retourner seulement les champs 'id' et 'name' des caisses
    const result = cashRegisters.map((cashRegister) => ({
      id: cashRegister.id,
      name: cashRegister.name,
      merchantId: merchantId,
      merchantName: merchantName,
      posId: cashRegister.PointOfSale ? cashRegister.PointOfSale.id : null,
      posName: cashRegister.PointOfSale
        ? cashRegister.PointOfSale.urlLink
        : null,
    }));

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error(`ERROR GET WORKER CASHREGISTER: ${error}`);
    appendErrorLog(`ERROR GET WORKER CASHREGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la récuperation des caisses lié à l'utilisateur.",
    });
  }
};

const startSession = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { cashRegisterId } = req.body;

    if (!cashRegisterId) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Identifiant de caisse non fourni.",
        });
    }

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

    const workerId = decodedToken.id;

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Compte utilisateur non trouvé. Veuillez réessayer.",
      });
    }

    // Vérifier si une session est déjà ouverte
    const existingSession = await WorkerSession.findOne({
      where: { workerId, endTime: null },
    });

    if (existingSession) {
      return res.status(400).json({
        status: "error",
        message: "Une session est déjà ouverte pour ce compte utilisateur.",
      });
    }

    // Récupérer le solde de la caisse
    const cashRegister = await CashRegister.findByPk(cashRegisterId, {
      include: [{
        model: CashRegisterBalance,
        required: true,
      }]
    });

    if (!cashRegister) {
      return res.status(404).json({
        status: "error",
        message: "Caisse non trouvée ou solde non disponible.",
      });
    }

    const initialBalance = cashRegister.CashRegisterBalance.amount;

    // Créer une nouvelle session avec le solde initial
    await WorkerSession.create({
      workerId,
      cashRegisterId,
      initialBalance,
    });

    return res.status(201).json({
      status: "success",
      message: "Session ouverte avec succès.",
    });
  } catch (error) {
    console.error(`ERROR START SESSION: ${error}`);
    appendErrorLog(`ERROR START SESSION: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création de la session.",
    });
  }
};

const getCashBalance = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const cashRegisterId = req.headers.cashregisterid;

    if (!cashRegisterId) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Identifiant de caisse non fourni.",
        });
    }

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

    const workerId = decodedToken.id;

    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Compte utilisateur non trouvé. Veuillez réessayer.",
      });
    }

    // Récupérer la caisse associée à l'ID
    const cashRegister = await CashRegister.findByPk(cashRegisterId, {
      include: {
        model: CashRegisterBalance,
        attributes: ['amount']  // Récupérer uniquement le solde
      }
    });

    // Vérifier si la caisse existe et si elle a un solde associé
    if (!cashRegister || !cashRegister.CashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Caisse non trouvé. Veuillez réessayer.",
      })
    }

    return res.status(200).json({
      status: "success",
      data: cashRegister.CashRegisterBalance.amount
    });

  } catch (error) {
    console.error(`ERROR GET CASH BALANCE OF WORKER: ${error}`);
    appendErrorLog(`ERROR GET CASH BALANCE OF WORKER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création de la session.",
    });
  }
}

const scanCustomer = async (req, res) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({
        status: "error",
        message: "Veuillez scanner le codeQR du client.",  
      });
    }

    const customer = await Customer.findOne({ where: { qrcode: uuid } });

    if (!customer) {
      return res.status(404).json({
        status: "error",
        message: "Compte client non trouvé veuillez crée un compte sur l'application.",
      });
    }

    const response = {
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
    };

    return res.status(200).json({
      status: "success",
      data: response
    });
  } catch (error) {
    console.error(`ERROR SCAN CUSTOMER: ${error}`);
    appendErrorLog(`ERROR SCAN CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors du scanning.",
    });
  }
}

const getCustomerInfos = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de téléphone du client est requis afin d'éfectuer cette opération.",
      });
    }

    // Rechercher le client par son numéro de téléphone
    let customer = await Customer.findOne({ where: { phone } });

    if (!customer) {
      // Si le client n'existe pas, créer un nouveau compte avec le solde initial de 0
      customer = await Customer.create({ phone, isMobile: false });

      // Créer également une entrée de solde pour le client avec un montant initial de 0
      await CustomerBalance.create({
        customerId: customer.id,
        amount: 0,
      });

      // Répondre avec les détails du nouveau compte créé
      return res.status(200).json({
        status: "success",
        data: {
          name: 'Aucun profil créé',
          phone: customer.phone,
        },
      });
    } else {
      // Répondre avec les détails du client existant
      if (customer.firstName === null && customer.lastName === null) {
         return res.status(404).json({
           status: "error",
           message: "Pour réaliser cette opération, le client doit d'abord créer un compte et se connecter à son profil sur l'application mobile client.",
         })
      } 

      return res.status(200).json({
        status: "success",
        data: {
          name : `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
        },
      });
    }
    
  } catch (error) {
    console.error(`ERROR GET CUSTOMER DETAILS: ${error}`);
    appendErrorLog(`ERROR GET CUSTOMER DETAILS: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création de la session.",
    });
  }
}

const endSession = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ status: "error", message: "Token non fourni." });
    }

    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Format de token invalide.",
      });
    }

    const customToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(customToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ status: "error", message: "Token invalide." });
    }

    const workerId = decodedToken.id;

    // Trouver l'utilisateur et ses associations
    const worker = await Worker.findByPk(workerId, {
      include: {
        model: Merchant,
        attributes: ["id", "name"],
        include: [
          {
            model: CashRegister,
            attributes: ["id", "name"],
            include: {
              model: PointOfSale,
              attributes: ["id", "urlLink"],
            },
          },
          {
            model: MerchantAdmin,
            attributes: ["id", "email"],
            required: true,
          },
        ],
      },
    }, { transaction });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Compte utilisateur non trouvé. Veuillez réessayer.",
      });
    }

    // Trouver la session en cours
    const currentSession = await WorkerSession.findOne({
      where: { workerId, endTime: null },
      transaction,
    });

    if (!currentSession) {
      return res.status(404).json({
        status: "error",
        message: "Session active non trouvée.",
      });
    }

    // Fermer la session (non bloquant, gestion manuelle si cela échoue)
    currentSession.endTime = new Date();
    await currentSession.save({ fields: ["endTime"], transaction });

    // Récupérer le solde de la caisse
    const cashRegisterId = worker.Merchant.CashRegisters[0].id;
    const cashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: cashRegisterId },
      transaction,
    });

    if (!cashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Solde de la caisse non trouvé.",
      });
    }

    // Récupérer toutes les transactions pour la session
    const transactions = await Transaction.findAll({
      where: {
        workerId: workerId,
        createdAt: {
          [Op.gte]: currentSession.startTime,
        },
      },
      include: [
        {
          model: Customer,
          attributes: ["id", "phone"],
        },
      ],
      transaction,
    });

    // Calculs des montants
    const totalSend = transactions
      .filter(transaction => transaction.type === 'SEND')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalCollect = transactions
      .filter(transaction => transaction.type === 'COLLECT')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalCommission = transactions
      .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

    const nyotaCommission = transactions
      .reduce((sum, transaction) => sum + (transaction.initAmount || 0), 0);

    // Commit de la transaction pour finaliser la session
    await transaction.commit();

    // Tâches non bloquantes après la validation de la transaction
    (async () => {
      try {
        // Génération du PDF et envoi par email en arrière-plan
        const merchantName = worker.Merchant.name.replace(/\s+/g, '_');
        const dirPath = path.join(__dirname, '../public/reports', merchantName);

        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        const pdfPath = await generateWorkerBalancePDF(
          worker,
          currentSession,
          cashRegisterBalance,
          dirPath,
          transactions,
          totalSend,
          totalCollect,
          totalCommission,
          nyotaCommission
        );

        const merchantAdminEmail = worker.Merchant.MerchantAdmins.map(admin => admin.email);
        await sendEmailWithPDF(worker, currentSession, cashRegisterBalance, pdfPath, merchantAdminEmail, totalSend, totalCollect, totalCommission, nyotaCommission);
      } catch (error) {
        console.error('Erreur lors de la génération du PDF ou de l\'envoi d\'email:', error);
        appendErrorLog(`Erreur lors de la génération du PDF ou de l'envoi d'email: ${error}`);
      }
    })();

    // Réponse immédiate
    return res.status(200).json({
      status: "success",
      data: {
        initialBalance: currentSession.initialBalance,
        totalSend: totalSend.toFixed(2),
        totalCollect: totalCollect.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
        nyotaCommission: nyotaCommission.toFixed(2),
        transactions: transactions.map(tx => ({
          id: tx.id,
          type: tx.type,
          phone: tx.Customer.phone,
          amount: tx.amount,
          initAmount: tx.initAmount,
          commission: tx.commission,
          code: tx.code,
        })),
      },
      message: "Session fermée et votre rapport sera envoyé sous peu.",
    });

  } catch (error) {
    // En cas d'erreur, rollback de la transaction
    await transaction.rollback();
    console.error(`ERROR END SESSION: ${error}`);
    appendErrorLog(`ERROR END SESSION: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la fermeture de la session.",
    });
  }
};


const generateWorkerBalancePDF = async (worker, session, cashRegisterBalance, dirPath, transactions, totalSend, totalCollect, totalCommission, nyotaCommission) => {
  const formattedEndTime = new Date(session.endTime).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedStartTime = new Date(session.startTime).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const pdfPath = path.join(dirPath, `Rapport_${session.id}.pdf`);
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Ajouter le logo
      const logoPath = path.join(__dirname, '../assets', 'logo.png');
      const logoWidth = 60;
      const logoHeight = 60;
      doc.image(logoPath, 60, 30, { width: logoWidth, height: logoHeight });

      doc.moveDown(5);
      doc.fontSize(20).text(`Ticket Z de la caisse n°${worker.Merchant.CashRegisters[0].id} du ${formattedEndTime.split(' ')[0]}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text(`Marchand: ${worker.Merchant.name}`);
      doc.text(`Point de vente: ${worker.Merchant.CashRegisters[0].PointOfSale.urlLink}`);
      doc.text(`Caissier / Caissière: ${worker.name}`);
      doc.text(`Date et heure d’ouverture: ${formattedStartTime}`);
      doc.text(`Date et heure de fermeture: ${formattedEndTime}`);
      doc.moveDown(1);

      // Informations de solde
      doc.text(`Solde à l’ouverture: ${session.initialBalance} FCFA`);
      doc.text(`Monnaie virtuelle rendue (SEND): ${totalSend} FCFA`);
      doc.text(`Monnaie virtuelle encaissée (COLLECT): ${totalCollect} FCFA`);
      doc.text(`Commission totale: ${totalCommission} FCFA`);
      doc.text(`Commission Nyota: ${nyotaCommission} FCFA`);
      doc.text(`Solde à la fermeture: ${cashRegisterBalance.amount} FCFA`);
      doc.moveDown(1);

      // Relevé de transaction
      doc.fontSize(16).text(`Relevé de transaction`, { align: 'center', underline: true });
      doc.moveDown(1);

      // Créer le tableau manuellement avec gestion des pages
      const tableTop = doc.y;
      const itemHeight = 20;
      const col1X = 60;
      const col2X = 200;
      const col3X = 350;
      const pageBottomMargin = doc.page.height - 50;

      const renderTableHeader = () => {
        doc.fontSize(12).text('Téléphone client', col1X, tableTop, { underline: true });
        doc.text('Montant', col2X, tableTop, { underline: true });
        doc.text('Commission Nyota', col3X, tableTop, { underline: true });
      };

      // Afficher les en-têtes du tableau
      renderTableHeader();

      let tableY = tableTop + itemHeight;

      // Affichage des transactions avec gestion du saut de page
      transactions.forEach((transaction, index) => {
        // Si l'espace restant est insuffisant pour un élément, on passe à la page suivante
        if (tableY + itemHeight > pageBottomMargin) {
          doc.addPage(); // Ajouter une nouvelle page
          tableY = 50; // Réinitialiser la position Y
          renderTableHeader(); // Réafficher les en-têtes du tableau
          tableY += itemHeight;
        }

        doc.fontSize(10).text(transaction.Customer.phone, col1X, tableY);
        doc.text(`${transaction.amount.toFixed(2)} FCFA`, col2X, tableY);
        doc.text(`${transaction.commission ? transaction.commission.toFixed(2) : 0} FCFA`, col3X, tableY);
        tableY += itemHeight;
      });

      // Fin du document
      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfPath);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const sendEmailWithPDF = async (worker, session, cashRegisterBalance, pdfPath, recipientEmail, totalSend, totalCollect, totalCommission, nyotaCommission) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const formattedStartTime = new Date(session.startTime).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedEndTime = new Date(session.endTime).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Construire le corps de l'e-mail avec les informations calculées
  const emailBody = `
    Bonjour,

    Voici les détails du ticket Z de la caisse n°${worker.Merchant.CashRegisters[0].id} du ${formattedEndTime.split(' ')[0]} :

    - **Date de début :** ${formattedStartTime}
    - **Date de fin :** ${formattedEndTime}
    - **Caissier(ère) :** ${worker.name}

    **Détails financiers de la session** :
    - **Solde initial de la caisse :** ${session.initialBalance.toFixed(2)} FCFA
    - **Total des transactions SEND :** ${totalSend.toFixed(2)} FCFA
    - **Total des transactions COLLECT :** ${totalCollect.toFixed(2)} FCFA
    - **Total des commissions :** ${totalCommission.toFixed(2)} FCFA
    - **Commission Nyota (somme des initAmount) :** ${nyotaCommission.toFixed(2)} FCFA
    - **Solde actuel de la caisse :** ${cashRegisterBalance.amount.toFixed(2)} FCFA

    Vous trouverez ci-joint le rapport détaillé des transactions pour cette session.

    Cordialement,
    ${worker.Merchant.name}
  `;

  const mailOptions = {
    from: `NYOTA PAY<${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `Ticket Z de la caisse n°${worker.Merchant.CashRegisters[0].id} - ${formattedEndTime.split(' ')[0]}`,
    text: emailBody,
    attachments: [
      {
        filename: `Rapport_${session.id}.pdf`,
        path: pdfPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

// Historique des transactions
const getWorkerTransactions = async (req, res) => {
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

    const workerId = decodedToken.id;

    // Récupérer le worker et vérifier s'il existe
    const worker = await Worker.findOne({
      where: { id: workerId },
    });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "L'utilisateur non trouvé.",
      });
    }

    // Récupérer la session active du Worker
    const activeSession = await WorkerSession.findOne({
      where: {
        workerId,
        endTime: null, // La session est active si endTime est NULL
      },
      include: [{ model: CashRegister, attributes: ["id", "name"] }],
    });

    if (!activeSession) {
      return res.status(404).json({
        status: "error",
        message: "Aucune session active trouvée pour ce worker.",
      });
    }

    // Récupérer toutes les transactions liées à ce worker et à cette session
    const transactions = await Transaction.findAll({
      where: {
        workerId,
        createdAt: {
          [Op.gte]: activeSession.startTime, // Transactions faites depuis le début de la session
        },
      },
      include: [
        {
          model: Customer,
          attributes: ["id", "firstName", "lastName", "phone"],
        },
        {
          model: Merchant,
          attributes: ["id", "name"],
        },
        {
          model: CashRegister,
          attributes: ["id", "name"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    return res.status(200).json({
      status: "success",
      message: "Transactions récupérées avec succès.",
      data: transactions,
    });
  } catch (error) {
    console.error(`Error fetching transactions: ${error}`);
    appendErrorLog(`Error fetching transactions: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur est survenue lors de la récupération des transactions.",
    });
  }
};

async function getCashRegisterBalance(token, cashRegisterId) {
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const workerId = decodedToken.id;

    // Récupérer la caisse associée à l'ID
    const cashRegister = await CashRegister.findByPk(cashRegisterId, {
      include: {
        model: CashRegisterBalance,
        attributes: ['amount']  // Récupérer uniquement le solde
      }
    });

    // Vérifier si la caisse existe et si elle a un solde associé
    if (!cashRegister || !cashRegister.CashRegisterBalance) {
      console.error(`Caisse ou solde introuvable pour cashRegisterId: ${cashRegisterId}`);
      return null;
    }
    console.error(`workerId: ${workerId}, cashRegisterId: ${cashRegisterId}`);
    appendErrorLog(`workerId: ${workerId}, cashRegisterId: ${cashRegisterId}`);
    // Retourner le solde
    return cashRegister.CashRegisterBalance.amount;
  } catch (error) {
    console.error(`Error fetching worker balance: ${error}`);
    appendErrorLog(`Error fetching worker balance: ${error}`);
    return null;
  }
}

module.exports = {
  create,
  destroy,
  updatePassword,
  disableAccount,
  activateAccount,
  getAll,
  login,
  getAllCashregisters,
  startSession,
  getCashBalance,
  endSession,
  getCashRegisterBalance,
  scanCustomer,
  getCustomerInfos,
  getWorkerTransactions,
};
