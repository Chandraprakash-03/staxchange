import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "@/components/ExportButton";
import { Project, ConversionJob } from "@/types";

// Mock fetch
global.fetch = vi.fn();

describe("ExportButton", () => {
	let mockProject: Project;
	let mockConversionJob: ConversionJob;

	beforeEach(() => {
		mockProject = {
			id: "project-123",
			name: "Test Project",
			githubUrl: "https://github.com/user/test-project",
			userId: "user-123",
			originalTechStack: {
				language: "javascript",
				framework: "react",
				additional: {},
			},
			targetTechStack: {
				language: "typescript",
				framework: "next",
				additional: {},
			},
			status: "completed",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		mockConversionJob = {
			id: "job-123",
			projectId: "project-123",
			plan: {
				id: "plan-123",
				projectId: "project-123",
				tasks: [],
				estimatedDuration: 3600,
				complexity: "medium",
				warnings: [],
				feasible: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			status: "completed",
			progress: 100,
			createdAt: new Date(),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should render export button", () => {
		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toBeInTheDocument();
	});

	it("should be disabled when project is not completed", () => {
		const incompleteProject = { ...mockProject, status: "converting" as const };

		render(
			<ExportButton
				project={incompleteProject}
				conversionJob={mockConversionJob}
			/>
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toBeDisabled();
	});

	it("should be disabled when conversion job is not completed", () => {
		const incompleteJob = { ...mockConversionJob, status: "running" as const };

		render(
			<ExportButton project={mockProject} conversionJob={incompleteJob} />
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toBeDisabled();
	});

	it("should open export dialog when clicked", async () => {
		const user = userEvent.setup();

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		expect(screen.getByText("Export Project")).toBeInTheDocument();
		expect(
			screen.getByText(/export your converted project/i)
		).toBeInTheDocument();
	});

	it("should close dialog when cancel is clicked", async () => {
		const user = userEvent.setup();

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		// Open dialog
		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		// Close dialog
		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		await user.click(cancelButton);

		expect(screen.queryByText("Export Project")).not.toBeInTheDocument();
	});

	it("should handle successful export", async () => {
		const user = userEvent.setup();

		// Mock successful API response
		const mockResponse = {
			success: true,
			data: {
				id: "export-123",
				downloadUrl: "/api/exports/export-123/download",
				filename: "test-project-converted.zip",
			},
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			json: () => Promise.resolve(mockResponse),
		});

		// Mock DOM methods for download
		const createElementSpy = vi.spyOn(document, "createElement");
		const appendChildSpy = vi.spyOn(document.body, "appendChild");
		const removeChildSpy = vi.spyOn(document.body, "removeChild");

		const mockLink = {
			href: "",
			download: "",
			click: vi.fn(),
		};

		createElementSpy.mockReturnValue(mockLink as any);
		appendChildSpy.mockImplementation(() => mockLink as any);
		removeChildSpy.mockImplementation(() => mockLink as any);

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		// Open dialog
		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		// Start export
		const exportButton = screen.getByRole("button", {
			name: /export project/i,
		});
		await user.click(exportButton);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith("/api/exports", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					projectId: "project-123",
					conversionJobId: "job-123",
					options: {
						includeSourceFiles: true,
						includeTests: true,
						includeDocs: true,
						format: "zip",
					},
				}),
			});
		});

		// Verify download was triggered
		expect(mockLink.href).toBe("/api/exports/export-123/download");
		expect(mockLink.download).toBe("test-project-converted.zip");
		expect(mockLink.click).toHaveBeenCalled();

		// Cleanup spies
		createElementSpy.mockRestore();
		appendChildSpy.mockRestore();
		removeChildSpy.mockRestore();
	});

	it("should handle export failure", async () => {
		const user = userEvent.setup();

		// Mock failed API response
		const mockResponse = {
			success: false,
			error: "Export failed",
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			json: () => Promise.resolve(mockResponse),
		});

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		// Open dialog
		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		// Start export
		const exportButton = screen.getByRole("button", {
			name: /export project/i,
		});
		await user.click(exportButton);

		await waitFor(() => {
			expect(screen.getByText("Export failed")).toBeInTheDocument();
		});
	});

	it("should handle network errors", async () => {
		const user = userEvent.setup();

		// Mock network error
		(global.fetch as Mock).mockRejectedValueOnce(new Error("Network error"));

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		// Open dialog
		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		// Start export
		const exportButton = screen.getByRole("button", {
			name: /export project/i,
		});
		await user.click(exportButton);

		await waitFor(() => {
			expect(screen.getByText("Network error")).toBeInTheDocument();
		});
	});

	it("should show loading state during export", async () => {
		const user = userEvent.setup();

		// Mock delayed API response
		let resolvePromise: (value: any) => void;
		const delayedPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		(global.fetch as Mock).mockReturnValueOnce({
			json: () => delayedPromise,
		});

		render(
			<ExportButton project={mockProject} conversionJob={mockConversionJob} />
		);

		// Open dialog
		const button = screen.getByRole("button", { name: /export project/i });
		await user.click(button);

		// Start export
		const exportButton = screen.getByRole("button", {
			name: /export project/i,
		});
		await user.click(exportButton);

		// Check loading state
		expect(screen.getByText("Exporting...")).toBeInTheDocument();
		expect(exportButton).toBeDisabled();

		// Resolve the promise
		resolvePromise!({
			success: true,
			data: { downloadUrl: "/test", filename: "test.zip" },
		});

		await waitFor(() => {
			expect(screen.queryByText("Exporting...")).not.toBeInTheDocument();
		});
	});

	it("should apply custom className", () => {
		render(
			<ExportButton
				project={mockProject}
				conversionJob={mockConversionJob}
				className="custom-class"
			/>
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toHaveClass("custom-class");
	});

	it("should render with different variants", () => {
		const { rerender } = render(
			<ExportButton
				project={mockProject}
				conversionJob={mockConversionJob}
				variant="secondary"
			/>
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toHaveClass("bg-gray-100");

		rerender(
			<ExportButton
				project={mockProject}
				conversionJob={mockConversionJob}
				variant="primary"
			/>
		);

		expect(button).toHaveClass("bg-blue-600");
	});

	it("should render with different sizes", () => {
		const { rerender } = render(
			<ExportButton
				project={mockProject}
				conversionJob={mockConversionJob}
				size="sm"
			/>
		);

		const button = screen.getByRole("button", { name: /export project/i });
		expect(button).toHaveClass("px-3", "py-1.5");

		rerender(
			<ExportButton
				project={mockProject}
				conversionJob={mockConversionJob}
				size="lg"
			/>
		);

		expect(button).toHaveClass("px-6", "py-3");
	});
});
