FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001
# start:dev (nest start --watch) tourne le compilateur TS + les file watchers
# en continu : bien plus lourd en RAM qu'un simple `node dist/main.js`, et le
# hot-reload n'a aucun intérêt pour un déploiement k8s. dist/ est déjà buildé
# ci-dessus (RUN npm run build) mais n'était jamais utilisé jusqu'ici.
CMD ["npm", "run", "start:prod"]
