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

const mockNotifClient = {
  emit: jest.fn(),
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
});
