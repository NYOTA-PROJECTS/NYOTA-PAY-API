const PDFDocument = require("pdfkit");
const PDFTable = require("pdfkit-table");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs-extra");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { Cashier, Merchant, PointOfSale } = require("../models");
const { sequelize } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { merchantId, posId, name, balance } = req.body;
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

    if (!posId) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "L'ID du point de vente est requis.",
        });
    }

    if (!balance) {
      return res
        .status(400)
        .json({ status: "error", message: "Le solde minimum est requis." });
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

    const pos = await PointOfSale.findByPk(posId);
    if (!pos) {
      return res.status(404).json({
        status: "error",
        message: "Le point de vente n'existe pas.",
      });
    }

    const existingWorker = await Cashier.findOne({
      where: { merchantId, posId, name },
    });
    if (existingWorker) {
      return res.status(400).json({
        status: "error",
        message: "Cette caisse existe deja, veuillez en créer un autre.",
      });
    }

    await Cashier.create({
      merchantId,
      posId,
      name,
      minBalance: balance,
    });

    return res.status(201).json({
      status: "success",
      message: "La caisse à été creé avec succes.",
    });
  } catch (error) {
    console.error(`ERROR CREATING CASHIER: ${error}`);
    appendErrorLog(`ERROR CREATING CASHIER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la creation de la caisse.",
    });
  }
};


const allAciveCasher = async (req, res) => {
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

    if (!decodedToken) {
      return res
        .status(401)
        .json({ status: "error", message: "Token invalide." });
    }

    const cashierId = decodedToken.id;
    const cashier = await Cashier.findByPk(cashierId);
    if (!cashier) {
      return res.status(404).json({
        status: "error",
        message: "La caisse n'existe pas.",
      });
    }

    const cashierActive = await Cashier.findAll({
      where: {
        posId: cashierId,
        isActive: true,
      },
      attributes: ["id", "name", "minBalance"],
      include: [
        {
          model: Merchant,
          attributes: ["name"],
        },
      ],
    });

    const responseFormat = cashierActive.map((cashier) => {
      return {
        id: cashier.id,
        name: cashier.name,
        merchant: cashier.Merchant.name,
        balance: cashier.minBalance
      };
    });

    return res.status(200).json({
      status: "success",
      data: responseFormat,
    });
        
    } catch (error) {
        console.error(`ERROR GETTING ALL ACTIVE CASHIER: ${error}`);
        appendErrorLog(`ERROR GETTING ALL ACTIVE CASHIER: ${error}`);
        return res.status(500).json({
            status: "error",
            message: "Une erreur s'est produite lors de la recherche de toutes les caisses actives.",
        });
    }
}


module.exports = {
  create,
  allAciveCasher
};