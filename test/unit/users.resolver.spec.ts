import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from '../../src/users/users.resolver';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/entities/user.entity';

const makeUser = (overrides: Partial<User> = {}): User => ({
  googleId: 'google-123',
  email: 'test@example.com',
  age: 25,
  pseudo: 'testuser',
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const makeCurrentUser = (overrides = {}) => ({
  googleId: 'google-123',
  email: 'test@example.com',
  pseudo: 'testuser',
  age: 25,
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  updateNotificationPreferences: jest.fn(),
};

describe('UsersResolver', () => {
  let resolver: UsersResolver;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: mockService },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getMe', () => {
    it('should return user matching current user googleId', async () => {
      const user = makeUser();
      mockService.create.mockResolvedValue(user);

      const result = await resolver.getMe(makeCurrentUser() as any);

      expect(result).toEqual(user);

      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'google-123',
          email: 'test@example.com',
          pseudo: 'testuser',
          age: 25,
          role: 'user',
          created_at: expect.any(Date),
          updated_at: expect.any(Date),
        }),
      );
    });

    it('should return "Utilisateur non trouvé" when user not found', async () => {
      mockService.create.mockResolvedValue(false);

      const result = await resolver.getMe(makeCurrentUser() as any);

      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create and return user', async () => {
      const input = { googleId: 'google-new', email: 'new@test.com' } as any;
      const created = makeUser({ googleId: 'google-new' });
      mockService.create.mockResolvedValue(created);

      const result = await resolver.createUser(input);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(input);
    });

    it('should return existing user if already exists', async () => {
      const existing = makeUser();
      mockService.create.mockResolvedValue(existing);

      const result = await resolver.createUser({
        googleId: 'google-123',
      } as any);

      expect(result).toEqual(existing);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        makeUser({ googleId: 'g1' }),
        makeUser({ googleId: 'g2' }),
      ];
      mockService.findAll.mockResolvedValue(users);

      const result = await resolver.findAll();

      expect(result).toEqual(users);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no users', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await resolver.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by googleId', async () => {
      const user = makeUser();
      mockService.findOne.mockResolvedValue(user);

      const result = await resolver.findOne('google-123');

      expect(result).toEqual(user);
      expect(mockService.findOne).toHaveBeenCalledWith('google-123');
    });

    it('should return error message when not found', async () => {
      mockService.findOne.mockResolvedValue(false);

      const result = await resolver.findOne('unknown');

      expect(result).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should call service update with current user googleId', async () => {
      mockService.update.mockResolvedValue(
        'Utilisateur mis à jour avec succès',
      );

      const result = await resolver.updateUser(
        makeCurrentUser() as any,
        { email: 'new@test.com' } as any,
      );

      expect(result).toBe('Utilisateur mis à jour avec succès');
      expect(mockService.update).toHaveBeenCalledWith(
        'google-123',
        expect.objectContaining({ email: 'new@test.com' }),
      );
    });
  });

  describe('removeUser', () => {
    // Pas d'argument googleId (voir guards/current-user.decorator.ts) :
    // l'identité vient uniquement de @CurrentUser(), jamais d'un argument
    // client, sinon un utilisateur authentifié pourrait supprimer le compte
    // de quelqu'un d'autre en fournissant son googleId (IDOR).
    it('should return success message using the current user googleId, not a client-supplied one', async () => {
      mockService.remove.mockResolvedValue('Utilisateur supprimé avec succès');

      const result = await resolver.removeUser(makeCurrentUser() as any);

      expect(result).toBe('Utilisateur supprimé avec succès');
      expect(mockService.remove).toHaveBeenCalledWith('google-123');
    });

    it('should never be callable with a raw googleId argument (no such parameter exists)', () => {
      expect(resolver.removeUser.length).toBe(1);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should use the current user googleId, not a client-supplied one', async () => {
      mockService.updateNotificationPreferences.mockResolvedValue(
        makeUser({ notificationChannelsDisabled: ['EMAIL'] } as any),
      );

      const result = await resolver.updateNotificationPreferences(
        makeCurrentUser() as any,
        ['EMAIL'],
      );

      expect(mockService.updateNotificationPreferences).toHaveBeenCalledWith(
        'google-123',
        ['EMAIL'],
      );
      expect(result.notificationChannelsDisabled).toEqual(['EMAIL']);
    });

    it('should never be callable with a raw googleId argument (only disabledChannels + current user)', () => {
      expect(resolver.updateNotificationPreferences.length).toBe(2);
    });
  });
});
