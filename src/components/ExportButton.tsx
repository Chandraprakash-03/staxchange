"use client";

import React, { useState } from "react";
import { Project, ConversionJob } from "@/types";
import { ExportDialog, ExportOptions } from "./ExportDialog";

interface ExportButtonProps {
	project: Project;
	conversionJob: ConversionJob;
	className?: string;
	variant?: "primary" | "secondary";
	size?: "sm" | "md" | "lg";
}

export function ExportButton({
	project,
	conversionJob,
	className = "",
	variant = "primary",
	size = "md",
}: ExportButtonProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);

	const handleExport = async (options: ExportOptions) => {
		try {
			setIsExporting(true);
			setExportError(null);

			const response = await fetch("/api/exports", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					projectId: project.id,
					conversionJobId: conversionJob.id,
					options,
				}),
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || "Export failed");
			}

			// Trigger download
			const downloadUrl = result.data.downloadUrl;
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = result.data.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error("Export failed:", error);
			setExportError(error instanceof Error ? error.message : "Export failed");
		} finally {
			setIsExporting(false);
		}
	};

	const getButtonClasses = () => {
		const baseClasses =
			"inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		const sizeClasses = {
			sm: "px-3 py-1.5 text-sm",
			md: "px-4 py-2 text-sm",
			lg: "px-6 py-3 text-base",
		};

		const variantClasses = {
			primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
			secondary:
				"bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
		};

		return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
	};

	const isDisabled =
		project.status !== "completed" || conversionJob.status !== "completed";

	return (
		<>
			<button
				onClick={() => setIsDialogOpen(true)}
				disabled={isDisabled || isExporting}
				className={getButtonClasses()}
				title={
					isDisabled
						? "Project must be fully converted before export"
						: "Export converted project"
				}
			>
				{isExporting ? (
					<>
						<svg
							className="animate-spin -ml-1 mr-2 h-4 w-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Exporting...
					</>
				) : (
					<>
						<svg
							className="w-4 h-4 mr-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						Export Project
					</>
				)}
			</button>

			{exportError && (
				<div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
					<p className="text-sm text-red-600">{exportError}</p>
				</div>
			)}

			<ExportDialog
				project={project}
				conversionJob={conversionJob}
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				onExport={handleExport}
			/>
		</>
	);
}
