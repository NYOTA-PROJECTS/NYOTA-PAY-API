const moment = require('moment');
const crypto = require('crypto');

const generateTransactionCode = (transactionType) => {
  // Vérifier le type de transaction
  if (!['SC', 'RC'].includes(transactionType)) {
    throw new Error('Type de transaction invalide. Utilisez "envoi" ou "retrait".');
  }

  // Obtenir la date et l'heure actuelles
  const now = moment();
  const date = now.format('YYMMDD'); // Format de la date : 240813
  const time = now.format('HHmmss'); // Format de l'heure : 134526

  // Générer un code aléatoire de longueur 8
  const randomCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caractères aléatoires

  // Assembler le code complet
  const transactionCode = `TX-${transactionType.toUpperCase()}${date}.${time}.${randomCode}`;

  return transactionCode;
};

module.exports = { generateTransactionCode };
