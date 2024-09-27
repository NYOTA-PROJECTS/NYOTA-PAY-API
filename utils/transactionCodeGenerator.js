const moment = require('moment');
const crypto = require('crypto');

const generateTransactionCode = (transactionType) => {
  
  if (!['SC', 'RC'].includes(transactionType)) {
    throw new Error('Type de transaction invalide. Utilisez "envoi" ou "retrait".');
  }

  const now = moment();
  const date = now.format('YYMMDD');
  const time = now.format('HHmmss');

  const randomCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Assembler le code complet
  const transactionCode = `TX-${transactionType.toUpperCase()}${date}.${time}.${randomCode}`;

  return transactionCode;
};

module.exports = { generateTransactionCode };
