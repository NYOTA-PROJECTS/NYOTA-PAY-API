const {
  Merchant,
  CashRegister,
  MerchantBalance,
  PointOfSale,
} = require("../models");
const { sequelize } = require("../models");
const { appendErrorLog } = require("../utils/logging");

const create = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { merchantId, posId, name, amount } = req.body;

    if (!posId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du point de vente est requis.",
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Le nom de la caisse est requis.",
      });
    }

    if (!amount) {
      return res.status(400).json({
        status: "error",
        message: "Un solde minimum est requis.",
      });
    }

    // Récupère le marchand et son solde
    const merchant = await Merchant.findOne({
      where: { id: merchantId },
      attributes: ["id"],
      include: [
        {
          model: MerchantBalance,
          attributes: ["amount"],
        },
      ],
      transaction,
    });

    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    const merchantposId = await PointOfSale.findOne({
      where: { id: posId },
      transaction,
    });

    if (!merchantposId) {
      return res.status(400).json({
        status: "error",
        message: "Le point de vente n'existe pas.",
      });
    }

    // Assure-toi d'avoir accès à la liste des soldes du marchand
    const balance = merchant.MerchantBalances && merchant.MerchantBalances[0];

    if (!balance) {
      return res.status(400).json({
        status: "error",
        message: "Le solde du marchand est introuvable.",
      });
    }

    // Empêche que le solde minimum soit supérieur au solde du compte du marchand
    if (parseFloat(amount) > parseFloat(balance.amount)) {
      return res.status(400).json({
        status: "error",
        message:
          "Le solde minimum ne doit pas être supérieur au solde du compte du marchand.",
      });
    }

    // Déduire le montant dans le solde du compte du marchand
    const newBalance = parseFloat(balance.amount) - parseFloat(amount);
    console.error(`newBalance: ${newBalance}`);
    await MerchantBalance.update(
      { amount:  newBalance },
      { where: { id: merchantId }, transaction }
    );

    await CashRegister.create(
      {
        merchantId,
        merchantposId: posId,
        minBalance: amount,
        name,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      status: "success",
      message: "La caisse a éte crée avec succès!.",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR CREATING CASH REGISTER: ${error}`);
    appendErrorLog(`ERROR CREATING CASH REGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création du compte.",
    });
  }
};

const destroy = async (req, res) => {
  try {
    const { cashregisterId } = req.body;
    if (!cashregisterId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la caisse est requis.",
      });
    }

    const cashregister = await CashRegister.findByPk(cashregisterId);

    if (!cashregister) {
      return res.status(400).json({
        status: "error",
        message: "La caisse du marchand n'existe pas.",
      });
    }

    await CashRegister.destroy({
      where: { id: cashregisterId },
    });

    return res.status(200).json({
      status: "success",
      message: "La caisse a été supprimé avec succes!.",
    });
  } catch (error) {
    console.error(`ERROR DELETE CASH REGISTER: ${error}`);
    appendErrorLog(`ERROR DELETE CASH REGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la création du compte.",
    });
  }
};

module.exports = { create, destroy };
