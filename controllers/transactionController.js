const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Customer, Merchant, CashRegister, Worker, CashRegisterBalance, CustomerBalance, Transaction, WorkerSession } = require("../models");
const { sequelize } = require("../models");
const { Op } = require("sequelize");
const admin = require("firebase-admin");
const { appendErrorLog } = require("../utils/logging");
const { generateTransactionCode } = require("../utils/transactionCodeGenerator");

const renderMonais = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    const { merchantId, cashRegisterId, phone, amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        status: "error",
        message: "Le montant est requis.",
      });
    }

    if (!cashRegisterId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la caisse est requis.",
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant du marchand est requis.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Le numéro de portable est requis.",
      });
    }

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
    const transactionCode = generateTransactionCode("SC");

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
        commission: 0,
      },
      { transaction }
    );

    // Commit de la transaction (valider les changements)
    await transaction.commit();

    // Envoyer une notification ou un SMS en fonction de la valeur de isMobile
    if (customer.isMobile === true) {
      // Envoi d'une notification via Firebase Cloud Messaging
      if (customer.token) {
        const message = {
          token: customer.token,
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
      }
    } else {
      // Envoi d'un SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);
      client.messages
        .create({
          body: `Vous avez reçu ${amount} FCFA de ${merchant.name}. Votre solde est de ${customerBalance.amount} FCFA. Transaction N° ${transactionCode}. Téléchargez l’application NYOTAPAY pour accéder à votre compte. 👉🏽 https://nyotapay.com/landingpage`,
          from: "NYOTAPAY",
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

const receiveMonais = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    const { merchantId, cashRegisterId, phone, amount, password } = req.body;

    if (!token) {
      return res.status(401).json({ status: "error", message: "Token non fourni." });
    }

    // Vérifie si l'en-tête commence par "Bearer "
    if (!token.startsWith("Bearer ")) {
      return res.status(401).json({ status: "error", message: "Format de token invalide." });
    }

    // Extrait le token en supprimant le préfixe "Bearer "
    const workerToken = token.substring(7);
    let decodedToken;

    try {
      decodedToken = jwt.verify(workerToken, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ status: "error", message: "TokenExpiredError" });
      }
      return res.status(401).json({ status: "error", message: "Token invalide." });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Le client doit saisir sont mot de passe afin de pouvoir comfirmer la transaction.",
      });
    }

    const workerId = decodedToken.id;
    const worker = await Worker.findByPk(workerId);
    if (!worker) {
      return res.status(400).json({ status: "error", message: "Ce compte utilisateur n'existe pas." });
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      return res.status(404).json({ status: "error", message: "Le marchand n'existe pas." });
    }

    const cashRegister = await CashRegister.findByPk(cashRegisterId);
    if (!cashRegister) {
      return res.status(404).json({ status: "error", message: "La caisse n'existe pas." });
    }

    const cashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: cashRegisterId },
      lock: transaction.LOCK.UPDATE, // Verrouiller la ligne pour la mise à jour
      transaction, // Inclure dans la transaction
    });

    if (!cashRegisterBalance) {
      return res.status(404).json({ status: "error", message: "Le solde de la caisse n'existe pas." });
    }

    const customer = await Customer.findOne({
      where: { phone },
      attributes: ["id", "phone", "firstName", "lastName", "token", "isMobile", "password"],
    });

    if (!customer) {
      return res.status(404).json({ status: "error", message: "Le client n'existe pas." });
    }

    if (!bcrypt.compareSync(password, customer.password)) {
      return res.status(400).json({ status: "error", message: "Mot de passe invalide ou ne correspond pas." });
    }

    const customerBalance = await CustomerBalance.findOne({
      where: { customerId: customer.id },
      lock: transaction.LOCK.UPDATE, // Verrouiller pour mise à jour
      transaction, // Inclure dans la transaction
    });

    if (!customerBalance) {
      return res.status(404).json({ status: "error", message: "Le solde du client n'existe pas." });
    }

    // Vérifier si le client a suffisamment de solde
    if (parseFloat(customerBalance.amount) < parseFloat(amount)) {
      return res.status(400).json({ status: "error", message: "Solde insuffisant pour le client." });
    }

    // Calculer la commission de 3,5% et l'arrondir à deux chiffres après la virgule
    const commissionRate = 0.035;
    const commission = (parseFloat(amount) * commissionRate).toFixed(2);

    // Montant final à transférer dans la caisse après déduction de la commission et arrondi
    const amountAfterCommission = (parseFloat(amount) - commission).toFixed(2);

    // Débiter le solde du client
    customerBalance.amount = (parseFloat(customerBalance.amount) - parseFloat(amount)).toFixed(2);
    await customerBalance.save({ transaction });

    // Crédite le solde de la caisse avec le montant après commission
    cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) + parseFloat(amountAfterCommission)).toFixed(2);
    await cashRegisterBalance.save({ transaction });

    // Générer un code de transaction
    const transactionCode = generateTransactionCode("RC"); // RC pour "Receive Cash"

    // Enregistrer la transaction
    await Transaction.create(
      {
        customerId: customer.id,
        merchantId: merchant.id,
        cashRegisterId: cashRegister.id,
        workerId: worker.id,
        type: "COLLECT",
        code: transactionCode,
        amount: amountAfterCommission,
        commission: commission,
      },
      { transaction }
    );

    // Commit de la transaction (valider les changements)
    await transaction.commit();

    // Envoyer une notification ou un SMS en fonction de la valeur de isMobile
    if (customer.isMobile === true) {
      // Envoi d'une notification via Firebase Cloud Messaging
      // Envoie de la notification uniquement si le client a un token
      if (customer.token) {
        const message = {
          token: customer.token,
          notification: {
            title: "Transaction réussie",
            body: `Vous avez envoyé ${amount} FCFA à ${merchant.name}. Votre solde restant est de ${customerBalance.amount} FCFA.`,
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
      }
    } else {
      // Envoi d'un SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);
      client.messages
        .create({
          body: `Vous avez envoyé ${amount} FCFA à ${merchant.name}. Transaction N° ${transactionCode}. Téléchargez l’application NYOTAPAY pour accéder à votre compte. 👉🏽 https://nyotapay.com/landingpage`,
          from: "NYOTAPAY",
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
    console.error(`ERROR TRANSFERRING MONEY TO CASHREGISTER: ${error}`);
    appendErrorLog(`ERROR TRANSFERRING MONEY TO CASHREGISTER: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la transaction.",
    });
  }
};

const updateTransactionAmount = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const token = req.headers.authorization;
    const { transactionId, newAmount } = req.body;

    if (!token) {
      return res.status(401).json({ status: "error", message: "Token non fourni." });
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
      return res.status(401).json({ status: "error", message: "Token invalide." });
    }

    const workerId = decodedToken.id;
    const worker = await Worker.findOne({ where: { id: workerId } });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Utilisateur non trouvé.",
      });
    }

    // Récupérer la transaction existante
    const existingTransaction = await Transaction.findByPk(transactionId, {
      transaction,
      include: [
        { model: CashRegister, attributes: ['id'] },
        { model: Customer, attributes: ['id', 'phone', 'firstName', 'lastName', 'isMobile', 'token'] }, // Inclure le token Firebase du client
      ]
    });

    if (!existingTransaction) {
      return res.status(404).json({
        status: "error",
        message: "Transaction non trouvée.",
      });
    }

    const { customerId, cashRegisterId, amount: oldAmount, createdAt, Customer: customer } = existingTransaction;

    // Vérifier si une session est déjà ouverte
    const existingSession = await WorkerSession.findOne({
      where: { workerId, endTime: null },
    });

    if (!existingSession) {
      return res.status(400).json({
        status: "error",
        message: "Aucune session en cours. Veuillez ouvrir une nouvelle session afin de modifier le montant.",
      });
    }

    const cashRegisterBalance = await CashRegisterBalance.findOne({
      where: { cashregisterId: cashRegisterId },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!cashRegisterBalance) {
      return res.status(404).json({
        status: "error",
        message: "Le solde de la caisse n'existe pas.",
      });
    }

    const customerBalance = await CustomerBalance.findOne({
      where: { customerId: customerId },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!customerBalance) {
      return res.status(404).json({
        status: "error",
        message: "Le solde du client n'existe pas.",
      });
    }

    // Déterminer si la transaction est de type 'SEND' ou 'COLLECT'
    const isSend = existingTransaction.type === 'SEND';

    // 1. Rembourser les anciens montants
    if (isSend) {
      // Pour SEND, on débite la caisse et crédite le client
      cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) + parseFloat(oldAmount)).toFixed(2);
      customerBalance.amount = (parseFloat(customerBalance.amount) - parseFloat(oldAmount)).toFixed(2);
    } else {
      // Pour COLLECT, on crédite la caisse et débite le client
      cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) - parseFloat(oldAmount)).toFixed(2);
      customerBalance.amount = (parseFloat(customerBalance.amount) + parseFloat(oldAmount)).toFixed(2);
    }

    // 2. Calculer le nouveau montant
    let newAmountAfterCommission = newAmount;
    let newCommission = 0;

    // Appliquer la commission de 3.5% uniquement pour les transactions de type 'COLLECT'
    if (!isSend) {
      const commissionRate = 0.035;
      newCommission = (parseFloat(newAmount) * commissionRate).toFixed(2);
      newAmountAfterCommission = (parseFloat(newAmount) - newCommission).toFixed(2);
    }

    // 3. Appliquer les nouveaux montants
    if (isSend) {
      // SEND: on débite la caisse et crédite le client
      cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) - parseFloat(newAmount)).toFixed(2);
      customerBalance.amount = (parseFloat(customerBalance.amount) + parseFloat(newAmount)).toFixed(2);
    } else {
      // COLLECT: on crédite la caisse et débite le client
      cashRegisterBalance.amount = (parseFloat(cashRegisterBalance.amount) + parseFloat(newAmountAfterCommission)).toFixed(2);
      customerBalance.amount = (parseFloat(customerBalance.amount) - parseFloat(newAmount)).toFixed(2);
    }

    // Sauvegarder les nouveaux soldes
    await cashRegisterBalance.save({ transaction });
    await customerBalance.save({ transaction });

    // Mettre à jour la transaction
    existingTransaction.initAmount = oldAmount; // Sauvegarder l'ancien montant
    existingTransaction.amount = newAmountAfterCommission; // Mettre à jour avec le nouveau montant après commission (si applicable)
    existingTransaction.commission = newCommission; // Mettre à jour la commission (si applicable)
    await existingTransaction.save({ transaction });

    // Commit de la transaction
    await transaction.commit();

    // Envoi de la notification ou du SMS au client
    if (customer.isMobile === true) {
      // Envoi d'une notification via Firebase Cloud Messaging
      if (customer.token) {
        const message = {
          token: customer.token,
          notification: {
            title: "Transaction modifiée",
            body: `Votre transaction a été modifiée à ${newAmount} FCFA. Votre nouveau solde est de ${customerBalance.amount} FCFA.`,
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
      }
    } else {
      // Envoi d'un SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require("twilio")(accountSid, authToken);
      client.messages
        .create({
          body: `Votre transaction a été modifiée à ${newAmount} FCFA. Transaction N° ${existingTransaction.code}. Votre nouveau solde est de ${customerBalance.amount} FCFA.`,
          from: "NYOTAPAY",
          to: `+242${customer.phone}`,
        })
        .then((message) => console.log("SMS envoyé:", message.sid))
        .catch((error) => {
          console.error("Erreur lors de l'envoi du SMS:", error);
        });
    }

    return res.status(200).json({
      status: "success",
      message: "Le montant de la transaction a été modifié avec succès.",
      data: {
        oldAmount,
        newAmount: newAmountAfterCommission,
        commission: newCommission,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`ERROR UPDATING TRANSACTION: ${error}`);
    appendErrorLog(`ERROR UPDATING TRANSACTION: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la modification de la transaction.",
    });
  }
};

const getSessionSummary = async (req, res) => {
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
      return res.status(401).json({ status: "error", message: "Token invalide." });
    }

    const workerId = decodedToken.id;
    const worker = await Worker.findOne({ where: { id: workerId } });

    if (!worker) {
      return res.status(404).json({
        status: "error",
        message: "Cet utilisateur n'existe pas.",
      });
    }

    // Récupérer la session de travail active (session sans endTime)
    const workerSession = await WorkerSession.findOne({
      where: {
        workerId: workerId,
        endTime: null,  // Session encore active
      },
    });

    if (!workerSession) {
      return res.status(404).json({
        status: "error",
        message: "Aucune session active trouvée pour cet utilisateur.",
      });
    }

    // Récupérer le montant initial à l'ouverture de la session
    const initialBalance = workerSession.initialBalance;

    // Récupérer toutes les transactions de la session courante
    const transactions = await Transaction.findAll({
      where: {
        workerId: workerId,
        cashRegisterId: workerSession.cashRegisterId,
        createdAt: {
          [Op.gte]: workerSession.startTime, // Après le début de la session
        },
      },
    });

    // Calculer les montants totaux
    const totalSend = transactions
      .filter(transaction => transaction.type === "SEND")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalCollect = transactions
      .filter(transaction => transaction.type === "COLLECT")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalCommission = transactions
      .reduce((sum, transaction) => sum + (transaction.commission || 0), 0);

    return res.status(200).json({
      status: "success",
      data: {
        initialBalance: formatAmount(initialBalance, false),
        totalSend: formatAmount(totalSend, false),
        totalCollect: formatAmount(totalCollect, false),
        totalCommission: formatAmount(totalCommission, true),
      },
    });
  } catch (error) {
    console.error(`ERROR GETTING SESSION SUMMARY: ${error}`);
    return res.status(500).json({
      status: "error",
      message: "Une erreur s'est produite lors de la récupération des informations de session.",
    });
  }
};

function formatAmount(amount, keepDecimals) {
  if (keepDecimals) {
    return parseFloat(amount.toFixed(2));
  }
  return Math.round(amount); // Retourne l'entier le plus proche
}


module.exports = { renderMonais, receiveMonais, updateTransactionAmount, getSessionSummary };
