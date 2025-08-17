import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AuthService, GitHubUser } from '@/services/auth';
import { UserModel } from '@/models/user';

// Mock dependencies
vi.mock('axios');
vi.mock('@/models/user');
vi.mock('jsonwebtoken');

const mockedAxios = vi.mocked(axios);
const mockedUserModel = vi.mocked(UserModel);
const mockedJwt = vi.mocked(jwt);

describe('AuthService', () => {
  const mockEnv = {
    JWT_SECRET: 'test-secret',
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
  };

  beforeEach(() => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('getGitHubAuthUrl', () => {
    it('should generate correct GitHub OAuth URL', () => {
      const url = AuthService.getGitHubAuthUrl();
      
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('scope=user%3Aemail%2Crepo');
    });

    it('should include state parameter when provided', () => {
      const state = 'test-state';
      const url = AuthService.getGitHubAuthUrl(state);
      
      expect(url).toContain(`state=${state}`);
    });
  });

  describe('exchangeGitHubCode', () => {
    it('should exchange code for access token successfully', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-access-token',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await AuthService.exchangeGitHubCode('test-code');

      expect(result).toBe('test-access-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'test-code',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );
    });

    it('should throw error when GitHub returns error', async () => {
      const mockResponse = {
        data: {
          error: 'invalid_grant',
          error_description: 'The provided authorization grant is invalid',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await expect(AuthService.exchangeGitHubCode('invalid-code')).rejects.toThrow(
        'GitHub OAuth error: The provided authorization grant is invalid'
      );
    });

    it('should throw error when request fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(AuthService.exchangeGitHubCode('test-code')).rejects.toThrow(
        'Failed to exchange GitHub code: Network error'
      );
    });
  });

  describe('getGitHubUser', () => {
    const mockGitHubUser: GitHubUser = {
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar.jpg',
      name: 'Test User',
    };

    it('should get GitHub user successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockGitHubUser });

      const result = await AuthService.getGitHubUser('test-token');

      expect(result).toEqual(mockGitHubUser);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.github.com/user',
        {
          headers: {
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    });

    it('should throw error when request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(AuthService.getGitHubUser('invalid-token')).rejects.toThrow(
        'Failed to get GitHub user: Unauthorized'
      );
    });
  });

  describe('generateJWT', () => {
    it('should generate JWT token', () => {
      const payload = {
        userId: 'user-123',
        githubId: '12345',
        username: 'testuser',
      };

      mockedJwt.sign.mockReturnValueOnce('test-jwt-token');

      const result = AuthService.generateJWT(payload);

      expect(result).toBe('test-jwt-token');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('verifyJWT', () => {
    it('should verify JWT token successfully', () => {
      const mockPayload = {
        userId: 'user-123',
        githubId: '12345',
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockedJwt.verify.mockReturnValueOnce(mockPayload);

      const result = AuthService.verifyJWT('test-token');

      expect(result).toEqual(mockPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith('test-token', 'test-secret');
    });

    it('should throw error for invalid token', () => {
      mockedJwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthService.verifyJWT('invalid-token')).toThrow(
        'Invalid token: Invalid token'
      );
    });
  });

  describe('refreshJWT', () => {
    it('should refresh JWT token', () => {
      const mockPayload = {
        userId: 'user-123',
        githubId: '12345',
        username: 'testuser',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockedJwt.verify.mockReturnValueOnce(mockPayload);
      mockedJwt.sign.mockReturnValueOnce('new-jwt-token');

      const result = AuthService.refreshJWT('old-token');

      expect(result).toBe('new-jwt-token');
      expect(mockedJwt.verify).toHaveBeenCalledWith('old-token', 'test-secret');
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          githubId: '12345',
          username: 'testuser',
        },
        'test-secret',
        { expiresIn: '7d' }
      );
    });
  });

  describe('getUserFromToken', () => {
    it('should get user from valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        githubId: '12345',
        username: 'testuser',
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

      mockedJwt.verify.mockReturnValueOnce(mockPayload);
      mockedUserModel.findById.mockResolvedValueOnce(mockUser);

      const result = await AuthService.getUserFromToken('valid-token');

      expect(result).toEqual(mockUser);
      expect(mockedUserModel.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return null for invalid token', async () => {
      mockedJwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const result = await AuthService.getUserFromToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('authenticateWithGitHub', () => {
    const mockGitHubUser: GitHubUser = {
      id: 12345,
      login: 'testuser',
      email: 'test@example.com',
      avatar_url: 'https://github.com/avatar.jpg',
      name: 'Test User',
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

    beforeEach(() => {
      // Mock the exchange and user fetch
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'github-token' },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: mockGitHubUser,
      });
      mockedJwt.sign.mockReturnValueOnce('jwt-token');
    });

    it('should authenticate new user successfully', async () => {
      mockedUserModel.findByGithubId.mockResolvedValueOnce(null);
      mockedUserModel.create.mockResolvedValueOnce(mockUser);

      const result = await AuthService.authenticateWithGitHub('test-code');

      expect(result).toEqual({
        user: mockUser,
        token: 'jwt-token',
      });

      expect(mockedUserModel.findByGithubId).toHaveBeenCalledWith('12345');
      expect(mockedUserModel.create).toHaveBeenCalledWith({
        githubId: '12345',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://github.com/avatar.jpg',
        accessToken: 'github-token',
      });
    });

    it('should authenticate existing user successfully', async () => {
      mockedUserModel.findByGithubId.mockResolvedValueOnce(mockUser);
      mockedUserModel.update.mockResolvedValueOnce(mockUser);

      const result = await AuthService.authenticateWithGitHub('test-code');

      expect(result).toEqual({
        user: mockUser,
        token: 'jwt-token',
      });

      expect(mockedUserModel.findByGithubId).toHaveBeenCalledWith('12345');
      expect(mockedUserModel.update).toHaveBeenCalledWith(mockUser.id, {
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://github.com/avatar.jpg',
        accessToken: 'github-token',
      });
    });

    it('should throw error if user creation fails', async () => {
      mockedUserModel.findByGithubId.mockResolvedValueOnce(null);
      mockedUserModel.create.mockResolvedValueOnce(null);

      await expect(AuthService.authenticateWithGitHub('test-code')).rejects.toThrow(
        'Failed to create or update user'
      );
    });
  });

  describe('validateConfig', () => {
    it('should pass validation with all required variables', () => {
      expect(() => AuthService.validateConfig()).not.toThrow();
    });

    it('should throw error for missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;

      expect(() => AuthService.validateConfig()).toThrow(
        'Missing required environment variables: JWT_SECRET'
      );
    });

    it('should throw error for multiple missing variables', () => {
      delete process.env.JWT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;

      expect(() => AuthService.validateConfig()).toThrow(
        'Missing required environment variables: JWT_SECRET, GITHUB_CLIENT_ID'
      );
    });
  });
});