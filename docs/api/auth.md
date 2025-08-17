# Authentication API

## GitHub OAuth Login

Initiate GitHub OAuth authentication flow.

**Endpoint:** `POST /api/auth/github`

**Request Body:**

```json
{
	"code": "github_oauth_code",
	"state": "optional_state_parameter"
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"token": "jwt_token_here",
		"refreshToken": "refresh_token_here",
		"user": {
			"id": "user_uuid",
			"githubId": "github_user_id",
			"username": "github_username",
			"email": "user@example.com",
			"avatarUrl": "https://github.com/avatar.jpg",
			"createdAt": "2025-01-17T10:30:00.000Z"
		},
		"expiresIn": 3600
	}
}
```

**Rate Limit:** 10 requests per 15 minutes per IP

---

## Refresh Token

Refresh an expired JWT token using a refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**

```json
{
	"refreshToken": "refresh_token_here"
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"token": "new_jwt_token",
		"refreshToken": "new_refresh_token",
		"expiresIn": 3600
	}
}
```

**Rate Limit:** 10 requests per 15 minutes per IP

---

## Get Current User

Get information about the currently authenticated user.

**Endpoint:** `GET /api/auth/me`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
	"success": true,
	"data": {
		"user": {
			"id": "user_uuid",
			"githubId": "github_user_id",
			"username": "github_username",
			"email": "user@example.com",
			"avatarUrl": "https://github.com/avatar.jpg",
			"createdAt": "2025-01-17T10:30:00.000Z",
			"lastLoginAt": "2025-01-17T10:30:00.000Z",
			"projectCount": 5,
			"conversionCount": 12
		}
	}
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

---

## Logout

Invalidate the current JWT token and refresh token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
	"success": true,
	"message": "Successfully logged out"
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

---

## Error Codes

| Code                       | Description                        |
| -------------------------- | ---------------------------------- |
| `GITHUB_AUTH_FAILED`       | GitHub OAuth authentication failed |
| `INVALID_OAUTH_CODE`       | Invalid or expired OAuth code      |
| `TOKEN_EXPIRED`            | JWT token has expired              |
| `INVALID_TOKEN`            | Invalid JWT token format           |
| `REFRESH_TOKEN_EXPIRED`    | Refresh token has expired          |
| `USER_NOT_FOUND`           | User account not found             |
| `AUTH_RATE_LIMIT_EXCEEDED` | Too many authentication attempts   |

## Security Considerations

- JWT tokens expire after 1 hour
- Refresh tokens expire after 30 days
- All authentication endpoints use HTTPS only
- Rate limiting prevents brute force attacks
- OAuth state parameter prevents CSRF attacks
