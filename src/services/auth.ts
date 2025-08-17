import jwt from 'jsonwebtoken';
import axios from 'axios';
import { UserModel } from '@/models/user';
import { User } from '@/generated/prisma';

export interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string;
  name: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface JWTPayload {
  userId: string;
  githubId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static readonly JWT_EXPIRES_IN = '7d';

  private static get JWT_SECRET(): string {
    return process.env.JWT_SECRET!;
  }

  private static get GITHUB_CLIENT_ID(): string {
    return process.env.GITHUB_CLIENT_ID!;
  }

  private static get GITHUB_CLIENT_SECRET(): string {
    return process.env.GITHUB_CLIENT_SECRET!;
  }

  /**
   * Generate GitHub OAuth URL
   */
  static getGitHubAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.GITHUB_CLIENT_ID,
      scope: 'user:email,repo',
      state: state || '',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange GitHub code for access token
   */
  static async exchangeGitHubCode(code: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.GITHUB_CLIENT_ID,
          client_secret: this.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.error) {
        throw new Error(`GitHub OAuth error: ${response.data.error_description}`);
      }

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to exchange GitHub code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get GitHub user information
   */
  static async getGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get GitHub user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate user with GitHub OAuth
   */
  static async authenticateWithGitHub(code: string): Promise<{ user: User; token: string }> {
    // Exchange code for access token
    const accessToken = await this.exchangeGitHubCode(code);
    
    // Get user information from GitHub
    const githubUser = await this.getGitHubUser(accessToken);
    
    // Find or create user in database
    let user = await UserModel.findByGithubId(githubUser.id.toString());
    
    if (!user) {
      // Create new user
      user = await UserModel.create({
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      });
    } else {
      // Update existing user with latest information
      user = await UserModel.update(user.id, {
        username: githubUser.login,
        email: githubUser.email,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      });
    }

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    // Generate JWT token
    const token = this.generateJWT({
      userId: user.id,
      githubId: user.githubId,
      username: user.username,
    });

    return { user, token };
  }

  /**
   * Generate JWT token
   */
  static generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT token
   */
  static verifyJWT(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh JWT token
   */
  static refreshJWT(token: string): string {
    const payload = this.verifyJWT(token);
    
    // Generate new token with same payload (excluding iat and exp)
    return this.generateJWT({
      userId: payload.userId,
      githubId: payload.githubId,
      username: payload.username,
    });
  }

  /**
   * Get user from JWT token
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.verifyJWT(token);
      return await UserModel.findById(payload.userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate environment variables
   */
  static validateConfig(): void {
    const requiredVars = ['JWT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}