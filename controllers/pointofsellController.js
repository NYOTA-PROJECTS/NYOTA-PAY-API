const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Merchant, PointOfSale } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const list = async (req, res) => {
  try {
    const merchantId = req.headers.merchantid;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    const merchant = await Merchant.findOne({ where: { id: merchantId } });
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    const pointOfSell = await PointOfSale.findAll({
      where: { merchantId: merchantId },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    if (!pointOfSell) {
      return res.status(404).json({
        status: "error",
        message: "Aucun point de vente n'a été trouvé.",
      });
    }

    const response = pointOfSell.map((pos) => {
      return {
        id: pos.id,
        name: pos.name,
      };
    });

    return res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (error) {
    console.error(`ERROR LISTING POINT OF SELL: ${error}`);
    appendErrorLog(`ERROR LISTING POINT OF SELL: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la recupération des points de vente.",
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
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    const pointOfSell = await PointOfSale.findOne({
      where: { phone },
      attributes: ["id", "name", "phone", "password"],
    });

    if (!pointOfSell) {
      return res.status(404).json({
        status: "error",
        message: "Le point de vente n'existe pas.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      pointOfSell.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Le mot de passe est incorrect.",
      });
    }

    const token = jwt.sign(
      {
        id: pointOfSell.id,
        role: "isCashier",
      },
      process.env.JWT_SECRET
    );

    const response = {
      name: pointOfSell.name,
      phone: pointOfSell.phone,
      token,
    };

    return res.status(200).json({
      status: "success",
      data: response,
    });
  } catch (error) {
    console.error(`ERROR LOGIN POINT OF SELL: ${error}`);
    appendErrorLog(`ERROR LOGIN POINT OF SELL: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la connexion au point de vente.",
    });
  }
};

const create = async (req, res) => {
  try {
    const { merchantId, name, phone, password } = req.body;

    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Le nom du point de vente est requis.",
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
          "Le numéro de portable doit être un numéro valide du Congo-Brazzaville.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe est requis.",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        status: "error",
        message: "Le mot de passe doit contenir au moins 4 caractères.",
      });
    }

    const merchant = await Merchant.findOne({ where: { id: merchantId } });
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    const existingPointOfSell = await PointOfSale.findOne({
      where: { phone: phone },
    });
    if (existingPointOfSell) {
      return res.status(400).json({
        status: "error",
        message: "Un point de vente avec ce numéro de portable existe deja.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await PointOfSale.create({
      merchantId,
      name: name,
      phone: phone,
      password: hashedPassword,
    });

    return res.status(201).json({
      status: "success",
      message: "Le point de vente a été créé avec succes!",
    });
  } catch (error) {
    console.error(`ERROR CREATING POINT OF SELL: ${error}`);
    appendErrorLog(`ERROR CREATING POINT OF SELL: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la creation du point de vente.",
    });
  }
};

const destroy = async (req, res) => {
  try {
    const { posId } = req.body;
    if (!posId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du point de vente est requis.",
      });
    }

    const pointOfSell = await PointOfSale.findOne({ where: { id: posId } });
    if (!pointOfSell) {
      return res.status(400).json({
        status: "error",
        message: "Le point de vente n'existe pas.",
      });
    }
    await pointOfSell.destroy();

    return res.status(200).json({
      status: "success",
      message: "Le point de vente a été supprimé avec succes!",
    });
  } catch (error) {
    console.error(`ERROR DELETING POINT OF SELL: ${error}`);
    appendErrorLog(`ERROR DELETING POINT OF SELL: ${error}`);
    return res.status(500).json({
      status: "error",
      message:
        "Une erreur s'est produite lors de la suppression du point de vente.",
    });
  }
};

module.exports = { create, list, destroy, login };
