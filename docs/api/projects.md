# Projects API

## Import GitHub Repository

Import a GitHub repository for analysis and conversion.

**Endpoint:** `POST /api/projects/import`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
	"url": "https://github.com/username/repository",
	"branch": "main",
	"includeTests": true,
	"includeDocs": false
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"project": {
			"id": "project_uuid",
			"name": "repository",
			"description": "Repository description",
			"githubUrl": "https://github.com/username/repository",
			"branch": "main",
			"status": "importing",
			"detectedTechStack": {
				"language": "javascript",
				"framework": "react",
				"runtime": "node",
				"packageManager": "npm",
				"buildTool": "webpack",
				"database": null,
				"deployment": null
			},
			"fileCount": 156,
			"totalSize": 2048576,
			"createdAt": "2025-01-17T10:30:00.000Z",
			"updatedAt": "2025-01-17T10:30:00.000Z"
		},
		"importJob": {
			"id": "job_uuid",
			"status": "running",
			"progress": 0,
			"estimatedTimeRemaining": 120000
		}
	}
}
```

**Rate Limit:** 10 requests per 15 minutes per user

---

## List Projects

Get a paginated list of user's projects.

**Endpoint:** `GET /api/projects`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (`importing`, `ready`, `converting`, `completed`, `failed`)
- `search` (optional): Search by project name or description

**Response:**

```json
{
	"success": true,
	"data": {
		"projects": [
			{
				"id": "project_uuid",
				"name": "my-react-app",
				"description": "A React application",
				"githubUrl": "https://github.com/user/my-react-app",
				"status": "ready",
				"detectedTechStack": {
					"language": "javascript",
					"framework": "react"
				},
				"fileCount": 156,
				"totalSize": 2048576,
				"createdAt": "2025-01-17T10:30:00.000Z",
				"lastConversionAt": "2025-01-17T11:00:00.000Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 45,
			"totalPages": 3,
			"hasNext": true,
			"hasPrev": false
		}
	}
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

---

## Get Project Details

Get detailed information about a specific project.

**Endpoint:** `GET /api/projects/:id`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
	"success": true,
	"data": {
		"project": {
			"id": "project_uuid",
			"name": "my-react-app",
			"description": "A React application with TypeScript",
			"githubUrl": "https://github.com/user/my-react-app",
			"branch": "main",
			"status": "ready",
			"detectedTechStack": {
				"language": "javascript",
				"framework": "react",
				"runtime": "node",
				"packageManager": "npm",
				"buildTool": "webpack",
				"database": null,
				"deployment": null,
				"dependencies": ["react@18.2.0", "typescript@4.9.5", "webpack@5.75.0"]
			},
			"fileStructure": {
				"src/": {
					"components/": {
						"App.tsx": { "size": 1024, "type": "typescript" },
						"Header.tsx": { "size": 512, "type": "typescript" }
					},
					"utils/": {
						"helpers.ts": { "size": 256, "type": "typescript" }
					},
					"index.tsx": { "size": 128, "type": "typescript" }
				},
				"package.json": { "size": 2048, "type": "json" },
				"tsconfig.json": { "size": 512, "type": "json" }
			},
			"metrics": {
				"fileCount": 156,
				"totalSize": 2048576,
				"linesOfCode": 12450,
				"complexity": "medium",
				"testCoverage": 85.5
			},
			"conversionHistory": [
				{
					"id": "conversion_uuid",
					"targetTechStack": {
						"language": "python",
						"framework": "django"
					},
					"status": "completed",
					"createdAt": "2025-01-17T11:00:00.000Z"
				}
			],
			"createdAt": "2025-01-17T10:30:00.000Z",
			"updatedAt": "2025-01-17T10:35:00.000Z"
		}
	}
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

---

## Delete Project

Delete a project and all associated data.

**Endpoint:** `DELETE /api/projects/:id`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
	"success": true,
	"message": "Project deleted successfully"
}
```

**Rate Limit:** 100 requests per 15 minutes per IP

---

## Validate Repository

Validate a GitHub repository URL before importing.

**Endpoint:** `POST /api/projects/validate`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
	"url": "https://github.com/username/repository"
}
```

**Response:**

```json
{
	"success": true,
	"data": {
		"valid": true,
		"repository": {
			"name": "repository",
			"owner": "username",
			"description": "Repository description",
			"isPrivate": false,
			"defaultBranch": "main",
			"size": 2048,
			"language": "JavaScript",
			"lastUpdated": "2025-01-17T10:00:00.000Z"
		},
		"accessibility": {
			"canAccess": true,
			"hasPermission": true,
			"requiresAuth": false
		},
		"estimatedImportTime": 120000
	}
}
```

**Rate Limit:** 20 requests per 15 minutes per user

---

## Error Codes

| Code                         | Description                        |
| ---------------------------- | ---------------------------------- |
| `INVALID_GITHUB_URL`         | Invalid GitHub repository URL      |
| `REPOSITORY_NOT_FOUND`       | Repository does not exist          |
| `REPOSITORY_ACCESS_DENIED`   | No permission to access repository |
| `REPOSITORY_TOO_LARGE`       | Repository exceeds size limits     |
| `PROJECT_NOT_FOUND`          | Project not found                  |
| `PROJECT_ALREADY_EXISTS`     | Project already imported           |
| `IMPORT_IN_PROGRESS`         | Import already in progress         |
| `GITHUB_RATE_LIMIT_EXCEEDED` | GitHub API rate limit exceeded     |
| `IMPORT_RATE_LIMIT_EXCEEDED` | Too many import requests           |

## Supported Repository Types

- **Languages:** JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby
- **Frameworks:** React, Vue, Angular, Express, Django, Flask, Spring Boot, .NET Core
- **Maximum Size:** 500MB per repository
- **File Limits:** 10,000 files maximum
- **Private Repositories:** Supported with proper GitHub permissions
