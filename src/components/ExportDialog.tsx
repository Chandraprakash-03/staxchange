"use client";

import React, { useState } from "react";
import { Project, ConversionJob } from "@/types";

interface ExportDialogProps {
	project: Project;
	conversionJob: ConversionJob;
	isOpen: boolean;
	onClose: () => void;
	onExport: (options: ExportOptions) => Promise<void>;
}

export interface ExportOptions {
	includeSourceFiles?: boolean;
	includeTests?: boolean;
	includeDocs?: boolean;
	format?: "zip" | "tar";
}

export function ExportDialog({
	project,
	conversionJob,
	isOpen,
	onClose,
	onExport,
}: ExportDialogProps) {
	const [options, setOptions] = useState<ExportOptions>({
		includeSourceFiles: true,
		includeTests: true,
		includeDocs: true,
		format: "zip",
	});
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		try {
			setIsExporting(true);
			await onExport(options);
			onClose();
		} catch (error) {
			console.error("Export failed:", error);
		} finally {
			setIsExporting(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">Export Project</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
						disabled={isExporting}
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="mb-4">
					<p className="text-sm text-gray-600 mb-4">
						Export your converted project as a downloadable package with setup
						instructions and migration scripts.
					</p>

					<div className="space-y-3">
						<div className="flex items-center">
							<input
								type="checkbox"
								id="includeSourceFiles"
								checked={options.includeSourceFiles}
								onChange={(e) =>
									setOptions({
										...options,
										includeSourceFiles: e.target.checked,
									})
								}
								className="mr-2"
								disabled={isExporting}
							/>
							<label htmlFor="includeSourceFiles" className="text-sm">
								Include source files
							</label>
						</div>

						<div className="flex items-center">
							<input
								type="checkbox"
								id="includeTests"
								checked={options.includeTests}
								onChange={(e) =>
									setOptions({ ...options, includeTests: e.target.checked })
								}
								className="mr-2"
								disabled={isExporting}
							/>
							<label htmlFor="includeTests" className="text-sm">
								Include test files
							</label>
						</div>

						<div className="flex items-center">
							<input
								type="checkbox"
								id="includeDocs"
								checked={options.includeDocs}
								onChange={(e) =>
									setOptions({ ...options, includeDocs: e.target.checked })
								}
								className="mr-2"
								disabled={isExporting}
							/>
							<label htmlFor="includeDocs" className="text-sm">
								Include documentation
							</label>
						</div>

						<div className="mt-4">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Archive Format
							</label>
							<select
								value={options.format}
								onChange={(e) =>
									setOptions({
										...options,
										format: e.target.value as "zip" | "tar",
									})
								}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								disabled={isExporting}
							>
								<option value="zip">ZIP Archive</option>
								<option value="tar">TAR Archive</option>
							</select>
						</div>
					</div>
				</div>

				<div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
					<h3 className="text-sm font-medium text-blue-800 mb-1">
						What's included:
					</h3>
					<ul className="text-xs text-blue-700 space-y-1">
						<li>• Converted source code</li>
						<li>• Setup instructions (SETUP.md)</li>
						<li>• Migration scripts</li>
						<li>• Configuration files</li>
						<li>• Comprehensive README</li>
						<li>• Package manifest</li>
					</ul>
				</div>

				<div className="flex justify-end space-x-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
						disabled={isExporting}
					>
						Cancel
					</button>
					<button
						onClick={handleExport}
						disabled={isExporting}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
					>
						{isExporting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
							"Export Project"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
