# Utiliser l'image de base Node.js version 18
FROM node:18-alpine

# Créer un répertoire pour l'application
WORKDIR /app

# Copier les fichiers de l'application dans l'image
COPY package*.json ./

# Installer les dépendances de l'application
RUN npm install

# Installer PM2 et Sequelize-CLI globalement
RUN npm install pm2 -g
RUN npm install sequelize-cli -g

# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port utilisé par l'application à l'intérieur du conteneur (selon le fichier .env)
EXPOSE 6880

# Script de démarrage : exécuter migrations, seeders et lancer l'application avec PM2
CMD ["sh", "-c", "npx sequelize-cli db:migrate --env production && npx sequelize-cli db:seed:all --env production && pm2 start app.js --env production"]
