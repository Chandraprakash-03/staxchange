import { NextRequest, NextResponse } from "next/server";
import { exportService } from "@/services/export";
import { projectService } from "@/services/project";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { projectId, conversionJobId, options = {} } = body;

		// Validate required parameters
		if (!projectId) {
			return NextResponse.json(
				{ success: false, error: "Project ID is required" },
				{ status: 400 }
			);
		}

		if (!conversionJobId) {
			return NextResponse.json(
				{ success: false, error: "Conversion job ID is required" },
				{ status: 400 }
			);
		}

		// Verify project exists
		const project = await projectService.getProject(projectId);
		if (!project) {
			return NextResponse.json(
				{ success: false, error: "Project not found" },
				{ status: 404 }
			);
		}

		// Verify project has been converted
		if (project.status !== "completed") {
			return NextResponse.json(
				{
					success: false,
					error: "Project conversion must be completed before export",
				},
				{ status: 400 }
			);
		}

		// Create export
		const exportResult = await exportService.exportProject(
			projectId,
			conversionJobId,
			options
		);

		return NextResponse.json({
			success: true,
			data: exportResult,
			message: "Export created successfully",
		});
	} catch (error) {
		console.error("Export creation failed:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to create export",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId");

		if (!projectId) {
			return NextResponse.json(
				{ success: false, error: "Project ID is required" },
				{ status: 400 }
			);
		}

		// Get export history for project (placeholder implementation)
		// In a real implementation, you'd store export records in the database
		const exports = []; // await exportService.getExportHistory(projectId);

		return NextResponse.json({
			success: true,
			data: exports,
			message: "Export history retrieved successfully",
		});
	} catch (error) {
		console.error("Failed to get export history:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to get export history",
			},
			{ status: 500 }
		);
	}
}
