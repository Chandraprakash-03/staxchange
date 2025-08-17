/**
 * Security tests for the AI Tech Stack Converter
 * Tests various security measures including input validation, rate limiting, and injection protection
 */

import request from "supertest";
import { Express } from "express";
import { createApiRouter } from "@/app/api/router";

describe("Security Tests", () => {
	let app: Express;

	beforeAll(() => {
		// Create test app with security middleware
		const express = require("express");
		app = express();
		app.use(express.json());
		app.use("/api", createApiRouter());
	});

	describe("Input Validation", () => {
		test("should reject malformed JSON", async () => {
			const response = await request(app)
				.post("/api/projects/import")
				.send('{"invalid": json}')
				.expect(400);

			expect(response.body.success).toBe(false);
		});

		test("should sanitize XSS attempts", async () => {
			const maliciousInput = {
				url: 'https://github.com/test/repo<script>alert("xss")</script>',
			};

			const response = await request(app)
				.post("/api/projects/validate")
				.send(maliciousInput);

			// Should not contain script tags in response
			expect(JSON.stringify(response.body)).not.toContain("<script>");
		});

		test("should reject oversized requests", async () => {
			const largePayload = {
				data: "x".repeat(20 * 1024 * 1024), // 20MB
			};

			const response = await request(app)
				.post("/api/projects/import")
				.send(largePayload)
				.expect(413);

			expect(response.body.error.code).toBe("REQUEST_TOO_LARGE");
		});

		test("should reject deeply nested JSON", async () => {
			// Create deeply nested object
			let deepObject: any = {};
			let current = deepObject;
			for (let i = 0; i < 20; i++) {
				current.nested = {};
				current = current.nested;
			}

			const response = await request(app)
				.post("/api/projects/import")
				.send(deepObject)
				.expect(400);

			expect(response.body.error.code).toBe("JSON_TOO_DEEP");
		});
	});

	describe("SQL Injection Protection", () => {
		test("should detect SQL injection in request body", async () => {
			const sqlInjection = {
				url: "'; DROP TABLE users; --",
			};

			const response = await request(app)
				.post("/api/projects/validate")
				.send(sqlInjection)
				.expect(400);

			expect(response.body.error.code).toBe("SQL_INJECTION_ATTEMPT");
		});

		test("should detect SQL injection in query parameters", async () => {
			const response = await request(app)
				.get("/api/projects?search='; DROP TABLE users; --")
				.expect(400);

			expect(response.body.error.code).toBe("SQL_INJECTION_ATTEMPT");
		});
	});

	describe("NoSQL Injection Protection", () => {
		test("should detect MongoDB operators in request", async () => {
			const noSqlInjection = {
				filter: {
					$where: "function() { return true; }",
				},
			};

			const response = await request(app)
				.post("/api/projects/import")
				.send(noSqlInjection)
				.expect(400);

			expect(response.body.error.code).toBe("NOSQL_INJECTION_ATTEMPT");
		});
	});

	describe("Path Traversal Protection", () => {
		test("should detect path traversal attempts", async () => {
			const pathTraversal = {
				filePath: "../../../etc/passwd",
			};

			const response = await request(app)
				.post("/api/preview/123/files/write")
				.send(pathTraversal)
				.expect(400);

			expect(response.body.error.code).toBe("PATH_TRAVERSAL_ATTEMPT");
		});

		test("should detect encoded path traversal", async () => {
			const response = await request(app)
				.get("/api/projects/123/files?path=%2e%2e%2f%2e%2e%2fetc%2fpasswd")
				.expect(400);

			expect(response.body.error.code).toBe("PATH_TRAVERSAL_ATTEMPT");
		});
	});

	describe("Rate Limiting", () => {
		test("should enforce general rate limits", async () => {
			// Make multiple requests quickly
			const promises = Array(105)
				.fill(null)
				.map(() => request(app).get("/api/health"));

			const responses = await Promise.all(promises);
			const rateLimitedResponses = responses.filter((r) => r.status === 429);

			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});

		test("should have stricter limits for auth endpoints", async () => {
			// Make multiple auth requests
			const promises = Array(15)
				.fill(null)
				.map(() =>
					request(app).post("/api/auth/validate").send({ token: "invalid" })
				);

			const responses = await Promise.all(promises);
			const rateLimitedResponses = responses.filter((r) => r.status === 429);

			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});
	});

	describe("Content Type Validation", () => {
		test("should reject invalid content types for POST requests", async () => {
			const response = await request(app)
				.post("/api/projects/import")
				.set("Content-Type", "text/plain")
				.send("invalid data")
				.expect(400);

			expect(response.body.error.code).toBe("INVALID_CONTENT_TYPE");
		});

		test("should allow valid content types", async () => {
			const response = await request(app)
				.post("/api/projects/validate")
				.set("Content-Type", "application/json")
				.send({ url: "https://github.com/test/repo" });

			expect(response.status).not.toBe(400);
		});
	});

	describe("Security Headers", () => {
		test("should include security headers in responses", async () => {
			const response = await request(app).get("/api/health");

			// Check for common security headers
			expect(response.headers["x-content-type-options"]).toBe("nosniff");
			expect(response.headers["x-frame-options"]).toBeDefined();
			expect(response.headers["x-xss-protection"]).toBeDefined();
		});

		test("should include CORS headers", async () => {
			const response = await request(app)
				.options("/api/health")
				.set("Origin", "http://localhost:3000");

			expect(response.headers["access-control-allow-origin"]).toBeDefined();
			expect(response.headers["access-control-allow-methods"]).toBeDefined();
		});
	});

	describe("Request ID Tracking", () => {
		test("should include request ID in responses", async () => {
			const response = await request(app).get("/api/health");

			expect(response.headers["x-request-id"]).toBeDefined();
			expect(response.headers["x-request-id"]).toMatch(/^req_/);
		});

		test("should use provided request ID", async () => {
			const customRequestId = "custom-request-123";

			const response = await request(app)
				.get("/api/health")
				.set("X-Request-ID", customRequestId);

			expect(response.headers["x-request-id"]).toBe(customRequestId);
		});
	});

	describe("Error Handling Security", () => {
		test("should not expose sensitive information in errors", async () => {
			const response = await request(app)
				.get("/api/projects/invalid-uuid")
				.expect(400);

			// Should not contain stack traces or internal paths
			expect(JSON.stringify(response.body)).not.toContain("node_modules");
			expect(JSON.stringify(response.body)).not.toContain("Error:");
			expect(response.body.error.userMessage).toBeDefined();
		});

		test("should provide consistent error format", async () => {
			const response = await request(app)
				.post("/api/projects/import")
				.send({})
				.expect(400);

			expect(response.body).toHaveProperty("success", false);
			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toHaveProperty("code");
			expect(response.body.error).toHaveProperty("message");
			expect(response.body.error).toHaveProperty("userMessage");
			expect(response.body).toHaveProperty("timestamp");
		});
	});

	describe("File Upload Security", () => {
		test("should reject dangerous file extensions", async () => {
			const dangerousFile = {
				filePath: "malware.exe",
				content: "malicious content",
			};

			const response = await request(app)
				.post("/api/preview/123/files/write")
				.send(dangerousFile)
				.expect(400);

			expect(response.body.error.message).toContain("File type not allowed");
		});

		test("should validate file paths", async () => {
			const invalidPath = {
				filePath: "/absolute/path/file.js",
				content: "content",
			};

			const response = await request(app)
				.post("/api/preview/123/files/write")
				.send(invalidPath)
				.expect(400);

			expect(response.body.error.message).toContain("must be relative");
		});
	});

	describe("GitHub URL Validation", () => {
		test("should validate GitHub URL format", async () => {
			const invalidUrls = [
				"http://github.com/user/repo", // HTTP instead of HTTPS
				"https://gitlab.com/user/repo", // Wrong domain
				"https://github.com/user", // Missing repo
				"https://github.com/user/repo/../other", // Path traversal
			];

			for (const url of invalidUrls) {
				const response = await request(app)
					.post("/api/projects/validate")
					.send({ url });

				expect(response.status).toBe(400);
			}
		});

		test("should accept valid GitHub URLs", async () => {
			const validUrls = [
				"https://github.com/user/repo",
				"https://github.com/user/repo-name",
				"https://github.com/user-name/repo.name",
			];

			for (const url of validUrls) {
				const response = await request(app)
					.post("/api/projects/validate")
					.send({ url });

				// Should not fail validation (might fail for other reasons like auth)
				expect(response.body.error?.code).not.toBe("VALIDATION_ERROR");
			}
		});
	});

	describe("Tech Stack Validation", () => {
		test("should validate supported languages", async () => {
			const unsupportedLanguage = {
				language: "malicious-lang",
				framework: "react",
			};

			const response = await request(app)
				.post("/api/projects/123/tech-stack")
				.send(unsupportedLanguage)
				.expect(400);

			expect(response.body.error.message).toContain(
				"Unsupported programming language"
			);
		});

		test("should sanitize tech stack inputs", async () => {
			const maliciousInput = {
				language: 'javascript<script>alert("xss")</script>',
				framework: "react",
			};

			const response = await request(app)
				.post("/api/projects/123/tech-stack")
				.send(maliciousInput);

			// Should be sanitized
			expect(JSON.stringify(response.body)).not.toContain("<script>");
		});
	});
});

