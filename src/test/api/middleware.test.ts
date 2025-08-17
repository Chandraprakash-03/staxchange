import { describe, it, expect } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
	handleValidationErrors,
	sanitizeInput,
	validateContentType,
	requestId,
	requestSizeLimit,
} from "@/middleware";

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Request =>
	({
		body: {},
		query: {},
		params: {},
		headers: {},
		method: "GET",
		path: "/test",
		ip: "127.0.0.1",
		get: (header: string) => (overrides as any).headers?.[header.toLowerCase()],
		...overrides,
	} as Request);

const createMockResponse = (): Response => {
	const res = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		setHeader: jest.fn().mockReturnThis(),
		getHeader: jest.fn(),
	} as any;
	return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe("Middleware Tests", () => {
	describe("sanitizeInput", () => {
		it("should sanitize script tags from request body", () => {
			const req = createMockRequest({
				body: {
					message: '<script>alert("xss")</script>Hello World',
					nested: {
						value: "<script>malicious()</script>Clean text",
					},
				},
			});
			const res = createMockResponse();
			const next = createMockNext();

			sanitizeInput(req, res, next);

			expect(req.body.message).toBe("Hello World");
			expect(req.body.nested.value).toBe("Clean text");
			expect(next).toHaveBeenCalled();
		});

		it("should sanitize arrays in request body", () => {
			const req = createMockRequest({
				body: {
					items: ["<script>alert(1)</script>Item 1", "Item 2"],
				},
			});
			const res = createMockResponse();
			const next = createMockNext();

			sanitizeInput(req, res, next);

			expect(req.body.items[0]).toBe("Item 1");
			expect(req.body.items[1]).toBe("Item 2");
			expect(next).toHaveBeenCalled();
		});

		it("should trim whitespace from strings", () => {
			const req = createMockRequest({
				body: {
					message: "  Hello World  ",
				},
			});
			const res = createMockResponse();
			const next = createMockNext();

			sanitizeInput(req, res, next);

			expect(req.body.message).toBe("Hello World");
			expect(next).toHaveBeenCalled();
		});
	});

	describe("validateContentType", () => {
		it("should allow valid content types", () => {
			const middleware = validateContentType(["application/json"]);
			const req = createMockRequest({
				method: "POST",
				headers: { "content-type": "application/json" },
			});
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
		});

		it("should skip validation for GET requests", () => {
			const middleware = validateContentType(["application/json"]);
			const req = createMockRequest({
				method: "GET",
			});
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
		});

		it("should reject invalid content types", () => {
			const middleware = validateContentType(["application/json"]);
			const req = createMockRequest({
				method: "POST",
				headers: { "content-type": "text/plain" },
			});
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "INVALID_CONTENT_TYPE",
				})
			);
		});
	});

	describe("requestId", () => {
		it("should add request ID to request and response", () => {
			const req = createMockRequest();
			const res = createMockResponse();
			const next = createMockNext();

			requestId(req, res, next);

			expect((req as any).requestId).toBeDefined();
			expect(res.setHeader).toHaveBeenCalledWith(
				"X-Request-ID",
				expect.any(String)
			);
			expect(next).toHaveBeenCalled();
		});

		it("should use existing request ID from headers", () => {
			const existingId = "existing-request-id";
			const req = createMockRequest({
				headers: { "x-request-id": existingId },
			});
			const res = createMockResponse();
			const next = createMockNext();

			requestId(req, res, next);

			expect((req as any).requestId).toBe(existingId);
			expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", existingId);
			expect(next).toHaveBeenCalled();
		});
	});

	describe("requestSizeLimit", () => {
		it("should allow requests within size limit", () => {
			const middleware = requestSizeLimit("1mb");
			const req = createMockRequest({
				headers: { "content-length": "1000" }, // 1KB
			});
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
		});

		it("should reject requests exceeding size limit", () => {
			const middleware = requestSizeLimit("1kb");
			const req = createMockRequest({
				headers: { "content-length": "2000" }, // 2KB
			});
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "REQUEST_TOO_LARGE",
				})
			);
		});

		it("should allow requests without content-length header", () => {
			const middleware = requestSizeLimit("1mb");
			const req = createMockRequest();
			const res = createMockResponse();
			const next = createMockNext();

			middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
		});
	});
});

// Mock jest functions for testing
const jest = {
	fn: () => {
		const mockFn = (...args: any[]) => mockFn;
		mockFn.mockReturnThis = () => mockFn;
		mockFn.toHaveBeenCalled = () => true;
		mockFn.toHaveBeenCalledWith = () => true;
		return mockFn;
	},
};
