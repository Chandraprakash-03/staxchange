"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store";
import { useProjectNavigation } from "@/hooks/useNavigation";
import { LivePreviewInterface } from "@/components/preview";
import { ExportButton } from "@/components/ExportButton";

export default function PreviewPage() {
	const params = useParams();
	const projectId = params.id as string;

	const { currentProject, activeConversion, isLoading, setLoading, setError } =
		useAppStore();

	const { navigateToStep } = useProjectNavigation(projectId);
	const [previewReady, setPreviewReady] = useState(false);

	// Check if conversion is completed
	useEffect(() => {
		if (!activeConversion || activeConversion.status !== "completed") {
			// Redirect back to conversion if not completed
			navigateToStep("convert");
			return;
		}

		// Simulate preview initialization
		setLoading(true);
		const timer = setTimeout(() => {
			setPreviewReady(true);
			setLoading(false);
		}, 2000);

		return () => clearTimeout(timer);
	}, [activeConversion, navigateToStep, setLoading]);

	const handleEditCode = (filePath: string, newContent: string) => {
		// Handle code editing in preview
		console.log("Editing file:", filePath, newContent);
	};

	const handlePreviewError = (error: string) => {
		setError(`Preview error: ${error}`);
	};

	if (!currentProject) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading project...</p>
				</div>
			</div>
		);
	}

	if (!previewReady) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Initializing preview environment...</p>
					<p className="text-sm text-gray-500 mt-2">
						This may take a few moments
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen bg-gray-900 flex flex-col">
			{/* Header */}
			<div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<button
						onClick={() => navigateToStep("convert")}
						className="text-gray-300 hover:text-white"
					>
						← Back
					</button>

					<div>
						<h1 className="text-white font-semibold">
							{currentProject.name} - Live Preview
						</h1>
						<p className="text-gray-400 text-sm">
							Converted to {currentProject.targetTechStack?.language}
							{currentProject.targetTechStack?.framework &&
								` + ${currentProject.targetTechStack.framework}`}
						</p>
					</div>
				</div>

				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-2">
						<div className="w-2 h-2 bg-green-400 rounded-full"></div>
						<span className="text-green-400 text-sm">Preview Active</span>
					</div>

					<ExportButton
						projectId={projectId}
						className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
					/>
				</div>
			</div>

			{/* Preview Interface */}
			<div className="flex-1 overflow-hidden">
				<LivePreviewInterface
					projectId={projectId}
					files={[
						{
							path: "/src/App.tsx",
							content: `import React from 'react';

function App() {
  const targetLang = '${
		currentProject.targetTechStack?.language || "TypeScript"
	}';
  const targetFramework = '${
		currentProject.targetTechStack?.framework || "React"
	}';
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎉 Conversion Successful!
        </h1>
        <p className="text-gray-600 mb-4">
          Your project has been successfully converted to {targetLang} with {targetFramework}.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-green-800 font-semibold mb-2">What's New:</h2>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Modern syntax and best practices</li>
            <li>• Updated dependencies and configurations</li>
            <li>• Improved type safety</li>
            <li>• Enhanced performance optimizations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;`,
							language: "typescript",
						},
						{
							path: "/package.json",
							content: JSON.stringify(
								{
									name: currentProject.name.toLowerCase().replace(/\s+/g, "-"),
									version: "1.0.0",
									private: true,
									dependencies: {
										react: "^18.2.0",
										"react-dom": "^18.2.0",
										typescript: "^5.0.0",
									},
									scripts: {
										start: "react-scripts start",
										build: "react-scripts build",
										test: "react-scripts test",
									},
								},
								null,
								2
							),
							language: "json",
						},
					]}
					onFileChange={handleEditCode}
					onError={handlePreviewError}
				/>
			</div>
		</div>
	);
}
