import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AdminGuard } from '../../src/users/guards/admin-auth.guard';
import { ForbiddenException } from '../../src/users/exception/forbidden.exception';
import { UnauthorizedException } from '../../src/users/exception/unauthorized.exception';

const makeContext = (headers: Record<string, string | undefined>) => ({
  req: { headers },
});

const makeMockExecutionContext = (): ExecutionContext =>
  ({
    switchToHttp: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getType: jest.fn(),
  }) as any;

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockGqlCtx: { getContext: jest.Mock };
  let executionContext: ExecutionContext;

  beforeEach(() => {
    guard = new AdminGuard();
    mockGqlCtx = { getContext: jest.fn() };
    executionContext = makeMockExecutionContext();
    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(mockGqlCtx as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Admin access', () => {
    it('should allow a user whose role is ADMIN', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({
          'x-auth-state': 'VALID',
          'x-user-id': 'google-admin',
          'x-user-role': 'ADMIN',
        }),
      );

      expect(guard.canActivate(executionContext)).toBe(true);
    });

    it('should populate req.user through the parent guard', () => {
      const ctx = makeContext({
        'x-auth-state': 'VALID',
        'x-user-id': 'google-admin',
        'x-user-role': 'ADMIN',
        'x-user-email': 'admin@example.com',
      });
      mockGqlCtx.getContext.mockReturnValue(ctx);

      guard.canActivate(executionContext);

      expect((ctx.req as any).user).toMatchObject({
        googleId: 'google-admin',
        role: 'ADMIN',
        email: 'admin@example.com',
      });
    });
  });

  describe('Insufficient rights', () => {
    it('should throw a 403 FORBIDDEN for a standard user', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({
          'x-auth-state': 'VALID',
          'x-user-id': 'google-123',
          'x-user-role': 'USER',
        }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should carry the FORBIDDEN code and a 403 status', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({
          'x-auth-state': 'VALID',
          'x-user-id': 'google-123',
          'x-user-role': 'USER',
        }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        expect.objectContaining({
          extensions: expect.objectContaining({
            code: 'FORBIDDEN',
            http: { status: 403 },
          }),
        }) as unknown as Error,
      );
    });

    it('should reject the default role assigned when the header is absent', () => {
      // FederatedAuthGuard retombe sur 'USER' quand x-user-role manque :
      // l'absence d'en-tête ne doit pas ouvrir l'accès admin.
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': 'google-123' }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        ForbiddenException,
      );
    });

    it('should be case-sensitive on the role value', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({
          'x-auth-state': 'VALID',
          'x-user-id': 'google-123',
          'x-user-role': 'admin',
        }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Authentication comes first', () => {
    it('should throw 401 rather than 403 when no identity is supplied', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-user-role': 'ADMIN' }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw 401 for an invalid auth state even with an ADMIN role', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({
          'x-auth-state': 'EXPIRED',
          'x-user-id': 'google-admin',
          'x-user-role': 'ADMIN',
        }),
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        'Token invalide',
      );
    });
  });
});
