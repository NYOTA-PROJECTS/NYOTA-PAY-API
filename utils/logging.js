const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');
const logFilePath = path.join(logsDir, 'errors.log');
const maxLines = 1000;

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const appendErrorLog = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Lire le fichier existant
  let logs = [];
  if (fs.existsSync(logFilePath)) {
    logs = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);
  }

  // Ajouter le nouveau message
  logs.push(logMessage);

  // Conserver uniquement les dernières lignes jusqu'à maxLines
  if (logs.length > maxLines) {
    logs = logs.slice(logs.length - maxLines);
  }

  // Écrire les logs dans le fichier
  fs.writeFileSync(logFilePath, logs.join('\n'));
};

module.exports = { appendErrorLog };