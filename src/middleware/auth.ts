import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth';
import { User } from '@/generated/prisma';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: User;
  token: string;
}

/**
 * Authentication middleware that verifies JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Verify token and get user
    const user = await AuthService.getUserFromToken(token);

    if (!user) {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Optional authentication middleware that doesn't fail if no token is provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await AuthService.getUserFromToken(token);
      if (user) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Middleware to check if user owns the resource
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!resourceUserId) {
      res.status(400).json({
        error: 'Resource user ID not found',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        error: 'Access denied: You can only access your own resources',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate GitHub access token
 */
export const validateGitHubToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.accessToken) {
      res.status(401).json({
        error: 'GitHub access token not found',
        code: 'MISSING_GITHUB_TOKEN',
      });
      return;
    }

    // Verify token is still valid by making a test request
    await AuthService.getGitHubUser(req.user.accessToken);
    next();
  } catch (error) {
    // Check if it's an authentication error (401) or a validation error (500)
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('401'))) {
      res.status(401).json({
        error: 'GitHub access token is invalid or expired',
        code: 'INVALID_GITHUB_TOKEN',
        details: 'Please re-authenticate with GitHub',
      });
    } else {
      res.status(500).json({
        error: 'Failed to validate GitHub token',
        code: 'GITHUB_VALIDATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
};

/**
 * Error handler for authentication errors
 */
export const authErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_JWT',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
      code: 'EXPIRED_JWT',
    });
    return;
  }

  // Pass to next error handler
  next(error);
};