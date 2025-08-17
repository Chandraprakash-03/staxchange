import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

interface RouteParams {
	params: {
		exportId: string;
	};
}

export async function GET(request: NextRequest, { params }: RouteParams) {
	try {
		const { exportId } = params;

		if (!exportId) {
			return NextResponse.json(
				{ success: false, error: "Export ID is required" },
				{ status: 400 }
			);
		}

		// Validate export ID format (basic UUID validation)
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(exportId)) {
			return NextResponse.json(
				{ success: false, error: "Invalid export ID format" },
				{ status: 400 }
			);
		}

		const exportDir = process.env.EXPORT_DIR || "./storage/exports";

		// Try both zip and tar formats
		let archivePath: string | null = null;
		let filename: string | null = null;
		let mimeType: string | null = null;

		// Check for ZIP file
		const zipPath = path.join(exportDir, `${exportId}.zip`);
		try {
			await fs.access(zipPath);
			archivePath = zipPath;
			filename = `export-${exportId}.zip`;
			mimeType = "application/zip";
		} catch {
			// Check for TAR file
			const tarPath = path.join(exportDir, `${exportId}.tar`);
			try {
				await fs.access(tarPath);
				archivePath = tarPath;
				filename = `export-${exportId}.tar`;
				mimeType = "application/x-tar";
			} catch {
				// Check for TAR.GZ file
				const tarGzPath = path.join(exportDir, `${exportId}.tar.gz`);
				try {
					await fs.access(tarGzPath);
					archivePath = tarGzPath;
					filename = `export-${exportId}.tar.gz`;
					mimeType = "application/gzip";
				} catch {
					// No archive found
				}
			}
		}

		if (!archivePath || !filename || !mimeType) {
			return NextResponse.json(
				{ success: false, error: "Export file not found or has expired" },
				{ status: 404 }
			);
		}

		// Check if file exists and get stats
		let fileStats;
		try {
			fileStats = await fs.stat(archivePath);
		} catch {
			return NextResponse.json(
				{ success: false, error: "Export file not found" },
				{ status: 404 }
			);
		}

		// Check if export has expired (24 hours)
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		const fileAge = Date.now() - fileStats.mtime.getTime();

		if (fileAge > maxAge) {
			// Clean up expired file
			try {
				await fs.unlink(archivePath);
			} catch {
				// Ignore cleanup errors
			}

			return NextResponse.json(
				{
					success: false,
					error: "Export has expired. Please create a new export.",
				},
				{ status: 410 }
			);
		}

		// Read the file
		const fileBuffer = await fs.readFile(archivePath);

		// Create response with appropriate headers
		const response = new NextResponse(fileBuffer, {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Length": fileStats.size.toString(),
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});

		return response;
	} catch (error) {
		console.error("Download failed:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to download export",
			},
			{ status: 500 }
		);
	}
}
