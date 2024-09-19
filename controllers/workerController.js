const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const path = require("path");
const fs = require('fs-extra');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Worker, Merchant, CashRegister, PointOfSale, WorkerSession, CashRegisterBalance, MerchantAdmin } = require("../models");
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

    const existingSession = await WorkerSession.findOne({
      where: { workerId, endTime: null },
    });

    if (existingSession) {
      return res.status(400).json({
        status: "error",
        message: "Une session est déjà ouverte pour ce compte utilisateur.",
      });
    }

    // Créer une nouvelle session
    await WorkerSession.create({
      workerId,
      cashRegisterId,
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

const endSession = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Token non fourni." });
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

    // Mettre à jour la session avec l'heure de fermeture
    currentSession.endTime = new Date();
    await currentSession.save(
      {
        fields: ["endTime"],
        transaction
      }
    );

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

    // Créer un répertoire pour le marchand s'il n'existe pas
    const merchantName = worker.Merchant.name.replace(/\s+/g, '_'); // Remplacer les espaces par des underscores
    const dirPath = path.join(__dirname, '../public/reports', merchantName);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Générer un PDF du solde
    const pdfPath = await generateWorkerBalancePDF(worker, currentSession, cashRegisterBalance, dirPath);

    // Envoyer le PDF au marchand
    const merchantAdminEmail = worker.Merchant.MerchantAdmins.map(admin => admin.email);
    await sendEmailWithPDF(worker, currentSession, cashRegisterBalance, pdfPath, merchantAdminEmail);

    await transaction.commit();
    return res.status(200).json({
      status: "success",
      message: "Session fermée et votre rapport à éte envoyé avec succès.",
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR END SESSION: ${error}`);
    appendErrorLog(`ERROR END SESSION: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la fermeture de la session.",
    });
  }
};

// Fonction pour générer le PDF avec le solde du worker
const generateWorkerBalancePDF = async (worker, session, cashRegisterBalance, dirPath) => {
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

  const logoPath = path.join(__dirname, '../assets', 'logo.png');
  const logoWidth = 150; // Adjust the width as needed
  const logoHeight = 150; // Adjust the height as needed

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const pdfPath = path.join(dirPath, `Rapport_${session.id}.pdf`);
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Calculate the x position to center the image horizontally
      const xPosition = (doc.page.width - logoWidth) / 2;
      doc.image(logoPath, xPosition, 20, { width: logoWidth, height: logoHeight });

      // Move down for text
      doc.moveDown(10);

      doc.fontSize(20).text('Solde de la caisse', { align: 'center' });
      doc.fontSize(14).text(`Marchand : ${worker.Merchant.name}`);
      doc.text(`Point de vente : ${worker.Merchant.CashRegisters[0].PointOfSale.urlLink}`);
      doc.text(`Nom du caissier : ${worker.name}`);
      doc.text(`Date de début : ${formattedStartTime}`);
      doc.text(`Date de fin : ${formattedEndTime}`);
      doc.text(`Solde : ${cashRegisterBalance.amount} ${worker.Merchant.currency || 'FCFA'}`);

      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfPath);
      });
    } catch (error) {
      reject(error);
    }
  });
};


// Fonction pour envoyer un e-mail avec le PDF en pièce jointe
const sendEmailWithPDF = async (worker, session, cashRegisterBalance, pdfPath, recipientEmail) => {
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

  const emailBody = `
    Hello!

    Ci-joint le ticket Z de la caisse n°${worker.Merchant.CashRegisters[0].id} du ${formattedEndTime.split(' ')[0]}.

    Date de début: ${formattedStartTime}
    Date de fin: ${formattedEndTime}
    Caissier(ère): ${worker.name}

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
    // Retourner le solde
    return cashRegister.CashRegisterBalance.amount;
  } catch (error) {
    console.error(`Error fetching worker balance: ${error}`);
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
  getCashRegisterBalance
};
