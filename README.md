# MS-User

Microservice de gestion du profil utilisateur de la plateforme HubertApp, écrit en TypeScript avec NestJS 11. Il expose un sous-graphe GraphQL fédéré (Apollo Federation 2) sur le port `3001`, persiste les profils dans MongoDB via Mongoose et publie un événement RabbitMQ à chaque création de compte. C'est le service qui détient la source de vérité de l'entité `User`, alimentée par MS-Auth au moment du login.

## Architecture générale

`src/main.ts` démarre le SDK OpenTelemetry avant toute autre chose, puis construit l'application Nest sur un `ExpressAdapter` explicite. Cette construction en deux temps permet de monter le même handler Express derrière deux serveurs : un serveur HTTP sur `PORT` (3001 par défaut) toujours actif, et un serveur HTTPS sur `HTTPS_PORT` (3444 par défaut) démarré uniquement si `TLS_CERT_PATH` et `TLS_KEY_PATH` sont tous deux renseignés. Le TLS est donc optionnel et se contrôle par la seule présence des variables.

`AppModule` assemble le module OpenTelemetry (`nestjs-otel`, métriques host activées), le `ConfigModule` global, le `GraphQLModule` en driver `ApolloFederationDriver` avec génération automatique du schéma dans `user-schema.gql`, la connexion Mongoose pilotée par `MONGO_URL`, et enfin `UsersModule` qui porte tout le domaine.

Le code métier suit une séparation en trois couches. `UsersResolver` expose l'API GraphQL et applique les gardes, `UsersService` porte les règles (création ou resynchronisation, publication de l'événement de bienvenue), et `UsersRepository` encapsule l'accès Mongo. Ce dernier hérite de `MongooseBaseRepository`, une classe abstraite générique implémentant l'interface `IRepository<T>` (`findAll`, `findById`, `create`, `update`, `delete`) et réutilisable pour d'autres collections ; `UsersRepository` n'y ajoute que `findByEmail`. Toutes les recherches se font par `googleId`, qui sert de clé fonctionnelle du service — c'est aussi la clé de fédération déclarée par `@key(fields: "googleId")` sur l'entité `User`.

## Modèle de données

Le document Mongo (`UserMongooseSchema`) porte `googleId` (requis et unique), `email` (unique), `age`, `pseudo`, `photo`, `role`, `created_at` et `updated_at`. Le type GraphQL de sortie est `GetUserResponse`, qui expose exactement les mêmes champs ; l'entrée est `CreateUserInput` et sa version partielle `UpdateUserInput`. Le champ `photo` contient l'URL de la photo de profil Google transmise par MS-Auth lors du login.

Le fichier `user-schema.gql` versionné dans le dépôt est un artefact généré en retard sur le code : il ne contient ni le champ `photo` ni la directive `@inaccessible` posée sur `createUser`. Il est réécrit à chaque démarrage de l'application.

## API GraphQL

`createUser(createUserInput)` est le point d'entrée appelé par MS-Auth à chaque connexion. Il est annoté `@Directive('@inaccessible')`, ce qui le retire du schéma composé par la gateway : il n'est donc joignable qu'en service-à-service sur le réseau interne, jamais par un client externe. Sa sémantique est « créer ou resynchroniser » et non une simple insertion.

`getMe` renvoie le profil de l'appelant en s'appuyant sur la même méthode `create()` du service, ce qui garantit qu'un utilisateur authentifié par la gateway possède toujours une ligne en base même si la création initiale avait échoué. `getOne` renvoie également le profil de l'appelant mais en lecture seule, et `findOne(googleId)` permet d'aller chercher un profil arbitraire. `findAll` liste tous les utilisateurs.

`updateUser(updateUserInput)` et `removeUser()` n'acceptent volontairement aucun argument `googleId`. L'identité de la cible provient uniquement du décorateur `@CurrentUser()`, résolu côté serveur à partir de l'en-tête `x-user-id`. Ce choix est documenté au paragraphe 2 de `ARCHITECTURE.md` : accepter un identifiant fourni par le client permettrait à tout utilisateur authentifié de modifier ou supprimer le compte d'un autre (faille de type IDOR, qui a réellement existé sur `removeUser` avant correctif). Un test unitaire dédié verrouille ce comportement.

Chaque resolver est décoré par `@Span()` de `nestjs-otel`, ce qui crée une span nommée par opération dans les traces.

## Création et resynchronisation du profil

`UsersService.create()` commence par chercher l'utilisateur par `googleId`. S'il n'existe pas, les horodatages sont posés, le document est créé, puis l'événement de bienvenue est publié. S'il existe déjà, la méthode privée `syncProfile()` prend le relais : elle construit un patch contenant uniquement les champs `pseudo`, `email` et `photo` effectivement fournis en entrée, et ne déclenche une écriture que si ce patch n'est pas vide.

