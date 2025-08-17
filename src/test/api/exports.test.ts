import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/exports/route";
import { exportService } from "@/services/export";
import { projectService } from "@/services/project";

// Mock dependencies
vi.mock("@/services/export");
vi.mock("@/services/project");

describe("/api/exports", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /api/exports", () => {
		it("should create export successfully", async () => {
			// Arrange
			const mockProject = {
				id: "project-123",
				name: "Test Project",
				status: "completed",
				originalTechStack: { language: "javascript", additional: {} },
				targetTechStack: { language: "typescript", additional: {} },
			};

			const mockExportResult = {
				id: "export-123",
				projectId: "project-123",
				downloadUrl: "/api/exports/export-123/download",
				filename: "test-project-converted.zip",
				size: 1024,
				createdAt: new Date(),
				expiresAt: new Date(),
			};

			(projectService.getProject as Mock).mockResolvedValue(mockProject);
			(exportService.exportProject as Mock).mockResolvedValue(mockExportResult);

			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					projectId: "project-123",
					conversionJobId: "job-123",
					options: { format: "zip" },
				}),
			});

			// Act
			const response = await POST(request);
			const result = await response.json();

			// Assert
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				...mockExportResult,
				createdAt: mockExportResult.createdAt.toISOString(),
				expiresAt: mockExportResult.expiresAt.toISOString(),
			});
			expect(projectService.getProject).toHaveBeenCalledWith("project-123");
			expect(exportService.exportProject).toHaveBeenCalledWith(
				"project-123",
				"job-123",
				{ format: "zip" }
			);
		});

		it("should return 400 if projectId is missing", async () => {
			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					conversionJobId: "job-123",
				}),
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Project ID is required");
		});

		it("should return 400 if conversionJobId is missing", async () => {
			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					projectId: "project-123",
				}),
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Conversion job ID is required");
		});

		it("should return 404 if project not found", async () => {
			(projectService.getProject as Mock).mockResolvedValue(null);

			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					projectId: "nonexistent-project",
					conversionJobId: "job-123",
				}),
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Project not found");
		});

		it("should return 400 if project is not completed", async () => {
			const incompleteProject = {
				id: "project-123",
				status: "converting",
			};

			(projectService.getProject as Mock).mockResolvedValue(incompleteProject);

			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					projectId: "project-123",
					conversionJobId: "job-123",
				}),
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toBe(
				"Project conversion must be completed before export"
			);
		});

		it("should handle export service errors", async () => {
			const mockProject = {
				id: "project-123",
				status: "completed",
			};

			(projectService.getProject as Mock).mockResolvedValue(mockProject);
			(exportService.exportProject as Mock).mockRejectedValue(
				new Error("Export failed")
			);

			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: JSON.stringify({
					projectId: "project-123",
					conversionJobId: "job-123",
				}),
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Export failed");
		});

		it("should handle malformed JSON", async () => {
			const request = new NextRequest("http://localhost/api/exports", {
				method: "POST",
				body: "invalid json",
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe("GET /api/exports", () => {
		it("should return export history for project", async () => {
			const request = new NextRequest(
				"http://localhost/api/exports?projectId=project-123"
			);

			const response = await GET(request);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toEqual([]);
		});

		it("should return 400 if projectId is missing", async () => {
			const request = new NextRequest("http://localhost/api/exports");

			const response = await GET(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Project ID is required");
		});

		it("should handle service errors", async () => {
			// Mock console.error to avoid test output noise
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const request = new NextRequest(
				"http://localhost/api/exports?projectId=project-123"
			);

			// Force an error by mocking URL constructor to throw
			const originalURL = global.URL;
			global.URL = vi.fn().mockImplementation(() => {
				throw new Error("URL parsing failed");
			}) as any;

			const response = await GET(request);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);

			// Restore
			global.URL = originalURL;
			consoleSpy.mockRestore();
		});
	});
});
