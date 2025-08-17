import { describe, it, expect, beforeEach } from 'vitest';
import { UserModel } from '@/models/user';
import { ValidationError } from '@/types';

describe('UserModel', () => {
  describe('validateUserData', () => {
    it('should validate required fields', () => {
      const result = UserModel.validateUserData({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map(e => e.field)).toContain('githubId');
      expect(result.errors.map(e => e.field)).toContain('username');
    });

    it('should pass validation with valid data', () => {
      const validUserData = {
        githubId: 'test-github-id',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = UserModel.validateUserData(validUserData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email format', () => {
      const invalidEmailData = {
        githubId: 'test-github-id',
        username: 'testuser',
        email: 'invalid-email',
      };

      const result = UserModel.validateUserData(invalidEmailData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should validate avatar URL format', () => {
      const invalidUrlData = {
        githubId: 'test-github-id',
        username: 'testuser',
        avatarUrl: 'not-a-valid-url',
      };

      const result = UserModel.validateUserData(invalidUrlData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'avatarUrl' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should provide warnings for missing optional fields', () => {
      const dataWithoutEmail = {
        githubId: 'test-github-id',
        username: 'testuser',
      };

      const result = UserModel.validateUserData(dataWithoutEmail);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Email is recommended for better user experience');
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
      ];

      validEmails.forEach(email => {
        const result = UserModel.validateUserData({
          githubId: 'test-github-id',
          username: 'testuser',
          email,
        });
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept valid URL formats', () => {
      const validUrls = [
        'https://example.com/avatar.jpg',
        'http://localhost:3000/image.png',
        'https://cdn.example.com/path/to/image.gif',
      ];

      validUrls.forEach(avatarUrl => {
        const result = UserModel.validateUserData({
          githubId: 'test-github-id',
          username: 'testuser',
          avatarUrl,
        });
        
        expect(result.isValid).toBe(true);
      });
    });
  });
});