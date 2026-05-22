FROM node:22-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production

# Copier le code source
COPY . .

# Utiliser un utilisateur non-root
USER node

EXPOSE 4002

CMD ["node", "server.js"]
