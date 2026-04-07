import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('should return "Utilisateur non trouvé" when user is not found', () => {
    const result = service.findOne(999);
    expect(result).toBe('Utilisateur non trouvé');
  });

  // test('should return user when user is found', () => {
  //   const newUser = {
  //     id: 1,
  //     email: 'test@test.fr',
  //     username: 'testuser',
  //     age: 30,
  //     handicape: false,
  //   };
  //   service.create(newUser);
  //   const result = service.findOne(1);
  //   expect(result).toEqual(newUser);
  // });

  test('should create a new user', () => {
    const newUser = {
      id: 2,
      email: 'test@test.fr',
      username: 'testuser2',
      age: 25,
      handicape: true,
    };
    const result = service.create(newUser);
    expect(result).toEqual(newUser);
  });

  // test('should return all users', () => {
  //   const newUser = {
  //     id: 2,
  //     email: 'test@test.fr',
  //     username: 'testuser2',
  //     age: 25,
  //     handicape: true,
  //   };
  //   service.create(newUser);
  //   const users = service.findAll();
  //   expect(users).toBeGreaterThan(0);
  // });
});
