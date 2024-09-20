const jwt = require("jsonwebtoken");
const {
  Customer,
  Merchant,
  CashRegister,
  Worker,
  CashRegisterBalance,
  CustomerBalance,
  Transaction,
} = require("../models");
const { sequelize } = require("../models");
const admin = require("firebase-admin");
const { appendErrorLog } = require("../utils/logging");
const {
  generateTransactionCode,
} = require("../utils/transactionCodeGenerator");

const renderMonais = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    const { merchantId, cashRegisterId, phone, amount } = req.body;
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
    const workerToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(workerToken, process.env.JWT_SECRET);
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
      return res.status(400).json({
        status: "error",
        message: "Ce compte utilisateur n'existe pas.",
      });
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res
        .status(404)
        .json({ status: "error", message: "Le marchand n'existe pas." });
    }

    const cashRegister = await CashRegister.findByPk(cashRegisterId);
    if (!cashRegister) {
      return res
        .status(404)
        .json({ status: "error", message: "La caisse n'existe pas." });
    }

    const cashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: cashRegisterId },
      lock: transaction.LOCK.UPDATE, // Assurer que la ligne est verrouillée pour mise à jour
      transaction, // Inclure dans la transaction
    });

    if (!cashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Le solde de la caisse n'existe pas.",
      });
    }

    // Vérifier si la caisse a suffisamment de solde
    if (parseFloat(cashRegisterBalance.amount) < parseFloat(amount)) {
      return res.status(400).json({
        status: "error",
        message: "Solde insuffisant dans la caisse.",
      });
    }

    const customer = await Customer.findOne({
      where: { phone },
      attributes: ["id", "phone", "firstName", "lastName", "token", "isMobile"],
    });
    if (!customer) {
      return res
        .status(404)
        .json({ status: "error", message: "Le client n'existe pas." });
    }

    const customerBalance = await CustomerBalance.findOne({
      where: { customerId: customer.id },
      lock: transaction.LOCK.UPDATE, // Verrouiller pour mise à jour
      transaction, // Inclure dans la transaction
    });

    if (!customerBalance) {
      return res
        .status(404)
        .json({ status: "error", message: "Le solde du client n'existe pas." });
    }

    // Débiter le solde de la caisse
    cashRegisterBalance.amount = parseFloat(cashRegisterBalance.amount) - parseFloat(amount);
    await cashRegisterBalance.save({ transaction });

    // Crédite le solde du client
    customerBalance.amount = parseFloat(customerBalance.amount) + parseFloat(amount);
    await customerBalance.save({ transaction });

    // Générer un code de transaction
    const transactionCode = generateTransactionCode("EV");

    // Enregistrer la transaction
    await Transaction.create(
      {
        customerId: customer.id,
        merchantId: merchant.id,
        cashRegisterId: cashRegister.id,
        workerId: worker.id,
        type: "SEND",
        code: transactionCode,
        amount: amount,
      },
      { transaction }
    );

    // Commit de la transaction (valider les changements)
    await transaction.commit();

    // Envoyer une notification ou un SMS en fonction de la valeur de isMobile
    if (customer.isMobile === true) {
      // Envoi d'une notification via Firebase Cloud Messaging
      const message = {
        token: customer.token, // Token Firebase du client
        notification: {
          title: "Transaction réussie",
          body: `Vous avez reçu ${amount} FCFA de ${merchant.name}. Votre solde est de ${customerBalance.amount} FCFA.`,
        },
      };

      admin
        .messaging()
        .send(message)
        .then((response) => {
          console.log("Notification envoyée:", response);
        })
        .catch((error) => {
          console.error("Erreur lors de l'envoi de la notification:", error);
        });
    } else {
      // Envoi d'un SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);
      client.messages
        .create({
          body: `Vous avez reçu ${amount} FCFA de ${merchant.name}. Votre solde est de ${customerBalance.amount} FCFA. Transaction N° ${transactionCode}. Téléchargez l’application NYOTAPAY pour accéder à votre compte.\n👉🏽 https://nyotapay.com/landingpage`,
          from: "+18302613361",
          to: `+242${customer.phone}`,
        })
        .then((message) => console.log("SMS envoyé:", message.sid))
        .catch((error) => {
          console.error("Erreur lors de l'envoi du SMS:", error);
        });
    }

    return res.status(200).json({
      status: "success",
      message: "Transaction effectuée avec succès.",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR GIVEN MONEY TO CUSTOMER: ${error}`);
    appendErrorLog(`ERROR GIVEN MONEY TO CUSTOMER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la transaction d'envoie.",
    });
  }
};

module.exports = { renderMonais };
