const {
  Merchant,
  CashRegister,
  MerchantBalance,
  CashRegisterBalance,
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

    // Paralléliser la vérification de l'existence du point de vente et du marchand
    const [pointOfSale, merchant] = await Promise.all([
      PointOfSale.findOne({ where: { id: posId } }),
      Merchant.findOne({ where: { id: merchantId }, attributes: ["id"] })
    ]);

    // Vérification si le point de vente existe
    if (!pointOfSale) {
      return res.status(400).json({
        status: "error",
        message: "Le point de vente n'existe pas.",
      });
    }

    // Vérification si le marchand existe
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    // Vérification si la caisse existe déjà
    const existingCashRegister = await CashRegister.findOne({
      where: { merchantId, merchantposId: posId, name },
    });

    if (existingCashRegister) {
      return res.status(400).json({
        status: "error",
        message: "La caisse existe déjà.",
      });
    }

    // Création de la caisse
    const newCashRegister = await CashRegister.create(
      {
        merchantId,
        merchantposId: posId,
        minBalance: amount,
        name,
      },
      { transaction }
    );

    // Création du solde de la caisse avec un montant initial de 0
    await CashRegisterBalance.create(
      {
        cashregisterId: newCashRegister.id,
        amount: 0,
      },
      { transaction }
    );

    // Valider la transaction
    await transaction.commit();

    // Répondre avec succès
    return res.status(201).json({
      status: "success",
      message: "La caisse a été créée avec succès!",
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

const recharge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { merchantId, cashregisterId, amount } = req.body;
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!cashregisterId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la caisse est requis.",
      });
    }

    if (!amount) {
      return res.status(400).json({
        status: "error",
        message: "Le montant est requis.",
      });
    }

    // Vérification de l'existence du marchand
    const merchant = await Merchant.findOne({ where: { id: merchantId }, transaction });
    if (!merchant) {
      return res.status(400).json({
        status: "error",
        message: "Le compte du marchand n'existe pas.",
      });
    }

    // Vérification de l'existence de la caisse
    const cashregister = await CashRegister.findOne({ where: { id: cashregisterId, merchantId }, transaction });
    if (!cashregister) {
      return res.status(400).json({
        status: "error",
        message: "La caisse du marchand n'existe pas.",
      });
    }

    // Vérification du solde du marchand
    const merchantBalance = await MerchantBalance.findOne({ where: { merchantId }, transaction });
    if (!merchantBalance || parseFloat(merchantBalance.amount) < parseFloat(amount)) {
      return res.status(400).json({
        status: "error",
        message: "Solde insuffisant pour effectuer la recharge.",
      });
    }

    // Déduction du solde du marchand
    merchantBalance.amount = (parseFloat(merchantBalance.amount) - parseFloat(amount)).toFixed(2);
    await merchantBalance.save({ transaction });

    // Ajout du montant au solde de la caisse
    const cashRegisterBalance = await CashRegisterBalance.findOne({ where: { cashregisterId }, transaction });
    if (!cashRegisterBalance) {
      return res.status(400).json({
        status: "error",
        message: "Le solde de la caisse n'existe pas.",
      });
    }

    cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) + parseFloat(amount)).toFixed(2);
    await cashRegisterBalance.save({ transaction });

    // Commit de la transaction pour valider les changements
    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: `La caisse ${cashregister.name} a été rechargée avec succès.`,
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR RECHARGE CASH REGISTER: ${error}`);
    appendErrorLog(`ERROR RECHARGE CASH REGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la recharge de la caisse.",
    });
  }
}

const transferAmount = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { merchantId, sourceId, destinationId, amount } = req.body;

    // Vérification des champs requis
    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!sourceId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la caisse source est requis.",
      });
    }

    if (!destinationId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la caisse destination est requis.",
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Un montant valide est requis pour le transfert.",
      });
    }

    // Vérification de l'existence de la caisse source
    const sourceCashRegister = await CashRegister.findOne({
      where: { id: sourceId, merchantId },
      transaction,
    });

    if (!sourceCashRegister) {
      return res.status(404).json({
        status: "error",
        message: "La caisse source n'existe pas ou n'appartient pas à ce marchand.",
      });
    }

    // Vérification de l'existence de la caisse destination
    const destinationCashRegister = await CashRegister.findOne({
      where: { id: destinationId, merchantId },
      transaction,
    });

    if (!destinationCashRegister) {
      return res.status(404).json({
        status: "error",
        message: "La caisse de destination n'existe pas ou n'appartient pas à ce marchand.",
      });
    }

    // Récupérer le solde de la caisse source
    const sourceCashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: sourceId },
      transaction,
    });

    if (!sourceCashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Le solde de la caisse source n'existe pas.",
      });
    }

    // Vérification du solde suffisant dans la caisse source
    if (parseFloat(sourceCashRegisterBalance.amount) < parseFloat(amount)) {
      return res.status(400).json({
        status: "error",
        message: "Solde insuffisant dans la caisse source pour effectuer le transfert.",
      });
    }

    // Récupérer le solde de la caisse destination
    const destinationCashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: destinationId },
      transaction,
    });

    if (!destinationCashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Le solde de la caisse de destination n'existe pas.",
      });
    }

    // Débiter le montant de la caisse source
    sourceCashRegisterBalance.amount = (parseFloat(sourceCashRegisterBalance.amount) - parseFloat(amount)).toFixed(0);
    await sourceCashRegisterBalance.save({ transaction });

    // Crédite le montant à la caisse destination
    destinationCashRegisterBalance.amount = (parseFloat(destinationCashRegisterBalance.amount) + parseFloat(amount)).toFixed(0);
    await destinationCashRegisterBalance.save({ transaction });

    // Commit de la transaction pour valider les changements
    await transaction.commit();

    return res.status(200).json({
      status: "success",
      message: `Transfert de ${amount} FCFA de la caisse source ${sourceCashRegister.name} vers la caisse ${destinationCashRegister.name} réussi.`,
    });
    
  } catch (error) {
    // Rollback de la transaction en cas d'erreur
    await transaction.rollback();
    console.error(`ERROR TRANSFERRING AMOUNT BETWEEN CASH REGISTERS: ${error}`);
    appendErrorLog(`ERROR TRANSFERRING AMOUNT BETWEEN CASH REGISTERS: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors du transfert entre les caisses.",
    });
  }
};

module.exports = { create, destroy, recharge, transferAmount };
