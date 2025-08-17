# Authentication System Documentation

This document describes the authentication system implemented for the AI Tech Stack Converter platform.

## Overview

The authentication system provides:
- GitHub OAuth integration for user authentication
- JWT token-based session management
- Middleware for protecting API routes
- User management with PostgreSQL storage

## Architecture

### Components

1. **AuthService** (`src/services/auth.ts`)
   - Handles GitHub OAuth flow
   - JWT token generation and verification
   - User authentication and management

2. **Authentication Middleware** (`src/middleware/auth.ts`)
   - Token validation middleware
   - Ownership verification
   - GitHub token validation

3. **API Routes** (`src/app/api/auth/`)
   - `/api/auth/github` - Get GitHub OAuth URL
   - `/api/auth/callback` - Handle OAuth callback
   - `/api/auth/me` - Get current user info
   - `/api/auth/refresh` - Refresh JWT token
   - `/api/auth/logout` - Logout user

## Setup

### Environment Variables

Add these to your `.env.local` file:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### GitHub OAuth App Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App with:
   - Application name: "AI Tech Stack Converter"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback`
3. Copy the Client ID and Client Secret to your environment variables

## Usage

### Frontend Authentication Flow

```typescript
// 1. Get GitHub OAuth URL
const response = await fetch('/api/auth/github');
const { authUrl } = await response.json();

// 2. Redirect user to GitHub
window.location.href = authUrl;

// 3. GitHub redirects back to /api/auth/callback
// The callback handles authentication and returns user + token

// 4. Get current user info
const userResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { user } = await userResponse.json();
```

### Protecting API Routes

#### Method 1: Manual Token Validation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

export async function GET(request: NextRequest) {
  // Get token from header or cookie
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('auth-token')?.value;
  const token = authHeader?.split(' ')[1] || cookieToken;

  if (!token) {
    return NextResponse.json({ error: 'Access token required' }, { status: 401 });
  }

  const user = await AuthService.getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Your protected logic here
  return NextResponse.json({ message: 'Protected data', user });
}
```

#### Method 2: Using Express Middleware (for Express routes)

```typescript
import express from 'express';
import { authenticateToken, requireOwnership } from '@/middleware/auth';

const router = express.Router();

// Protect route with authentication
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

// Protect route with ownership check
router.get('/projects/:userId', authenticateToken, requireOwnership('userId'), (req, res) => {
  // User can only access their own projects
  res.json({ projects: [] });
});
```

### Token Management

#### Refresh Token

```typescript
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${oldToken}`
  }
});
const { token: newToken } = await refreshResponse.json();
```

#### Logout

```typescript
await fetch('/api/auth/logout', { method: 'POST' });
// Token cookie is cleared automatically
```

## Middleware Options

### `authenticateToken`
Requires valid JWT token. Adds `user` and `token` to request object.

### `optionalAuth`
Adds user to request if valid token is provided, but doesn't fail if no token.

### `requireOwnership(field)`
Ensures authenticated user owns the resource specified by the field.

### `validateGitHubToken`
Validates that the user's GitHub access token is still valid.

## Error Handling

The system provides consistent error responses:

```typescript
{
  error: "Error message",
  code: "ERROR_CODE",
  details?: "Additional details"
}
```

Common error codes:
- `MISSING_TOKEN` - No authentication token provided
- `INVALID_TOKEN` - Token is invalid or expired
- `AUTH_FAILED` - Authentication process failed
- `ACCESS_DENIED` - User doesn't have permission
- `GITHUB_OAUTH_ERROR` - GitHub OAuth process failed

## Security Features

1. **JWT Token Security**
   - Tokens expire after 7 days
   - Signed with secret key
   - Include user identification

2. **GitHub Token Validation**
   - Stored GitHub access tokens are validated
   - Automatic re-authentication when tokens expire

3. **HTTP-Only Cookies**
   - Tokens stored in secure HTTP-only cookies
   - CSRF protection through SameSite attribute

4. **Input Validation**
   - All inputs are validated and sanitized
   - Proper error handling for edge cases

## Testing

The authentication system includes comprehensive tests:

- **Unit Tests**: Service and middleware logic
- **Integration Tests**: API route functionality
- **Mock Support**: GitHub API and JWT operations

Run tests with:
```bash
npm run test:run -- src/test/services/auth.test.ts
npm run test:run -- src/test/middleware/auth.test.ts
npm run test:run -- src/test/api/auth.test.ts
```

## Database Schema

The system uses the existing User model with these fields:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  github_id VARCHAR UNIQUE NOT NULL,
  username VARCHAR NOT NULL,
  email VARCHAR,
  avatar_url VARCHAR,
  access_token VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

1. **Always validate tokens** on protected routes
2. **Use HTTPS in production** for secure token transmission
3. **Rotate JWT secrets** regularly in production
4. **Monitor token usage** for suspicious activity
5. **Implement rate limiting** on authentication endpoints
6. **Log authentication events** for security auditing

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure all GitHub OAuth and JWT environment variables are set

2. **"GitHub OAuth error"**
   - Check GitHub OAuth app configuration
   - Verify callback URL matches your setup

3. **"Invalid token"**
   - Token may have expired (7-day limit)
   - JWT secret may have changed
   - Use refresh endpoint to get new token

4. **"Access denied"**
   - User may not own the requested resource
   - Check ownership middleware configuration