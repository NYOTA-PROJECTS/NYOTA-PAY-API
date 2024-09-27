const moment = require('moment');
const crypto = require('crypto');

const generateTransactionCode = (transactionType) => {
  // Vérifier le type de transaction
  if (!['SC', 'RC'].includes(transactionType)) {
    throw new Error('Type de transaction invalide. Utilisez "envoi" ou "retrait".');
  }

  const now = moment();
  const date = now.format('YYMMDD');
  const time = now.format('HHmmss');

  // Générer un code aléatoire de longueur 8
  const randomCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Assembler le code complet
  const transactionCode = `TX-${transactionType.toUpperCase()}${date}.${time}.${randomCode}`;

  return transactionCode;
};

module.exports = { generateTransactionCode };
