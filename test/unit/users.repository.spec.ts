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
      expect(MockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { googleId: 'google-123' },
        { email: 'updated@test.com' },
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
});
