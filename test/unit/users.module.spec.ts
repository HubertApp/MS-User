import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

// Couvre le fallback RABBITMQ_URL corrigé cette session
// ('amqp://null' -> 'amqp://rabbitmq:5672') : sans lui, un pod dont le
// secret ne fournirait pas encore RABBITMQ_URL au démarrage ne pourrait
// jamais publier vers RabbitMQ, silencieusement.
//
// process.env.RABBITMQ_URL est lu une seule fois, au chargement du module
// (ClientsModule.register() n'est pas ré-évalué à la demande) -- comme dans
// la vraie appli (un pod ne change pas ses env vars après démarrage). Donc
// jest.resetModules() + require() dynamique est nécessaire pour forcer une
// relecture entre les deux scénarios de ce fichier.
describe('UsersModule (RABBITMQ_URL fallback)', () => {
  const ORIGINAL_ENV = process.env.RABBITMQ_URL;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.RABBITMQ_URL;
    } else {
      process.env.RABBITMQ_URL = ORIGINAL_ENV;
    }
  });

  async function compileModuleWithFreshEnv(): Promise<TestingModule> {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { UsersModule } = require('../../src/users/users.module');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { UserMongooseSchema } = require('../../src/users/schema/user.schema');

    return Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(getModelToken(UserMongooseSchema.name))
      .useValue({})
      .compile();
  }

  it('should fall back to amqp://rabbitmq:5672 when RABBITMQ_URL is not set', async () => {
    delete process.env.RABBITMQ_URL;

    const module = await compileModuleWithFreshEnv();
    const notifClient = module.get('NOTIF_SERVICE') as any;

    expect(notifClient.options.urls).toEqual(['amqp://rabbitmq:5672']);

    await module.close();
  });

  it('should use RABBITMQ_URL from the environment when provided', async () => {
    process.env.RABBITMQ_URL = 'amqp://custom-host:5672';

    const module = await compileModuleWithFreshEnv();
    const notifClient = module.get('NOTIF_SERVICE') as any;

    expect(notifClient.options.urls).toEqual(['amqp://custom-host:5672']);

    await module.close();
  });
});
