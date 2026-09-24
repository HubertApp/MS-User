import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersRepository } from '../../src/users/repository/users.repository';
import { UserMongooseSchema } from '../../src/users/schema/user.schema';

const mockDoc = {
  googleId: 'google-123',
  email: 'test@example.com',
  age: 25,
  pseudo: 'testuser',
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
} as any;

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let MockModel: any;

  beforeEach(async () => {
    const mockSave = jest.fn().mockResolvedValue(mockDoc);
    MockModel = jest.fn().mockImplementation(() => ({ save: mockSave }));
    MockModel.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
    MockModel.find = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue([mockDoc]) });
    MockModel.findOneAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });
    MockModel.findOneAndDelete = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        {
          provide: getModelToken(UserMongooseSchema.name),
          useValue: MockModel,
        },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a new document', async () => {
      const result = await repository.create({
        googleId: 'google-new',
        email: 'new@test.com',
      });

      expect(result).toEqual(mockDoc);
      expect(MockModel).toHaveBeenCalledWith({
        googleId: 'google-new',
        email: 'new@test.com',
      });
    });
  });

  describe('findById', () => {
    it('should find user by googleId', async () => {
      const result = await repository.findById('google-123');

      expect(result).toEqual(mockDoc);
      expect(MockModel.findOne).toHaveBeenCalledWith({
        googleId: 'google-123',
      });
    });

    it('should return null when not found', async () => {
      MockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findById('unknown');

      expect(result).toBeNull();
    });

    it('should propagate DB errors', async () => {
      MockModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await expect(repository.findById('google-123')).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all documents', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([mockDoc]);
      expect(MockModel.find).toHaveBeenCalledWith();
    });

    it('should return empty array when no documents', async () => {
      MockModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update and return updated document', async () => {
      const result = await repository.update('google-123', {
        email: 'updated@test.com',
      });

      expect(result).toEqual(mockDoc);
      // $set : voir mongoose-base.repository.ts -- sans lui, findOneAndUpdate
      // remplacerait tout le document au lieu de ne mettre à jour que les
      // champs fournis.
      expect(MockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { googleId: 'google-123' },
        { $set: { email: 'updated@test.com' } },
        { new: true },
      );
    });

    it('should return null when user not found', async () => {
      MockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.update('unknown', { email: 'x@x.com' });

      expect(result).toBeNull();
    });

    it('should use new: true to return updated document', async () => {
      await repository.update('google-123', { age: 30 });

      expect(MockModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ new: true }),
      );
    });
  });

  describe('delete', () => {
    it('should return true when user deleted', async () => {
      const result = await repository.delete('google-123');

      expect(result).toBe(true);
      expect(MockModel.findOneAndDelete).toHaveBeenCalledWith({
        googleId: 'google-123',
      });
    });

    it('should return false when user not found', async () => {
      MockModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.delete('unknown');

      expect(result).toBe(false);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockDoc);
      expect(MockModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should return null when email not found', async () => {
      MockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repository.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  describe('upsertFavourite', () => {
    const favourite = {
      title: 'Maison',
      departure: { latitude: 48.85, longitude: 2.35, label: 'Paris' },
    };
    const updateResult = (matchedCount: number) => ({
      exec: jest.fn().mockResolvedValue({ matchedCount }),
    });

    it('should update in place when a favourite with this title exists', async () => {
      MockModel.updateOne = jest.fn().mockReturnValueOnce(updateResult(1));

      const result = await repository.upsertFavourite('google-123', favourite);

      expect(result).toBe('updated');
      expect(MockModel.updateOne).toHaveBeenCalledTimes(1);
      const [filter, update] = MockModel.updateOne.mock.calls[0];
      expect(filter).toEqual({
        googleId: 'google-123',
        'favourites.title': 'Maison',
      });
      expect(update.$set['favourites.$.departure']).toEqual(
        favourite.departure,
      );
      expect(update.$set['favourites.$.arrival']).toBeNull();
      // created_at ne doit pas être écrasé lors d'une mise à jour
      expect(update.$set).not.toHaveProperty('favourites.$.created_at');
    });

    it('should push a new favourite with server-side dates otherwise', async () => {
      MockModel.updateOne = jest
        .fn()
        .mockReturnValueOnce(updateResult(0))
        .mockReturnValueOnce(updateResult(1));

      const result = await repository.upsertFavourite('google-123', {
        ...favourite,
        created_at: new Date('2000-01-01'),
      });

      expect(result).toBe('added');
      const [filter, update] = MockModel.updateOne.mock.calls[1];
      expect(filter).toEqual({
        googleId: 'google-123',
        'favourites.title': { $ne: 'Maison' },
      });
      const pushed = update.$push.favourites;
      expect(pushed.title).toBe('Maison');
      expect(pushed.created_at).toBeInstanceOf(Date);
      expect(pushed.created_at.getFullYear()).not.toBe(2000);
      expect(pushed.updated_at).toBe(pushed.created_at);
    });

    it('should return null when the user does not exist', async () => {
      MockModel.updateOne = jest.fn().mockReturnValue(updateResult(0));

      await expect(
        repository.upsertFavourite('unknown', favourite),
      ).resolves.toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  describe('removeFavourite', () => {
    it('should return true when the favourite was pulled', async () => {
      MockModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      });

      await expect(
        repository.removeFavourite('google-123', 'Maison'),
      ).resolves.toBe(true);
      expect(MockModel.updateOne.mock.calls[0][1].$pull).toEqual({
        favourites: { title: 'Maison' },
      });
    });

    it('should return false when the user exists but not the favourite', async () => {
      MockModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
      });
      MockModel.exists = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'x' }),
      });

      await expect(
        repository.removeFavourite('google-123', 'Inconnu'),
      ).resolves.toBe(false);
    });

    it('should return null when the user does not exist', async () => {
      MockModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 0 }),
      });
      MockModel.exists = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        repository.removeFavourite('unknown', 'Maison'),
      ).resolves.toBeNull();
    });
  });
});
