import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  optionalAuth,
  requireOwnership,
  validateGitHubToken,
  authErrorHandler,
} from '@/middleware/auth';
import { AuthService } from '@/services/auth';

// Mock dependencies
vi.mock('@/services/auth');

const mockedAuthService = vi.mocked(AuthService);

// Helper function to create mock request/response
const createMockReqRes = () => {
  const req = {
    headers: {},
    params: {},
    body: {},
    user: undefined,
    token: undefined,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
};

const mockUser = {
  id: 'user-123',
  githubId: '12345',
  username: 'testuser',
  email: 'test@example.com',
  avatarUrl: 'https://github.com/avatar.jpg',
  accessToken: 'github-token',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer valid-token';

      mockedAuthService.getUserFromToken.mockResolvedValueOnce(mockUser);

      await authenticateToken(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe('valid-token');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const { req, res, next } = createMockReqRes();

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'MISSING_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer invalid-token';

      mockedAuthService.getUserFromToken.mockResolvedValueOnce(null);

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authentication service errors', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer error-token';

      mockedAuthService.getUserFromToken.mockRejectedValueOnce(new Error('Service error'));

      await authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        details: 'Service error',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer header correctly', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer test-token-123';

      mockedAuthService.getUserFromToken.mockResolvedValueOnce(mockUser);

      await authenticateToken(req, res, next);

      expect(mockedAuthService.getUserFromToken).toHaveBeenCalledWith('test-token-123');
      expect(req.token).toBe('test-token-123');
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token when provided', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer valid-token';

      mockedAuthService.getUserFromToken.mockResolvedValueOnce(mockUser);

      await optionalAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe('valid-token');
      expect(next).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      const { req, res, next } = createMockReqRes();

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer invalid-token';

      mockedAuthService.getUserFromToken.mockRejectedValueOnce(new Error('Invalid token'));

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access when user owns resource', () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;
      req.params.userId = 'user-123';

      const middleware = requireOwnership('userId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access when user does not own resource', () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;
      req.params.userId = 'different-user-id';

      const middleware = requireOwnership('userId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access denied: You can only access your own resources',
        code: 'ACCESS_DENIED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const { req, res, next } = createMockReqRes();
      req.params.userId = 'user-123';

      const middleware = requireOwnership('userId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing resource user ID', () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;

      const middleware = requireOwnership('userId');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Resource user ID not found',
        code: 'MISSING_USER_ID',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should check ownership from request body', () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;
      req.body.userId = 'user-123';

      const middleware = requireOwnership('userId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateGitHubToken', () => {
    it('should validate GitHub token successfully', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;

      mockedAuthService.getGitHubUser.mockResolvedValueOnce({
        id: 12345,
        login: 'testuser',
        email: 'test@example.com',
        avatar_url: 'https://github.com/avatar.jpg',
        name: 'Test User',
      });

      await validateGitHubToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject when user has no GitHub token', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = { ...mockUser, accessToken: null };

      await validateGitHubToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'GitHub access token not found',
        code: 'MISSING_GITHUB_TOKEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when GitHub token is invalid', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;

      mockedAuthService.getGitHubUser.mockRejectedValueOnce(new Error('Unauthorized'));

      await validateGitHubToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'GitHub access token is invalid or expired',
        code: 'INVALID_GITHUB_TOKEN',
        details: 'Please re-authenticate with GitHub',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const { req, res, next } = createMockReqRes();
      req.user = mockUser;

      mockedAuthService.getGitHubUser.mockRejectedValueOnce(new Error('Network error'));

      await validateGitHubToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to validate GitHub token',
        code: 'GITHUB_VALIDATION_ERROR',
        details: 'Network error',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authErrorHandler', () => {
    it('should handle JsonWebTokenError', () => {
      const { req, res, next } = createMockReqRes();
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      authErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_JWT',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle TokenExpiredError', () => {
      const { req, res, next } = createMockReqRes();
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      authErrorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'EXPIRED_JWT',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass other errors to next handler', () => {
      const { req, res, next } = createMockReqRes();
      const error = new Error('Some other error');

      authErrorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});