Cette sélectivité est importante en pratique. Le contexte de `getMe` provient des en-têtes propagés par la gateway, qui ne transportent pas la photo ; sans ce filtrage, chaque appel à `getMe` effacerait la photo déjà enregistrée. Les champs `age` et `role` ne sont jamais réécrits par ce mécanisme et restent pilotés par l'application via `updateUser`.

Côté repository, `update()` enveloppe systématiquement le patch dans `{ $set: item }`. Sans cet opérateur, `findOneAndUpdate` remplacerait le document entier par l'objet fourni et les champs absents du patch seraient perdus plutôt qu'ignorés.

## Événement `user_created`

À la création d'un compte — et uniquement dans ce cas — `sendNotification()` publie un message `user_created` sur la queue RabbitMQ `notifications_queue`, consommé par MS-Notifications pour l'envoi de l'e-mail de bienvenue. Le payload transporte `user_id`, `email`, `pseudo`, un sujet et le nom de template `welcome` ; la publication est abandonnée silencieusement si `googleId` ou `email` manquent, MS-Notifications exigeant ces deux champs pour déclencher l'envoi.

La connexion est déclarée dans `users.module.ts` via `ClientsModule.register()` en transport RMQ. L'URL vient de `RABBITMQ_URL`, dont la valeur par défaut est en TLS (`amqps://user:password@rabbitmq:5671`) ; dans ce cas le certificat CA du broker est lu depuis `RABBITMQ_CA_PATH` (`/etc/rabbitmq-tls/ca.pem` par défaut) et passé en `socketOptions.ca`, faute de quoi la connexion échoue avec `SELF_SIGNED_CERT_IN_CHAIN`.

Deux subtilités méritent d'être connues avant de toucher à ce code. D'abord, `emit()` renvoie un Observable froid : sans `.subscribe()`, rien n'est publié — c'est un piège classique de NestJS avec RxJS. Ensuite, la publication est volontairement en fire-and-forget : l'erreur éventuelle est seulement journalisée en `warn`, car le compte est déjà persisté à ce stade et un broker indisponible ne doit pas faire échouer l'inscription.

## Authentification

Le service ne vérifie aucune signature JWT lui-même. `FederatedAuthGuard` lit les en-têtes `x-auth-state`, `x-user-id`, `x-user-email`, `x-user-pseudo`, `x-user-role` et `x-user-age` positionnés par la gateway après validation du jeton émis par MS-Auth ; il rejette la requête si l'état est différent de `VALID` ou si l'identifiant est absent, puis reconstruit l'objet `user` sur la requête. Le décorateur `@CurrentUser()` effectue la même extraction pour l'injecter directement en paramètre de resolver. `UnauthorizedException` produit une `GraphQLError` portant le code `UNAUTHENTICATED` et un statut HTTP 401. Le modèle de confiance repose entièrement sur le fait que ces en-têtes ne soient pas positionnables depuis l'extérieur du réseau interne.

## Observabilité

`src/otel-setup.ts` configure un `NodeSDK` avec exporteurs OTLP/gRPC pour les traces et les métriques, pointant sur `OTEL_EXPORTER_OTLP_ENDPOINT`. Contrairement à MS-Auth, ce service utilise `getNodeAutoInstrumentations()`, ce qui instrumente automatiquement l'ensemble des bibliothèques reconnues — utile ici puisque Mongo et AMQP sont dans la boucle, au prix d'une installation de dépendances nettement plus lourde. Une instrumentation GraphQL explicite s'y ajoute. Les conteneurs portent des labels Promtail pour l'agrégation des logs.

## Configuration

| Variable | Rôle |
| --- | --- |
| `PORT` | Port HTTP, `3001` par défaut |
| `HTTPS_PORT` | Port HTTPS, `3444` par défaut, utilisé seulement si le TLS est configuré |
| `TLS_CERT_PATH` / `TLS_KEY_PATH` | Certificat et clé ; le serveur HTTPS ne démarre que si les deux sont présents |
| `MONGO_URL` | URI Mongo, `mongodb://localhost:27017/hubertapp_users` par défaut |
| `RABBITMQ_URL` | URL du broker, `amqps://user:password@rabbitmq:5671` par défaut |
| `RABBITMQ_CA_PATH` | CA du broker en mode `amqps://`, `/etc/rabbitmq-tls/ca.pem` par défaut |
| `MONGO_USER` / `MONGO_PASS` | Identifiants d'accès à l'interface mongo-express du compose |
| `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` | Configuration OpenTelemetry |

## Démarrage en local (hors Docker)

Node.js 20 est la version cible, celle du `Dockerfile` et des workflows CI. L'installation se fait avec `npm ci` pour respecter le lockfile.

```bash
npm ci
npm run start:dev
```

Un point de vigilance avant le premier lancement : la valeur par défaut de `RABBITMQ_URL` étant en `amqps://`, `users.module.ts` tente de lire le certificat CA **au chargement du module**. Si le fichier n'existe pas — ce qui est le cas sur un poste de développement — l'application plante au démarrage sur un `ENOENT`. Il faut donc définir une URL en clair dans le `.env`, même si aucun broker ne tourne :

