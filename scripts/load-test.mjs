// Outil MANUEL de test de charge HTTP réel, à lancer contre une instance de
// MS-User qui tourne vraiment (local, docker-compose, Minikube...).
// Contrairement à test/performance/*.perf-spec.ts (déterministe, tout mocké,
// exécuté en CI), ce script tape sur de vraies requêtes GraphQL (getMe, donc
// le chemin complet create()/syncProfile() + repository + Mongo) et mesure
// le débit/latence réels.
//
// Usage :
//   MS_USER_URL=http://localhost:3000/graphql \
//   LOAD_TEST_USER_ID=user-load-test \
//   npm run test:load
//
// Nécessite que le service tourne et que la base soit accessible. Les
// headers x-user-* imitent ceux posés par le routeur/gateway après
// vérification d'un vrai token (voir federated-auth.guard.ts) ; en usage
// normal ils ne sont jamais fournis par le client.
import autocannon from 'autocannon';

const url = process.env.MS_USER_URL || 'http://localhost:3000/graphql';
const userId = process.env.LOAD_TEST_USER_ID || 'user-load-test';
const durationSeconds = Number(process.env.LOAD_TEST_DURATION_S || 15);
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || 20);

const query = {
  query: 'query GetMe { getMe { googleId email pseudo age role } }',
};

console.log(`Cible : ${url}`);
console.log(`Durée : ${durationSeconds}s, connexions simultanées : ${connections}`);
console.log('---');

const instance = autocannon(
  {
    url,
    method: 'POST',
    connections,
    duration: durationSeconds,
    headers: {
      'content-type': 'application/json',
      'x-auth-state': 'VALID',
      'x-user-id': userId,
      'x-user-email': `${userId}@example.com`,
      'x-user-pseudo': userId,
      'x-user-age': '25',
      'x-user-role': 'user',
    },
    body: JSON.stringify(query),
  },
  (err) => {
    if (err) {
      console.error('Erreur pendant le test de charge :', err);
      process.exit(1);
    }
  },
);

autocannon.track(instance, { renderProgressBar: true });

process.once('SIGINT', () => {
  instance.stop();
});
