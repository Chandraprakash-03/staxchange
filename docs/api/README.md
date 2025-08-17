# AI Tech Stack Converter API Documentation

## Overview

The AI Tech Stack Converter API provides endpoints for importing GitHub repositories, analyzing tech stacks, converting code between different technologies, and managing the conversion process.

## Base URL

```
https://api.ai-tech-stack-converter.com/api
```

## Authentication

The API uses GitHub OAuth for authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 10 requests per 15 minutes per IP
- **AI Conversions**: 3 requests per hour per user
- **GitHub Import**: 10 requests per 15 minutes per user
- **Preview**: 50 requests per 5 minutes per IP

## Error Handling

All API responses follow a consistent error format:

```json
{
	"success": false,
	"error": {
		"code": "ERROR_CODE",
		"message": "Technical error message",
		"userMessage": "User-friendly error message",
		"category": "ERROR_CATEGORY",
		"severity": "HIGH|MEDIUM|LOW",
		"retryable": true,
		"recoveryActions": [
			{
				"type": "retry",
				"description": "Wait and retry the request",
				"automated": false,
				"estimatedTime": 60000
			}
		]
	},
	"timestamp": "2025-01-17T10:30:00.000Z",
	"requestId": "req_1234567890"
}
```

## API Endpoints

### Authentication

- [POST /auth/github](./auth.md#github-login) - GitHub OAuth login
- [POST /auth/refresh](./auth.md#refresh-token) - Refresh JWT token
- [GET /auth/me](./auth.md#get-user) - Get current user info
- [POST /auth/logout](./auth.md#logout) - Logout user

### Projects

- [POST /projects/import](./projects.md#import-repository) - Import GitHub repository
- [GET /projects](./projects.md#list-projects) - List user projects
- [GET /projects/:id](./projects.md#get-project) - Get project details
- [DELETE /projects/:id](./projects.md#delete-project) - Delete project

### Conversion

- [POST /conversion/analyze](./conversion.md#analyze-project) - Analyze project tech stack
- [POST /conversion/plan](./conversion.md#create-plan) - Create conversion plan
- [POST /conversion/start](./conversion.md#start-conversion) - Start conversion job
- [GET /conversion/:jobId](./conversion.md#get-job-status) - Get conversion status
- [GET /conversion/:jobId/logs](./conversion.md#get-logs) - Get conversion logs

### Preview

- [POST /preview/create](./preview.md#create-environment) - Create preview environment
- [GET /preview/:id](./preview.md#get-environment) - Get preview environment
- [POST /preview/:id/files](./preview.md#update-files) - Update preview files
- [DELETE /preview/:id](./preview.md#delete-environment) - Delete preview environment

### Export

- [POST /exports](./exports.md#create-export) - Create project export
- [GET /exports/:id](./exports.md#get-export) - Get export status
- [GET /exports/:id/download](./exports.md#download-export) - Download exported project

### Health & Monitoring

- [GET /health](./health.md#health-check) - System health check
- [GET /health/detailed](./health.md#detailed-health) - Detailed health status

## SDKs and Libraries

- [JavaScript/TypeScript SDK](./sdks/javascript.md)
- [Python SDK](./sdks/python.md)
- [cURL Examples](./examples/curl.md)

## Webhooks

The API supports webhooks for real-time updates on conversion progress:

- [Webhook Configuration](./webhooks.md#configuration)
- [Event Types](./webhooks.md#events)
- [Security](./webhooks.md#security)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for API version history and breaking changes.