```dotenv
PORT=3001
MONGO_URL=mongodb://localhost:27017/hubertapp_users
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

Une instance MongoDB doit être joignable à l'URL configurée ; le plus simple en local est de lancer uniquement le conteneur Mongo du compose (`docker compose up mongodb-user`) et de pointer `MONGO_URL` sur `mongodb://localhost:27003/hubertapp_users`, le port publié par ce service. Pour un lancement compilé, proche de ce que ferait un déploiement :

```bash
npm run build
npm run start:prod
```

Dans les deux cas le playground Apollo est disponible sur `http://localhost:3001/graphql` et `user-schema.gql` est régénéré au démarrage. Si aucun collector OpenTelemetry n'écoute, l'exporteur journalisera des erreurs de connexion sans empêcher le service de fonctionner.

## Démarrage avec Docker

Le `Dockerfile` part de `node:20-alpine`, installe les dépendances avec `npm ci`, compile le projet, expose le port 3001 et démarre en `npm run start:prod` — contrairement à MS-Auth, l'image est donc bien configurée pour un usage compilé. Le `.dockerignore` exclut `node_modules`, `dist`, les tests et le compose du contexte de build.

Le `docker-compose.yml` s'appuie sur le réseau externe partagé par la plateforme, à créer une seule fois :

```bash
docker network create hubert-network
docker compose up --build
```

Trois conteneurs sont démarrés. `mongodb-user` porte la base, avec un volume `mongo_data` pour la persistance et le port publié sur `27003` côté hôte. `mongo-express` fournit une interface d'exploration sur `http://localhost:8081`, protégée par `MONGO_USER` et `MONGO_PASS` qui doivent être définis dans un `.env` à la racine. `service-user` est l'application elle-même, publiée sur `localhost:3001` et configurée pour joindre Mongo, RabbitMQ et le collector OTLP par leurs noms DNS internes.

Le nom de service `mongodb-user` n'est pas anodin : Compose ajoute toujours le nom du service comme alias DNS, et MS-Admin déclare de son côté un service `mongodb` sur le même réseau. Avec un alias partagé, Docker résolvait en round-robin et les deux bases — l'une sans authentification, l'autre avec — se répondaient mutuellement une fois sur deux.

Ce compose ne démarre ni RabbitMQ, ni le collector, ni la gateway : ces composants doivent tourner par ailleurs sur `hubert-network` pour que la chaîne complète fonctionne. Sans broker, le service démarre normalement et les publications d'événements échouent en `warn`. Pour construire ou lancer l'image sans compose :

```bash
docker build -t ms-user .
docker run --rm -p 3001:3001 --env-file .env --network hubert-network ms-user
```

## Tests

Les tests unitaires vivent dans `test/unit/` et couvrent les quatre briques du service. `users.service.spec.ts` est le plus riche : il vérifie la création, la resynchronisation `pseudo`/`email`/`photo` lors d'un login répété, le fait qu'un `getMe` sans photo n'efface pas celle déjà en base, la présence de `user_id` dans le payload publié, l'absence d'événement lorsque l'utilisateur existait déjà, et le fait que l'inscription réussit même si la publication échoue. `users.repository.spec.ts` couvre la couche Mongo mockée, `users.resolver.spec.ts` inclut la régression IDOR sur `removeUser`, et `federated-auth.guard.spec.ts` teste le garde en profondeur, y compris les cas limites (en-têtes nuls, identifiant vide, casse des en-têtes).

Les tests d'intégration (`test/integration/integration.spec.ts`) montent un vrai module GraphQL fédéré avec repository et client RabbitMQ mockés, et interrogent le endpoint par supertest. Ils sont exécutés par `npm test` au même titre que les tests unitaires, la configuration Jest du `package.json` captant tous les fichiers `*.spec.ts` sous `test/` et `src/`. La couverture est collectée sur `src/` en excluant les modules, DTO, schémas et le setup OpenTelemetry.

```bash
npm test              # unitaires + intégration
npm run test:cov      # avec couverture
npm run test:e2e      # configuration dédiée aux fichiers *.e2e-spec.ts
```

Le fichier `test/app.e2e-spec.ts` est un reliquat du squelette NestJS : il attend `Hello World!` sur `/`, route qui n'existe pas dans ce service. Il n'est pas capté par `npm test` mais échouera sous `npm run test:e2e`, qui est par ailleurs le seul à le cibler.

## Intégration continue

Le `Makefile` centralise la validation : `make validate` enchaîne `npm ci`, `npm run lint` et `npm test -- --coverage`. Sur les branches de travail, `ci-work-branches.yaml` se limite à cette cible. Sur `main` et `develop`, `ci-dev-main-branches.yaml` rejoue la passe qualité puis, uniquement sur push, construit l'image Docker et la publie sur Docker Hub sous les tags `service-user:latest` et `service-user:<sha>`. Les étapes SonarCloud sont présentes mais commentées, tout comme la cible `sonar` du Makefile.
