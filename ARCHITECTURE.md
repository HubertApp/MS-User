# MS-User — fonctionnement

Microservice NestJS responsable du profil utilisateur (création, lecture, mise à jour, suppression), exposé en GraphQL fédéré (Apollo).

## 1. Publication de l'événement `user_created`

À la création d'un nouveau compte (`UsersService.create()`, branche "utilisateur inexistant"), `sendNotification()` publie un événement `user_created` sur RabbitMQ (queue `notifications_queue`), consommé par MS-notifications pour envoyer l'e-mail de bienvenue.

Points à connaître :

- **Connexion** : `users.module.ts` lit `RABBITMQ_URL` (défaut `amqps://user:password@rabbitmq:5671`, cohérent avec `k8s/00-rabbitmq-notifications.yaml` et le pattern déjà utilisé par MS-notifications). En TLS (`amqps://`), le certificat CA du broker est chargé depuis `RABBITMQ_CA_PATH` (défaut `/etc/rabbitmq-tls/ca.pem`, monté depuis le secret `rabbitmq-tls`) et passé en `socketOptions.ca` — sans ça, la connexion échoue avec `SELF_SIGNED_CERT_IN_CHAIN`.
- **Payload requis** : MS-notifications ne déclenche l'envoi que si `user_id` ET `email` sont présents (voir `ms-notifications.controller.ts`) — `sendNotification()` renvoie donc sans rien publier si l'un des deux manque.
- **`emit()` est un Observable froid** : sans `.subscribe()`, rien n'est publié du tout (piège classique NestJS/RxJS). C'est fire-and-forget par design : une erreur de publication ne doit jamais faire échouer la création du compte, déjà persistée à ce stade — elle est seulement loguée en `warn`.

## 2. Sécurité : `removeUser` et `updateUser` ne prennent pas de `googleId`

Ces deux mutations n'acceptent volontairement aucun `googleId` en argument GraphQL. L'identité de l'utilisateur ciblé vient uniquement de `@CurrentUser()`, résolu côté serveur à partir du header `x-user-id` (posé par le gateway après vérification du JWT) — exactement comme `getMe`.

Accepter un `googleId` fourni par le client permettrait à n'importe quel utilisateur authentifié de modifier ou supprimer le compte de quelqu'un d'autre (IDOR). C'était le cas de `removeUser` avant correctif.

## 3. Mise à jour partielle en base

`MongooseBaseRepository.update()` enveloppe toujours le patch dans `{ $set: item }`. Sans ce `$set`, `findOneAndUpdate` remplace le document entier par l'objet fourni — les champs absents du patch seraient perdus, pas seulement ignorés.

## 4. Resynchronisation du profil (`pseudo`/`email`/`photo`)

Voir la section "Modèle utilisateur" du `README.md` pour le détail du comportement de `syncProfile()` (appelé par `getMe` et `createUser`).
