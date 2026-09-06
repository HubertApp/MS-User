# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Cache BuildKit sur ~/.npm : les tarballs déjà téléchargés sont réutilisés
# d'un build à l'autre même quand package-lock.json change, au lieu de tout
# retélécharger depuis le registre à chaque fois (lent depuis le daemon
# docker de minikube).
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

EXPOSE 3001
# start:dev (nest start --watch) tourne le compilateur TS + les file watchers
# en continu : bien plus lourd en RAM qu'un simple `node dist/main.js`, et le
# hot-reload n'a aucun intérêt pour un déploiement k8s. dist/ est déjà buildé
# ci-dessus (RUN npm run build) mais n'était jamais utilisé jusqu'ici.
CMD ["npm", "run", "start:prod"]
