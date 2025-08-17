"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store";
import { useProjectNavigation } from "@/hooks/useNavigation";
import { TechStackSelectionContainer } from "@/components/selection";
import { ProjectImportContainer } from "@/components/import";
import { TechStack } from "@/types";

export default function ProjectPage() {
	const params = useParams();
	const projectId = params.id as string;

	const {
		currentProject,
		setCurrentProject,
		projects,
		updateProject,
		isLoading,
		setLoading,
		setError,
	} = useAppStore();

	const { getCurrentStep, navigateToStep, getSearchParam } =
		useProjectNavigation(projectId);

	const currentStep = getCurrentStep();

	// Load project if not in store
	useEffect(() => {
		if (!currentProject || currentProject.id !== projectId) {
			const project = projects.find((p) => p.id === projectId);
			if (project) {
				setCurrentProject(project);
			} else {
				// TODO: Fetch project from API
				setError("Project not found");
			}
		}
	}, [projectId, currentProject, projects, setCurrentProject, setError]);

	const handleTechStackSelection = async (targetStack: TechStack) => {
		if (!currentProject) return;

		setLoading(true);
		try {
			// Update project with target tech stack
			const updatedProject = {
				...currentProject,
				targetTechStack: targetStack,
				status: "ready" as const,
			};

			updateProject(projectId, {
				targetTechStack: targetStack,
				status: "ready",
			});

			// Navigate to conversion step
			navigateToStep("convert");
		} catch (error) {
			setError("Failed to update project");
		} finally {
			setLoading(false);
		}
	};

	const handleBackToImport = () => {
		navigateToStep("import");
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

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-6xl mx-auto">
					{/* Project Header */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-2xl font-bold text-gray-900 mb-2">
									{currentProject.name}
								</h1>
								<p className="text-gray-600">{currentProject.githubUrl}</p>
							</div>

							{/* Step Indicator */}
							<div className="flex items-center space-x-4">
								<div
									className={`flex items-center ${
										currentStep === "import" ? "text-blue-600" : "text-gray-400"
									}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
											currentStep === "import"
												? "bg-blue-100 text-blue-600"
												: "bg-gray-100 text-gray-400"
										}`}
									>
										1
									</div>
									<span className="ml-2 text-sm font-medium">Import</span>
								</div>

								<div className="w-8 h-px bg-gray-300"></div>

								<div
									className={`flex items-center ${
										currentStep === "select" ? "text-blue-600" : "text-gray-400"
									}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
											currentStep === "select"
												? "bg-blue-100 text-blue-600"
												: "bg-gray-100 text-gray-400"
										}`}
									>
										2
									</div>
									<span className="ml-2 text-sm font-medium">Select Stack</span>
								</div>

								<div className="w-8 h-px bg-gray-300"></div>

								<div
									className={`flex items-center ${
										currentStep === "convert"
											? "text-blue-600"
											: "text-gray-400"
									}`}
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
											currentStep === "convert"
												? "bg-blue-100 text-blue-600"
												: "bg-gray-100 text-gray-400"
										}`}
									>
										3
									</div>
									<span className="ml-2 text-sm font-medium">Convert</span>
								</div>
							</div>
						</div>
					</div>

					{/* Step Content */}
					{currentStep === "select" && (
						<TechStackSelectionContainer
							project={currentProject}
							onContinue={handleTechStackSelection}
							onBack={handleBackToImport}
						/>
					)}

					{currentStep === "import" && (
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<div className="text-center">
								<h2 className="text-xl font-semibold text-gray-900 mb-4">
									Project Successfully Imported
								</h2>
								<p className="text-gray-600 mb-6">
									Your project has been analyzed and is ready for tech stack
									selection.
								</p>
								<button
									onClick={() => navigateToStep("select")}
									className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
								>
									Select Target Tech Stack
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
