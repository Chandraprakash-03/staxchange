# Developer Documentation

## Overview

The AI Tech Stack Converter is built with a modular architecture that allows for easy extension and customization. This documentation provides guidance for developers who want to extend the platform's capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding New Tech Stacks](#adding-new-tech-stacks)
3. [Creating Custom Agents](#creating-custom-agents)
4. [Extending the API](#extending-the-api)
5. [Adding New Services](#adding-new-services)
6. [Custom Middleware](#custom-middleware)
7. [Database Extensions](#database-extensions)
8. [Testing Extensions](#testing-extensions)
9. [Deployment Considerations](#deployment-considerations)

## Architecture Overview

### Core Components

```
src/
├── app/api/           # API routes and handlers
├── services/          # Business logic services
├── middleware/        # Express middleware
├── utils/             # Utility functions
├── lib/              # External library configurations
├── agents/           # AI conversion agents
├── models/           # Data models and types
└── test/             # Test suites
```

### Key Design Patterns

- **Service Layer Pattern**: Business logic is encapsulated in services
- **Repository Pattern**: Data access is abstracted through repositories
- **Agent Pattern**: AI operations are handled by specialized agents
- **Middleware Chain**: Request processing through composable middleware
- **Error Boundary Pattern**: Comprehensive error handling and recovery

## Adding New Tech Stacks

### 1. Define Tech Stack Configuration

Create a new tech stack configuration in `src/config/techStacks.ts`:

```typescript
export const newTechStack: TechStackConfig = {
	id: "new-stack",
	name: "New Framework",
	language: "javascript",
	category: "frontend",

	// File patterns for detection
	detectionPatterns: {
		packageJson: {
			dependencies: ["new-framework"],
			devDependencies: ["new-framework-cli"],
		},
		files: ["new.config.js", "src/**/*.new"],
	},

	// Conversion mappings
	conversionMappings: {
		react: {
			complexity: "medium",
			compatibility: 0.8,
			mappings: {
				components: "new-components",
				hooks: "new-composables",
			},
		},
	},

	// Code generation templates
	templates: {
		component: "templates/new-framework/component.hbs",
		config: "templates/new-framework/config.hbs",
	},
};
```

### 2. Create Detection Logic

Implement detection logic in `src/services/techStackDetection.ts`:

```typescript
export class NewFrameworkDetector implements TechStackDetector {
	async detect(project: ProjectStructure): Promise<DetectionResult> {
		const confidence = this.calculateConfidence(project);

		return {
			techStack: "new-stack",
			confidence,
			evidence: this.gatherEvidence(project),
			dependencies: this.extractDependencies(project),
		};
	}

	private calculateConfidence(project: ProjectStructure): number {
		let score = 0;

		// Check for framework-specific files
		if (project.hasFile("new.config.js")) score += 0.4;
		if (project.hasPackageDependency("new-framework")) score += 0.6;

		return Math.min(score, 1.0);
	}
}
```

### 3. Add Conversion Templates

Create Handlebars templates in `templates/new-framework/`:

```handlebars
{{! templates/new-framework/component.hbs }}
import { NewComponent } from 'new-framework'; export const
{{componentName}}
= () => {
{{#each props}}
	const
	{{name}}
	=
	{{defaultValue}};
{{/each}}

return (
<NewComponent>
	{{content}}
</NewComponent>
); };
```

### 4. Register the Tech Stack

Add to the tech stack registry:

```typescript
// src/config/techStackRegistry.ts
import { NewFrameworkDetector } from "../services/techStackDetection";

export const techStackRegistry = {
	detectors: [
		new NewFrameworkDetector(),
		// ... other detectors
	],

	converters: {
		"new-stack": new NewFrameworkConverter(),
		// ... other converters
	},
};
```

## Creating Custom Agents

### 1. Define Agent Interface

Extend the base agent class:

```typescript
// src/agents/CustomAgent.ts
import { BaseAgent, AgentContext, AgentResult } from "./BaseAgent";

export class CustomAgent extends BaseAgent {
	name = "CustomAgent";
	description = "Performs custom conversion tasks";

	async execute(context: AgentContext): Promise<AgentResult> {
		try {
			// Custom logic here
			const result = await this.performCustomTask(context);

			return {
				success: true,
				data: result,
				metadata: {
					processingTime: Date.now() - context.startTime,
					filesProcessed: result.files.length,
				},
			};
		} catch (error) {
			return this.handleError(error, context);
		}
	}

	private async performCustomTask(context: AgentContext): Promise<any> {
		// Implement your custom logic
		return {};
	}
}
```

### 2. Register the Agent

Add to the agent orchestrator:

```typescript
// src/services/agentOrchestrator.ts
import { CustomAgent } from "../agents/CustomAgent";

export class AgentOrchestrator {
	private agents = new Map([
		["custom", new CustomAgent()],
		// ... other agents
	]);

	async executeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowResult> {
		// Orchestration logic
	}
}
```

### 3. Define Agent Workflows

Create workflow definitions:

```typescript
// src/config/workflows.ts
export const customWorkflow: WorkflowDefinition = {
	id: "custom-conversion",
	name: "Custom Conversion Workflow",

	steps: [
		{
			agent: "analysis",
			config: { depth: "deep" },
		},
		{
			agent: "custom",
			config: {
				customParam: "value",
				dependencies: ["analysis"],
			},
		},
		{
			agent: "validation",
			config: {
				dependencies: ["custom"],
			},
		},
	],
};
```

## Extending the API

### 1. Create New Route Handler

```typescript
// src/app/api/custom/routes.ts
import { Router, Request, Response } from "express";
import { asyncHandler, authenticateToken } from "@/middleware";
import { CustomService } from "@/services/custom";

const router = Router();

router.post(
	"/custom-action",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { param1, param2 } = req.body;
		const user = req.user!;

		const result = await CustomService.performAction(param1, param2, user.id);

		res.json({
			success: true,
			data: result,
		});
	})
);

export default router;
```

### 2. Add Route to Main Router

```typescript
// src/app/api/router.ts
import customRoutes from "./custom/routes";

export const createApiRouter = (): Router => {
	const router = Router();

	// ... existing middleware

	router.use("/custom", customRoutes);

	// ... rest of configuration

	return router;
};
```

### 3. Add API Documentation

````markdown
<!-- docs/api/custom.md -->

# Custom API

## Perform Custom Action

**Endpoint:** `POST /api/custom/custom-action`

**Request Body:**

```json
{
	"param1": "string",
	"param2": "number"
}
```
````

**Response:**

```json
{
	"success": true,
	"data": {
		"result": "custom result"
	}
}
```

````

## Adding New Services

### 1. Create Service Class

```typescript
// src/services/CustomService.ts
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errors';

export class CustomService {
  static async performAction(
    param1: string,
    param2: number,
    userId: string
  ): Promise<CustomResult> {
    try {
      logger.info('Performing custom action', { param1, param2, userId });

      // Validate inputs
      this.validateInputs(param1, param2);

      // Perform business logic
      const result = await this.executeCustomLogic(param1, param2, userId);

      logger.info('Custom action completed', { userId, result });
      return result;

    } catch (error) {
      logger.error('Custom action failed', { error, userId });
      throw new AppError({
        category: 'CUSTOM_SERVICE',
        severity: 'MEDIUM',
        code: 'CUSTOM_ACTION_FAILED',
        message: 'Failed to perform custom action',
        userMessage: 'Unable to complete the requested action. Please try again.',
        context: {
          operation: 'performAction',
          timestamp: new Date(),
          additionalData: { param1, param2, userId }
        },
        recoveryActions: [{
          type: 'retry',
          description: 'Retry the custom action',
          automated: false
        }],
        retryable: true,
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true
      });
    }
  }

  private static validateInputs(param1: string, param2: number): void {
    if (!param1 || param1.length === 0) {
      throw new Error('param1 is required');
    }

    if (param2 < 0) {
      throw new Error('param2 must be positive');
    }
  }

  private static async executeCustomLogic(
    param1: string,
    param2: number,
    userId: string
  ): Promise<CustomResult> {
    // Implement your custom business logic here
    return {
      processed: true,
      value: `${param1}-${param2}`,
      timestamp: new Date()
    };
  }
}

interface CustomResult {
  processed: boolean;
  value: string;
  timestamp: Date;
}
````

### 2. Add Service Tests

```typescript
// src/test/services/CustomService.test.ts
import { CustomService } from "@/services/CustomService";

describe("CustomService", () => {
	describe("performAction", () => {
		test("should perform action successfully", async () => {
			const result = await CustomService.performAction("test", 123, "user-id");

			expect(result.processed).toBe(true);
			expect(result.value).toBe("test-123");
			expect(result.timestamp).toBeInstanceOf(Date);
		});

		test("should validate inputs", async () => {
			await expect(
				CustomService.performAction("", 123, "user-id")
			).rejects.toThrow("param1 is required");

			await expect(
				CustomService.performAction("test", -1, "user-id")
			).rejects.toThrow("param2 must be positive");
		});
	});
});
```

## Custom Middleware

### 1. Create Middleware Function

```typescript
// src/middleware/customMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/errors";

export const customValidation = (options: CustomOptions = {}) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		try {
			// Custom validation logic
			if (!validateCustomCondition(req, options)) {
				throw new AppError({
					category: "VALIDATION",
					severity: "LOW",
					code: "CUSTOM_VALIDATION_FAILED",
					message: "Custom validation failed",
					userMessage: "Request does not meet custom requirements.",
					context: {
						operation: `${req.method} ${req.path}`,
						timestamp: new Date(),
					},
					recoveryActions: [
						{
							type: "manual",
							description: "Adjust request to meet requirements",
							automated: false,
						},
					],
					retryable: false,
					maxRetries: 0,
					retryDelay: 0,
					exponentialBackoff: false,
				});
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};

interface CustomOptions {
	strictMode?: boolean;
	allowedValues?: string[];
}

function validateCustomCondition(
	req: Request,
	options: CustomOptions
): boolean {
	// Implement your custom validation logic
	return true;
}
```

### 2. Use Middleware in Routes

```typescript
// src/app/api/custom/routes.ts
import { customValidation } from "@/middleware/customMiddleware";

router.post(
	"/protected-endpoint",
	authenticateToken,
	customValidation({ strictMode: true }),
	asyncHandler(async (req: Request, res: Response) => {
		// Route handler
	})
);
```

## Database Extensions

### 1. Add New Models

```typescript
// src/models/CustomModel.ts
export interface CustomModel {
	id: string;
	name: string;
	data: Record<string, any>;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateCustomModelRequest {
	name: string;
	data: Record<string, any>;
	userId: string;
}
```

### 2. Create Database Schema

```sql
-- migrations/add_custom_table.sql
CREATE TABLE custom_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_models_user_id ON custom_models(user_id);
CREATE INDEX idx_custom_models_name ON custom_models(name);
```

### 3. Add Prisma Schema

```prisma
// prisma/schema.prisma
model CustomModel {
  id        String   @id @default(cuid())
  name      String
  data      Json     @default("{}")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("custom_models")
}
```

### 4. Create Repository

```typescript
// src/repositories/CustomModelRepository.ts
import { prisma } from "@/lib/prisma";
import { CustomModel, CreateCustomModelRequest } from "@/models/CustomModel";

export class CustomModelRepository {
	static async create(data: CreateCustomModelRequest): Promise<CustomModel> {
		return await prisma.customModel.create({
			data: {
				name: data.name,
				data: data.data,
				userId: data.userId,
			},
		});
	}

	static async findByUserId(userId: string): Promise<CustomModel[]> {
		return await prisma.customModel.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	}

	static async findById(
		id: string,
		userId: string
	): Promise<CustomModel | null> {
		return await prisma.customModel.findFirst({
			where: { id, userId },
		});
	}

	static async update(
		id: string,
		userId: string,
		data: Partial<CustomModel>
	): Promise<CustomModel> {
		return await prisma.customModel.update({
			where: { id },
			data: {
				...data,
				updatedAt: new Date(),
			},
		});
	}

	static async delete(id: string, userId: string): Promise<void> {
		await prisma.customModel.delete({
			where: { id },
		});
	}
}
```

## Testing Extensions

### 1. Unit Tests

```typescript
// src/test/services/CustomService.test.ts
import { CustomService } from "@/services/CustomService";
import { CustomModelRepository } from "@/repositories/CustomModelRepository";

// Mock dependencies
jest.mock("@/repositories/CustomModelRepository");

describe("CustomService", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("should create custom model", async () => {
		const mockModel = {
			id: "test-id",
			name: "Test Model",
			data: { key: "value" },
			userId: "user-id",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		(CustomModelRepository.create as jest.Mock).mockResolvedValue(mockModel);

		const result = await CustomService.createModel({
			name: "Test Model",
			data: { key: "value" },
			userId: "user-id",
		});

		expect(result).toEqual(mockModel);
		expect(CustomModelRepository.create).toHaveBeenCalledWith({
			name: "Test Model",
			data: { key: "value" },
			userId: "user-id",
		});
	});
});
```

### 2. Integration Tests

```typescript
// src/test/integration/custom.test.ts
import request from "supertest";
import { app } from "@/app";
import { prisma } from "@/lib/prisma";

describe("Custom API Integration", () => {
	beforeEach(async () => {
		// Clean up test data
		await prisma.customModel.deleteMany();
	});

	test("should create and retrieve custom model", async () => {
		const authToken = await getTestAuthToken();

		// Create model
		const createResponse = await request(app)
			.post("/api/custom/models")
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				name: "Test Model",
				data: { key: "value" },
			})
			.expect(201);

		expect(createResponse.body.success).toBe(true);
		expect(createResponse.body.data.name).toBe("Test Model");

		// Retrieve model
		const getResponse = await request(app)
			.get(`/api/custom/models/${createResponse.body.data.id}`)
			.set("Authorization", `Bearer ${authToken}`)
			.expect(200);

		expect(getResponse.body.data.name).toBe("Test Model");
	});
});
```

### 3. End-to-End Tests

```typescript
// src/test/e2e/custom-workflow.test.ts
import { test, expect } from "@playwright/test";

test.describe("Custom Workflow", () => {
	test("should complete custom workflow end-to-end", async ({ page }) => {
		// Login
		await page.goto("/login");
		await page.fill("[data-testid=email]", "test@example.com");
		await page.fill("[data-testid=password]", "password");
		await page.click("[data-testid=login-button]");

		// Navigate to custom feature
		await page.click("[data-testid=custom-nav]");

		// Create custom model
		await page.click("[data-testid=create-model-button]");
		await page.fill("[data-testid=model-name]", "E2E Test Model");
		await page.click("[data-testid=save-button]");

		// Verify creation
		await expect(page.locator("[data-testid=model-list]")).toContainText(
			"E2E Test Model"
		);
	});
});
```

## Deployment Considerations

### 1. Environment Configuration

```typescript
// src/config/environment.ts
export const customConfig = {
	customFeature: {
		enabled: process.env.CUSTOM_FEATURE_ENABLED === "true",
		apiKey: process.env.CUSTOM_API_KEY,
		timeout: parseInt(process.env.CUSTOM_TIMEOUT || "30000"),
		retries: parseInt(process.env.CUSTOM_RETRIES || "3"),
	},
};
```

### 2. Docker Configuration

```dockerfile
# Dockerfile.custom
FROM node:18-alpine

# Install custom dependencies
RUN apk add --no-cache custom-tool

# Copy custom configuration
COPY custom-config/ /app/custom-config/

# Set custom environment variables
ENV CUSTOM_FEATURE_ENABLED=true
ENV CUSTOM_TIMEOUT=60000

# Continue with standard build...
```

### 3. Kubernetes Deployment

```yaml
# k8s/custom-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-converter-custom
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-converter-custom
  template:
    metadata:
      labels:
        app: ai-converter-custom
    spec:
      containers:
        - name: api
          image: ai-converter:custom-latest
          env:
            - name: CUSTOM_FEATURE_ENABLED
              value: "true"
            - name: CUSTOM_API_KEY
              valueFrom:
                secretKeyRef:
                  name: custom-secrets
                  key: api-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
```

### 4. Monitoring and Observability

```typescript
// src/monitoring/customMetrics.ts
import { register, Counter, Histogram } from "prom-client";

export const customMetrics = {
	operationsTotal: new Counter({
		name: "custom_operations_total",
		help: "Total number of custom operations",
		labelNames: ["operation", "status"],
	}),

	operationDuration: new Histogram({
		name: "custom_operation_duration_seconds",
		help: "Duration of custom operations",
		labelNames: ["operation"],
		buckets: [0.1, 0.5, 1, 2, 5, 10],
	}),
};

register.registerMetric(customMetrics.operationsTotal);
register.registerMetric(customMetrics.operationDuration);
```

## Best Practices

### 1. Code Organization

- Keep related functionality in dedicated modules
- Use consistent naming conventions
- Implement proper error handling
- Add comprehensive logging
- Write thorough tests

### 2. Performance Considerations

- Implement caching where appropriate
- Use database indexes for queries
- Optimize API response sizes
- Consider rate limiting for expensive operations
- Monitor resource usage

### 3. Security Guidelines

- Validate all inputs
- Implement proper authentication and authorization
- Use parameterized queries to prevent SQL injection
- Sanitize user-generated content
- Follow principle of least privilege

### 4. Documentation

- Document all public APIs
- Provide code examples
- Maintain up-to-date README files
- Include troubleshooting guides
- Document configuration options

## Getting Help

- Check the [API Documentation](../api/README.md)
- Review existing implementations in the codebase
- Join our [Discord Community](https://discord.gg/ai-converter)
- Submit issues on [GitHub](https://github.com/ai-converter/issues)
- Contact the development team at dev@ai-converter.com
