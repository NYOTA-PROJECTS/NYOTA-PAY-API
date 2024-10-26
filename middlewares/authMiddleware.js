const jwt = require("jsonwebtoken");
const { Admin, Merchant, CashRegister, Worker, Customer, PointOfSale, Cashier } = require("../models");

// Middleware pour vérifier le token JWT et l'utilisateur associé
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ status: "error", message: "Token invalide." });
  }

  // Vérifiez si l'en-tête commence par "Bearer "
  if (!authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ status: "error", message: "Échec de l'authentification." });
  }

  // Extrait le token en supprimant le préfixe "Bearer "
  const token = authHeader.substring(7);

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    console.error(decoded);
    if (err) {
      return res
        .status(500)
        .json({ status: "error", message: "Token est invalide ou a expiré." });
    }

    try {
      let user;

      // Vérification selon le rôle contenu dans le token
      if (decoded.role === "isAdmin") {
        user = await Admin.findByPk(decoded.id);
      } else if (decoded.role === "isMerchant") {
        user = await Merchant.findByPk(decoded.id);
      } else if (decoded.role === "isCashRegister") {
        user = await CashRegister.findByPk(decoded.id);
      } else if (decoded.role === "isWorker") {
        user = await Worker.findByPk(decoded.id);
      } else if (decoded.role === "isCustomer") {
        user = await Customer.findByPk(decoded.id);
      } else if (decoded.role === "isPointOfSell") {
        user = await PointOfSale.findByPk(decoded.id);
      } else if (decoded.role === "isCashier") {
        user = await Cashier.findByPk(decoded.id);
      }

      if (!user) {
        return res
          .status(404)
          .json({
            status: "error",
            message: "Utilisateur invalide ou non trouvé.",
          });
      }

      // Si l'utilisateur existe, on l'attache à req.user
      req.user = user;
      req.user.role = decoded.role; // On ajoute le rôle à l'objet req.user
      next();
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Erreur lors de la récupération de l'utilisateur.",
      });
    }
  });
};

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "isAdmin") {
    return res
      .status(403)
      .json({ status: "error", message: "Échec de l'autorisation." });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est un marchant
const isMerchant = (req, res, next) => {
  if (req.user.role !== "isMerchant") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};


const isCashRegister = (req, res, next) => {
  if (req.user.role !== "isCashRegister") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

const isWorker = (req, res, next) => {
  if (req.user.role !== "isWorker") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

const isCustomer = (req, res, next) => {
  if (req.user.role !== "isCustomer") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

const isPointOfSell = (req, res, next) => {
  if (req.user.role !== "isPointOfSell") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

const isCashier = (req, res, next) => {
  if (req.user.role !== "isCashier") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est un admin ou un marchant
const isAdminOrMerchant = (req, res, next) => {
  if (req.user.role !== "isAdmin" && req.user.role !== "isMerchant") {
    return res.status(403).json({ message: "Échec de l'autorisation.!" });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est soit admin, soit marchant
const isAllValid = (req, res, next) => {
  if (req.user.role !== "isAdmin" && req.user.role !== "isMerchant") {
    return res.status(403).json({ message: "Require User or Admin Role!" });
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  isMerchant,
  isAllValid,
  isAdminOrMerchant,
  isCashRegister,
  isWorker,
  isCustomer,
  isPointOfSell,
  isCashier
};
