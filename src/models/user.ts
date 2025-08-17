import prisma from '@/lib/prisma';
import { User, Prisma } from '@/generated/prisma';
import { ValidationResult, ValidationError } from '@/types';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: Prisma.UserCreateInput): Promise<User> {
    return await prisma.user.create({
      data: userData,
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });
  }

  /**
   * Find user by GitHub ID
   */
  static async findByGithubId(githubId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { githubId },
      include: {
        projects: true,
      },
    });
  }

  /**
   * Update user
   */
  static async update(id: string, updates: Prisma.UserUpdateInput): Promise<User | null> {
    try {
      return await prisma.user.update({
        where: { id },
        data: updates,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null; // User not found
      }
      throw error;
    }
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false; // User not found
      }
      throw error;
    }
  }

  /**
   * Validate user data
   */
  static validateUserData(userData: Partial<Prisma.UserCreateInput>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!userData.githubId) {
      errors.push({
        field: 'githubId',
        message: 'GitHub ID is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!userData.username) {
      errors.push({
        field: 'username',
        message: 'Username is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Format validation
    if (userData.email && !this.isValidEmail(userData.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT',
      });
    }

    if (userData.avatarUrl && !this.isValidUrl(userData.avatarUrl)) {
      errors.push({
        field: 'avatarUrl',
        message: 'Invalid avatar URL format',
        code: 'INVALID_FORMAT',
      });
    }

    // Warnings
    if (!userData.email) {
      warnings.push('Email is recommended for better user experience');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}