/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { FederatedAuthGuard } from '../../src/users/guards/federated-auth.guard';
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
  }) as any;

describe('FederatedAuthGuard', () => {
  let guard: FederatedAuthGuard;
  let mockGqlCtx: { getContext: jest.Mock };
  let executionContext: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FederatedAuthGuard],
    }).compile();

    guard = module.get<FederatedAuthGuard>(FederatedAuthGuard);
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

  describe('Valid authentication', () => {
    it('should return true when auth state is VALID and user ID is present', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': 'google-123' }),
      );
      expect(guard.canActivate(executionContext)).toBe(true);
    });

    it('should return true when no auth state header but user ID is present', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-user-id': 'google-123' }),
      );
      expect(guard.canActivate(executionContext)).toBe(true);
    });

    it('should call GqlExecutionContext.create with execution context', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': 'google-123' }),
      );
      guard.canActivate(executionContext);
      expect(GqlExecutionContext.create).toHaveBeenCalledWith(executionContext);
    });
  });

  describe('Invalid token', () => {
    it('should throw "Token invalide" for INVALID auth state', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'INVALID', 'x-user-id': 'google-123' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Token invalide',
      );
    });

    it('should throw "Token invalide" for EXPIRED auth state', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'EXPIRED', 'x-user-id': 'google-123' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Token invalide',
      );
    });

    it('should throw UnauthorizedException instance', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'INVALID' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        UnauthorizedException,
      );
    });

    it('should check auth state before user ID', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'INVALID' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Token invalide',
      );
    });
  });

  describe('Missing user ID', () => {
    it('should throw "Connexion requise !" when x-user-id is absent', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Connexion requise !',
      );
    });

    it('should throw "Connexion requise !" when x-user-id is empty string', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': '' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Connexion requise !',
      );
    });

    it('should throw "Connexion requise !" for uppercase headers', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'X-USER-ID': 'google-123', 'X-AUTH-STATE': 'VALID' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Connexion requise !',
      );
    });
  });

  describe('Edge cases', () => {
    it('should throw when headers are null', () => {
      mockGqlCtx.getContext.mockReturnValue({ req: { headers: null } });
      expect(() => guard.canActivate(executionContext)).toThrow();
    });

    it('should allow whitespace-only user ID', () => {
      mockGqlCtx.getContext.mockReturnValue(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': '   ' }),
      );
      expect(guard.canActivate(executionContext)).toBe(true);
    });

    it('should reject then allow on consecutive calls', () => {
      mockGqlCtx.getContext.mockReturnValueOnce(
        makeContext({ 'x-auth-state': 'INVALID' }),
      );
      expect(() => guard.canActivate(executionContext)).toThrow(
        'Token invalide',
      );

      mockGqlCtx.getContext.mockReturnValueOnce(
        makeContext({ 'x-auth-state': 'VALID', 'x-user-id': 'google-123' }),
      );
      expect(guard.canActivate(executionContext)).toBe(true);
    });
  });
});
