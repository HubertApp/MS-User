import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';
import { UsersRepository } from '../../src/users/repository/users.repository';
import { CreateUserInput } from '../../src/users/dto/create-user.input';
import { UpdateUserInput } from '../../src/users/dto/update-user.input';
import { User } from '../../src/users/entities/user.entity';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

const makeCreateInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => ({
  googleId: 'google-123',
  email: 'test@example.com',
  age: 25,
  pseudo: 'testuser',
  role: 'user',
  ...overrides,
});

// ─────────────────────────────────────────────
// Mock repository
// ─────────────────────────────────────────────
const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// emit() doit renvoyer un Observable (ou assimilé) avec .subscribe() : sans
// ça sendNotification() catch silencieusement une TypeError et les
// assertions sur le payload publié ne servent à rien.
const mockSubscribe = jest.fn();
const mockNotifClient = {
  emit: jest.fn().mockReturnValue({ subscribe: mockSubscribe }),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: 'NOTIF_SERVICE', useValue: mockNotifClient },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─────────────────────────────────────────────
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────
  describe('create', () => {
    it('should create and return a new user when he does not exist', async () => {
      const input = makeCreateInput();
      const created = makeUser();

      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(created);

      const result = await service.create(input);

      expect(result).toEqual(created);
      expect(mockRepo.findById).toHaveBeenCalledWith(input.googleId);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: input.googleId,
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        }),
      );
    });

    it('should return existing user without creating when he already exists', async () => {
      const input = makeCreateInput();
      const existing = makeUser({ email: 'existing@example.com' });

      mockRepo.findById.mockResolvedValue(existing);

      const result = await service.create(input);

      expect(result).toEqual(existing);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should set created_at and updated_at on new user', async () => {
      const input = makeCreateInput({ googleId: 'new-google' });
      const before = new Date();

      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUser());

      await service.create(input);

      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.created_at).toBeInstanceOf(Date);
      expect(callArg.updated_at).toBeInstanceOf(Date);
      expect(callArg.created_at.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ─────────────────────────────────────────────
  // syncProfile() est privée, testée via create() quand l'utilisateur existe
  // déjà (chemin emprunté par getMe et createUser à chaque login Google).
  describe('create -> syncProfile (utilisateur existant)', () => {
    it('should patch only pseudo/email/photo when provided, never age/role', async () => {
      const existing = makeUser({
        pseudo: 'old-pseudo',
        email: 'old@example.com',
        age: 40,
        role: 'admin',
      });
      const input = makeCreateInput({
        pseudo: 'new-pseudo',
        email: 'new@example.com',
        photo: 'https://example.com/photo.jpg',
        age: 99,
        role: 'user',
      } as any);

      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue({ ...existing, ...input });

      await service.create(input);

      expect(mockRepo.update).toHaveBeenCalledWith(
        existing.googleId,
        expect.objectContaining({
          pseudo: 'new-pseudo',
          email: 'new@example.com',
          photo: 'https://example.com/photo.jpg',
          updated_at: expect.any(Date),
        }),
      );
      const patch = mockRepo.update.mock.calls[0][1];
      expect(patch).not.toHaveProperty('age');
      expect(patch).not.toHaveProperty('role');
    });

    it('should not erase photo in DB when input omits it (e.g. getMe)', async () => {
      const existing = makeUser({ photo: 'https://example.com/existing.jpg' } as any);
      const input = makeCreateInput({ pseudo: 'same-ish' });
      delete (input as any).photo;

      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(existing);

      await service.create(input);

      const patch = mockRepo.update.mock.calls[0][1];
      expect(patch).not.toHaveProperty('photo');
    });

    it('should not call repository.update at all when nothing changed (falsy fields)', async () => {
      const existing = makeUser();
      const input = makeCreateInput();
      delete (input as any).pseudo;
      delete (input as any).email;
      delete (input as any).photo;

      mockRepo.findById.mockResolvedValue(existing);

      const result = await service.create(input);

      expect(mockRepo.update).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('should fall back to the existing user when update returns null', async () => {
      const existing = makeUser();
      const input = makeCreateInput({ pseudo: 'changed' });

      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.update.mockResolvedValue(null);

      const result = await service.create(input);

      expect(result).toEqual(existing);
    });
  });

  // ─────────────────────────────────────────────
  // sendNotification() est privée, déclenchée uniquement à la création d'un
  // nouvel utilisateur. Couvre le bug corrigé cette session : user_id
  // manquant dans le payload + emit() jamais subscribe() (Observable froid).
  describe('create -> sendNotification (nouvel utilisateur)', () => {
    it('should publish user_created with user_id (required by MS-notifications dispatch)', async () => {
      const input = makeCreateInput({ googleId: 'google-new', email: 'new@test.com', pseudo: 'newbie' });
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUser({ googleId: 'google-new', email: 'new@test.com', pseudo: 'newbie' }));

      await service.create(input);

      expect(mockNotifClient.emit).toHaveBeenCalledWith(
        'user_created',
        expect.objectContaining({
          user_id: 'google-new',
          email: 'new@test.com',
          pseudo: 'newbie',
          subject: expect.any(String),
          template: 'welcome',
        }),
      );
    });

    it('should subscribe to the emitted Observable (emit() alone publishes nothing)', async () => {
      const input = makeCreateInput({ googleId: 'google-new' });
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUser({ googleId: 'google-new' }));

      await service.create(input);

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Function) }),
      );
    });

    it('should not publish when the new user has no email', async () => {
      const input = makeCreateInput({ googleId: 'google-new', email: undefined as any });
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeUser({ googleId: 'google-new', email: undefined as any }));

      await service.create(input);

      expect(mockNotifClient.emit).not.toHaveBeenCalled();
    });

    it('should not throw and should still return the created user if publishing fails synchronously', async () => {
      const input = makeCreateInput({ googleId: 'google-new' });
      const created = makeUser({ googleId: 'google-new' });
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(created);
      mockNotifClient.emit.mockImplementationOnce(() => {
        throw new Error('broker unreachable');
      });

      const result = await service.create(input);

      expect(result).toEqual(created);
    });
  });

  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return user when found', async () => {
      const user = makeUser();
      mockRepo.findById.mockResolvedValue(user);

      const result = await service.findOne('google-123');

      expect(result).toEqual(user);
      expect(mockRepo.findById).toHaveBeenCalledWith('google-123');
    });

    it('should return "Utilisateur non trouvé" when not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findOne('unknown');

      expect(result).toBe(false);
    });

    it('should handle undefined googleId', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const result = await service.findOne(undefined);

      expect(result).toBe(false);
      expect(mockRepo.findById).toHaveBeenCalledWith(undefined);
    });
  });

  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        makeUser({ googleId: 'g1' }),
        makeUser({ googleId: 'g2' }),
      ];
      mockRepo.findAll.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no users', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      mockRepo.findAll.mockRejectedValue(new Error('DB error'));

      await expect(service.findAll()).rejects.toThrow('DB error');
    });
  });

  // ─────────────────────────────────────────────
  describe('update', () => {
    it('should return success message when user exists', async () => {
      const input: UpdateUserInput = { email: 'new@example.com' };
      mockRepo.update.mockResolvedValue(makeUser());

      const result = await service.update('google-123', input);

      expect(result).toBe('Utilisateur mis à jour avec succès');
      expect(mockRepo.update).toHaveBeenCalledWith(
        'google-123',
        expect.objectContaining({ updated_at: expect.any(Date) }),
      );
    });

    it('should return "Utilisateur non trouvé" when user does not exist', async () => {
      mockRepo.update.mockResolvedValue(null);

      const result = await service.update('unknown', { email: 'x@x.com' });

      expect(result).toBe('Utilisateur non trouvé');
    });

    it('should return "Utilisateur non trouvé" for undefined googleId', async () => {
      mockRepo.update.mockResolvedValue(null);

      const result = await service.update(undefined, { email: 'x@x.com' });

      expect(result).toBe('Utilisateur non trouvé');
    });

    it('should set updated_at before calling repository', async () => {
      const before = new Date();
      mockRepo.update.mockResolvedValue(makeUser());

      await service.update('google-123', { age: 30 });

      const callArg = mockRepo.update.mock.calls[0][1];
      expect(callArg.updated_at).toBeInstanceOf(Date);
      expect(callArg.updated_at.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should return success message after deletion', async () => {
      mockRepo.delete.mockResolvedValue(true);

      const result = await service.remove('google-123');

      expect(result).toBe('Utilisateur supprimé avec succès');
      expect(mockRepo.delete).toHaveBeenCalledWith('google-123');
    });

    it('should propagate repository errors', async () => {
      mockRepo.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.remove('google-123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  // ─────────────────────────────────────────────
  describe('updateNotificationPreferences', () => {
    it('should persist a valid list of disabled channels', async () => {
      mockRepo.update.mockResolvedValue(makeUser());

      await service.updateNotificationPreferences('google-123', ['EMAIL', 'IN_APP']);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'google-123',
        expect.objectContaining({
          notificationChannelsDisabled: ['EMAIL', 'IN_APP'],
          updated_at: expect.any(Date),
        }),
      );
    });

    it('should silently drop unknown channel values (defends against typos)', async () => {
      mockRepo.update.mockResolvedValue(makeUser());

      await service.updateNotificationPreferences('google-123', ['EMAIL', 'SMS_TYPO']);

      const patch = mockRepo.update.mock.calls[0][1];
      expect(patch.notificationChannelsDisabled).toEqual(['EMAIL']);
    });

    it('should deduplicate repeated channel values', async () => {
      mockRepo.update.mockResolvedValue(makeUser());

      await service.updateNotificationPreferences('google-123', ['EMAIL', 'EMAIL']);

      const patch = mockRepo.update.mock.calls[0][1];
      expect(patch.notificationChannelsDisabled).toEqual(['EMAIL']);
    });

    it('should throw when the user does not exist', async () => {
      mockRepo.update.mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences('unknown', ['EMAIL']),
      ).rejects.toThrow('Utilisateur non trouvé');
    });
  });
});
