import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { UsersResolver } from '../../src/users/users.resolver';
import { UsersService } from '../../src/users/users.service';
import { UsersRepository } from '../../src/users/repository/users.repository';
import { FederatedAuthGuard } from '../../src/users/guards/federated-auth.guard';

const graphqlEndpoint = '/graphql';

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

describe('Users integration tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: {
            path: 'user-schema.gql',
            federation: 2,
          },
          sortSchema: true,
          playground: false,
          path: graphqlEndpoint,
          context: ({ req }) => ({ req }),
        }),
      ],
      providers: [
        UsersResolver,
        UsersService,
        FederatedAuthGuard,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: 'NOTIF_SERVICE', useValue: mockNotifClient },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user via createUser mutation', async () => {
    const userInput = {
      googleId: 'google-123',
      email: 'test@example.com',
      age: 25,
      pseudo: 'testuser',
      role: 'user',
    };

    mockRepo.findById.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      ...userInput,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const mutation = `
      mutation CreateUser($input: CreateUserInput!) {
        createUser(createUserInput: $input) {
          googleId
          email
          age
          pseudo
          role
          created_at
          updated_at
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .send({ query: mutation, variables: { input: userInput } })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.createUser).toMatchObject({
      googleId: 'google-123',
      email: 'test@example.com',
      age: 25,
      pseudo: 'testuser',
      role: 'user',
    });
    expect(mockRepo.findById).toHaveBeenCalledWith('google-123');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        googleId: 'google-123',
        email: 'test@example.com',
      }),
    );
  });

  it('should return the authenticated user via getMe query', async () => {
    const userPayload = {
      googleId: 'google-123',
      email: 'me@example.com',
      pseudo: 'meuser',
      age: 30,
      role: 'user',
    };

    mockRepo.findById.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      ...userPayload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const query = `
      query {
        getMe {
          googleId
          email
          pseudo
          age
          role
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .set('x-auth-state', 'VALID')
      .set('x-user-id', userPayload.googleId)
      .set('x-user-email', userPayload.email)
      .set('x-user-pseudo', userPayload.pseudo)
      .set('x-user-age', String(userPayload.age))
      .set('x-user-role', userPayload.role)
      .send({ query })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.getMe).toMatchObject({
      googleId: userPayload.googleId,
      email: userPayload.email,
      pseudo: userPayload.pseudo,
      age: userPayload.age,
      role: userPayload.role,
    });
    expect(mockRepo.findById).toHaveBeenCalledWith(userPayload.googleId);
  });

  it('should return an empty list from findAll query when there are no users', async () => {
    mockRepo.findAll.mockResolvedValue([]);

    const query = `
      query {
        findAll {
          googleId
          email
          age
          pseudo
          role
        }
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .send({ query })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.findAll).toEqual([]);
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('should update the authenticated user via updateUser mutation', async () => {
    const userPayload = {
      googleId: 'google-123',
      email: 'me@example.com',
      pseudo: 'meuser',
      age: 30,
      role: 'user',
    };

    const updateInput = {
      email: 'updated@example.com',
      pseudo: 'updateduser',
    };

    mockRepo.update.mockResolvedValue({
      ...userPayload,
      ...updateInput,
      updated_at: new Date().toISOString(),
    });

    const mutation = `
      mutation UpdateUser($input: UpdateUserInput!) {
        updateUser(updateUserInput: $input)
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .set('x-auth-state', 'VALID')
      .set('x-user-id', userPayload.googleId)
      .set('x-user-email', userPayload.email)
      .set('x-user-pseudo', userPayload.pseudo)
      .set('x-user-age', String(userPayload.age))
      .set('x-user-role', userPayload.role)
      .send({ query: mutation, variables: { input: updateInput } })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.updateUser).toBe('Utilisateur mis à jour avec succès');
    expect(mockRepo.update).toHaveBeenCalledWith(
      userPayload.googleId,
      expect.objectContaining({
        email: updateInput.email,
        pseudo: updateInput.pseudo,
        updated_at: expect.any(Date),
      }),
    );
  });

  it('should remove the current user via removeUser mutation (no googleId argument)', async () => {
    mockRepo.delete.mockResolvedValue(true);

    const mutation = `
      mutation RemoveUser {
        removeUser
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .set('x-auth-state', 'VALID')
      .set('x-user-id', 'google-123')
      .set('x-user-email', 'me@example.com')
      .set('x-user-pseudo', 'meuser')
      .set('x-user-age', '30')
      .set('x-user-role', 'user')
      .send({ query: mutation })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.removeUser).toBe('Utilisateur supprimé avec succès');
    // L'identité supprimée vient uniquement du header x-user-id (JWT), jamais
    // d'un argument GraphQL fourni par le client — voir ARCHITECTURE.md §2.
    expect(mockRepo.delete).toHaveBeenCalledWith('google-123');
  });

  it('should ignore any client-supplied googleId and only remove the authenticated user', async () => {
    mockRepo.delete.mockResolvedValue(true);

    // La mutation n'expose plus aucun argument : un googleId envoyé dans les
    // variables de la requête est simplement ignoré par le serveur GraphQL.
    const mutation = `
      mutation RemoveUser {
        removeUser
      }
    `;

    const response = await request(app.getHttpServer())
      .post(graphqlEndpoint)
      .set('x-auth-state', 'VALID')
      .set('x-user-id', 'google-123')
      .set('x-user-email', 'me@example.com')
      .set('x-user-pseudo', 'meuser')
      .set('x-user-age', '30')
      .set('x-user-role', 'user')
      .send({ query: mutation, variables: { googleId: 'victim-id' } })
      .expect(200);

    expect(response.body.errors).toBeUndefined();
    expect(mockRepo.delete).toHaveBeenCalledWith('google-123');
    expect(mockRepo.delete).not.toHaveBeenCalledWith('victim-id');
  });
});