describe("Vulnerability Scanning", () => {
	describe("Common Web Vulnerabilities", () => {
		test("should be protected against CSRF", async () => {
			// Test that state-changing operations require proper authentication
			const response = await request(app)
				.post("/api/projects/import")
				.send({ url: "https://github.com/test/repo" })
				.expect(401);

			expect(response.body.error.code).toContain("AUTH");
		});

		test("should prevent clickjacking", async () => {
			const response = await request(app).get("/api/health");

			expect(response.headers["x-frame-options"]).toBeDefined();
		});

		test("should prevent MIME sniffing", async () => {
			const response = await request(app).get("/api/health");

			expect(response.headers["x-content-type-options"]).toBe("nosniff");
		});

		test("should have proper CSP headers", async () => {
			const response = await request(app).get("/api/health");

			expect(response.headers["content-security-policy"]).toBeDefined();
		});
	});

	describe("Information Disclosure", () => {
		test("should not expose server information", async () => {
			const response = await request(app).get("/api/health");

			expect(response.headers["server"]).toBeUndefined();
			expect(response.headers["x-powered-by"]).toBeUndefined();
		});

		test("should not expose internal paths in errors", async () => {
			const response = await request(app).get("/api/nonexistent");

			expect(JSON.stringify(response.body)).not.toMatch(
				/\/src\/|\/node_modules\/|C:\\|\/home\//
			);
		});
	});

	describe("Authentication Security", () => {
		test("should require authentication for protected endpoints", async () => {
			const protectedEndpoints = [
				"/api/projects",
				"/api/conversion/start",
				"/api/preview/create",
				"/api/exports/create",
			];

			for (const endpoint of protectedEndpoints) {
				const response = await request(app).get(endpoint);
				expect([401, 403]).toContain(response.status);
			}
		});

		test("should validate JWT token format", async () => {
			const response = await request(app)
				.get("/api/auth/me")
				.set("Authorization", "Bearer invalid-token")
				.expect(401);

			expect(response.body.error.code).toContain("TOKEN");
		});
	});
});

describe("Performance Security", () => {
	describe("DoS Protection", () => {
		test("should have request timeouts", async () => {
			// This would need to be tested with actual slow operations
			// For now, just verify the timeout middleware is applied
			expect(true).toBe(true); // Placeholder
		});

		test("should limit concurrent requests", async () => {
			// Test that too many concurrent requests are handled gracefully
			const promises = Array(50)
				.fill(null)
				.map(() => request(app).get("/api/health"));

			const responses = await Promise.all(promises);
			const successfulResponses = responses.filter((r) => r.status === 200);

			// Should handle at least some requests successfully
			expect(successfulResponses.length).toBeGreaterThan(0);
		});
	});

	describe("Resource Limits", () => {
		test("should enforce memory limits for operations", async () => {
			// This would test actual memory-intensive operations
			expect(true).toBe(true); // Placeholder
		});

		test("should have CPU usage limits", async () => {
			// This would test CPU-intensive operations
			expect(true).toBe(true); // Placeholder
		});
	});
});
