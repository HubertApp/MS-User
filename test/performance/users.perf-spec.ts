// Débit de UsersService.create() (login/création + resync de profil) mesuré
// sous charge, tout mocké côté I/O pour rester déterministe en CI. Pour un
// test de charge HTTP réel contre une instance qui tourne, voir
// scripts/load-test.mjs (pattern MS-notifications).
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';
import { UsersRepository } from '../../src/users/repository/users.repository';
import { CreateUserInput } from '../../src/users/dto/create-user.input';
import { User } from '../../src/users/entities/user.entity';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SIMULATED_DB_READ_LATENCY_MS = 5;
const SIMULATED_DB_WRITE_LATENCY_MS = 5;
const SIMULATED_BROKER_PUBLISH_LATENCY_MS = 5;

const makeUser = (overrides: Partial<User> = {}): User => ({
  googleId: 'google-123',
  email: 'test@example.com',
  age: 25,
  pseudo: 'testuser',
  role: 'user',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

describe('MS-User (performance)', () => {
  describe('débit de create() -- nouveaux utilisateurs (findById miss + create + sendNotification)', () => {
    let service: UsersService;
    let mockRepo: any;
    let mockNotifClient: any;

    beforeEach(async () => {
      mockRepo = {
        findById: jest.fn(async () => {
          await delay(SIMULATED_DB_READ_LATENCY_MS);
          return null;
        }),
        create: jest.fn(async (input: CreateUserInput) => {
          await delay(SIMULATED_DB_WRITE_LATENCY_MS);
          return makeUser({ googleId: input.googleId, email: input.email });
        }),
        update: jest.fn(),
        findAll: jest.fn(),
        delete: jest.fn(),
      };
      mockNotifClient = {
        emit: jest.fn(() => ({
          subscribe: jest.fn(async ({ complete }: any = {}) => {
            await delay(SIMULATED_BROKER_PUBLISH_LATENCY_MS);
            complete?.();
          }),
        })),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          { provide: UsersRepository, useValue: mockRepo },
          { provide: 'NOTIF_SERVICE', useValue: mockNotifClient },
        ],
      }).compile();

      service = module.get(UsersService);
    });

    it('shouldSustainHighThroughputWhenCreatingManyNewUsersConcurrently', async () => {
      const CONCURRENCY = 300;

      const start = Date.now();
      await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, i) =>
          service.create({
            googleId: `google-${i}`,
            email: `user${i}@example.com`,
            age: 25,
            pseudo: `user${i}`,
            role: 'user',
          }),
        ),
      );
      const elapsedMs = Date.now() - start;

      // create() attend findById puis create() (2 accès DB séquentiels), la
      // publication vers NOTIF_SERVICE est fire-and-forget (non-bloquante,
      // voir sendNotification()) donc ne doit pas s'ajouter à la latence.
      const maxAcceptableMs =
        CONCURRENCY * (SIMULATED_DB_READ_LATENCY_MS + SIMULATED_DB_WRITE_LATENCY_MS) * 10;
      expect(elapsedMs).toBeLessThan(maxAcceptableMs);
      expect(mockRepo.create).toHaveBeenCalledTimes(CONCURRENCY);
    }, 20000);

    it('shouldNotBlockUserCreationOnNotificationPublishing', async () => {
      // Publication bloquée indéfiniment (broker en carafe) : create() doit
      // quand même retourner vite, car sendNotification() est fire-and-forget.
      mockNotifClient.emit.mockReturnValue({
        subscribe: () => new Promise(() => undefined),
      });

      const start = Date.now();
      const user = await service.create({
        googleId: 'google-stuck-notif',
        email: 'stuck@example.com',
        age: 25,
        pseudo: 'stuck',
        role: 'user',
      });
      const elapsedMs = Date.now() - start;

      expect(user).toBeDefined();
      expect(elapsedMs).toBeLessThan(200);
    }, 10000);
  });

  describe('débit de create() -- utilisateurs existants (syncProfile à chaque login)', () => {
    let service: UsersService;
    let mockRepo: any;

    beforeEach(async () => {
      mockRepo = {
        findById: jest.fn(async (googleId: string) => {
          await delay(SIMULATED_DB_READ_LATENCY_MS);
          return makeUser({ googleId });
        }),
        update: jest.fn(async (googleId: string, patch: any) => {
          await delay(SIMULATED_DB_WRITE_LATENCY_MS);
          return makeUser({ googleId, ...patch });
        }),
        create: jest.fn(),
        findAll: jest.fn(),
        delete: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UsersService,
          { provide: UsersRepository, useValue: mockRepo },
          { provide: 'NOTIF_SERVICE', useValue: { emit: jest.fn(() => ({ subscribe: jest.fn() })) } },
        ],
      }).compile();

      service = module.get(UsersService);
    });

    it('shouldSustainHighThroughputOfProfileResyncOnRepeatedLogins', async () => {
      const CONCURRENCY = 500;

      const start = Date.now();
      await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, i) =>
          service.create({
            googleId: `google-${i}`,
            email: `user${i}@example.com`,
            age: 25,
            pseudo: `user${i}-resynced`,
            role: 'user',
          }),
        ),
      );
      const elapsedMs = Date.now() - start;
      const opsPerSecond = (CONCURRENCY / elapsedMs) * 1000;

      expect(opsPerSecond).toBeGreaterThan(200);
      expect(mockRepo.update).toHaveBeenCalledTimes(CONCURRENCY);
    }, 20000);
  });
});
