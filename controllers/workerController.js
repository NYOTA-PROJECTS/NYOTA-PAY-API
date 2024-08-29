const bcrypt = require("bcrypt");
const { Worker, Merchant } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { name, phone, password } = req.body;
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

module.exports = { create, destroy, updatePassword, disableAccount, activateAccount, getAll };
