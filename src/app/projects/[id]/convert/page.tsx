"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store";
import { useProjectNavigation } from "@/hooks/useNavigation";
import { ConversionProgressMonitor } from "@/components/conversion";
import { ConversionJob } from "@/types";

export default function ConvertPage() {
	const params = useParams();
	const projectId = params.id as string;

	const {
		currentProject,
		activeConversion,
		setActiveConversion,
		addConversionToHistory,
		isLoading,
		setLoading,
		setError,
	} = useAppStore();

	const { navigateToStep } = useProjectNavigation(projectId);
	const [conversionStarted, setConversionStarted] = useState(false);

	// Check if project has target tech stack
	useEffect(() => {
		if (currentProject && !currentProject.targetTechStack) {
			// Redirect back to selection if no target stack
			navigateToStep("select");
		}
	}, [currentProject, navigateToStep]);

	const startConversion = async () => {
		if (!currentProject || !currentProject.targetTechStack) return;

		setLoading(true);
		setConversionStarted(true);

		try {
			// Create mock conversion job for demo
			const conversionJob: ConversionJob = {
				id: `conv_${Date.now()}`,
				projectId: currentProject.id,
				plan: {
					id: `plan_${Date.now()}`,
					projectId: currentProject.id,
					tasks: [
						{
							id: "task_1",
							type: "analysis",
							description: "Analyzing project structure and dependencies",
							inputFiles: ["package.json", "src/**/*.js"],
							outputFiles: [],
							dependencies: [],
							agentType: "analysis",
							priority: 1,
						},
						{
							id: "task_2",
							type: "planning",
							description: "Creating conversion plan",
							inputFiles: [],
							outputFiles: ["conversion-plan.json"],
							dependencies: ["task_1"],
							agentType: "planning",
							priority: 2,
						},
						{
							id: "task_3",
							type: "code_generation",
							description: "Converting source code files",
							inputFiles: ["src/**/*.js"],
							outputFiles: ["src/**/*.ts"],
							dependencies: ["task_2"],
							agentType: "code_generation",
							priority: 3,
						},
					],
					estimatedDuration: 300, // 5 minutes
					complexity: "medium",
					warnings: [],
				},
				status: "running",
				progress: 0,
				currentTask: "Analyzing project structure and dependencies",
				startedAt: new Date(),
				completedAt: undefined,
				errorMessage: undefined,
			};

			setActiveConversion(conversionJob);

			// Simulate conversion progress
			simulateConversionProgress(conversionJob);
		} catch (error) {
			setError("Failed to start conversion");
			setConversionStarted(false);
		} finally {
			setLoading(false);
		}
	};

	const simulateConversionProgress = (job: ConversionJob) => {
		let progress = 0;
		const tasks = job.plan.tasks;
		let currentTaskIndex = 0;

		const interval = setInterval(() => {
			progress += Math.random() * 10;

			if (progress >= 100) {
				progress = 100;
				const completedJob = {
					...job,
					status: "completed" as const,
					progress: 100,
					currentTask: "Conversion completed successfully",
					completedAt: new Date(),
				};

				setActiveConversion(completedJob);
				addConversionToHistory(completedJob);
				clearInterval(interval);

				// Navigate to preview after completion
				setTimeout(() => {
					navigateToStep("preview");
				}, 2000);

				return;
			}

			// Update current task based on progress
			const taskProgress = (progress / 100) * tasks.length;
			const newTaskIndex = Math.floor(taskProgress);

			if (newTaskIndex !== currentTaskIndex && newTaskIndex < tasks.length) {
				currentTaskIndex = newTaskIndex;
			}

			const updatedJob = {
				...job,
				progress: Math.round(progress),
				currentTask: tasks[currentTaskIndex]?.description || "Processing...",
			};

			setActiveConversion(updatedJob);
		}, 1000);
	};

	const handlePauseConversion = () => {
		if (activeConversion) {
			setActiveConversion({
				...activeConversion,
				status: "paused",
			});
		}
	};

	const handleResumeConversion = () => {
		if (activeConversion) {
			setActiveConversion({
				...activeConversion,
				status: "running",
			});
		}
	};

	const handleCancelConversion = () => {
		setActiveConversion(null);
		setConversionStarted(false);
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
					{/* Header */}
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-2xl font-bold text-gray-900 mb-2">
									Convert {currentProject.name}
								</h1>
								<p className="text-gray-600">
									Converting from {currentProject.originalTechStack.language} to{" "}
									{currentProject.targetTechStack?.language}
								</p>
							</div>

							<button
								onClick={() => navigateToStep("select")}
								className="text-blue-600 hover:text-blue-700 font-medium"
							>
								← Back to Selection
							</button>
						</div>
					</div>

					{/* Conversion Interface */}
					{!conversionStarted ? (
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
							<div className="text-center">
								<div className="mb-6">
									<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<svg
											className="w-8 h-8 text-blue-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
									</div>
									<h2 className="text-2xl font-bold text-gray-900 mb-2">
										Ready to Convert
									</h2>
									<p className="text-gray-600 max-w-2xl mx-auto">
										Your project is ready for conversion. This process will
										analyze your code, create a conversion plan, and generate
										the converted files using AI agents.
									</p>
								</div>

								{/* Conversion Summary */}
								<div className="bg-gray-50 rounded-lg p-6 mb-8">
									<div className="grid md:grid-cols-2 gap-6">
										<div>
											<h3 className="font-semibold text-gray-900 mb-2">From</h3>
											<div className="text-sm text-gray-600">
												<p>
													Language: {currentProject.originalTechStack.language}
												</p>
												{currentProject.originalTechStack.framework && (
													<p>
														Framework:{" "}
														{currentProject.originalTechStack.framework}
													</p>
												)}
												{currentProject.originalTechStack.database && (
													<p>
														Database:{" "}
														{currentProject.originalTechStack.database}
													</p>
												)}
											</div>
										</div>

										<div>
											<h3 className="font-semibold text-gray-900 mb-2">To</h3>
											<div className="text-sm text-gray-600">
												<p>
													Language: {currentProject.targetTechStack?.language}
												</p>
												{currentProject.targetTechStack?.framework && (
													<p>
														Framework:{" "}
														{currentProject.targetTechStack.framework}
													</p>
												)}
												{currentProject.targetTechStack?.database && (
													<p>
														Database: {currentProject.targetTechStack.database}
													</p>
												)}
											</div>
										</div>
									</div>
								</div>

								<button
									onClick={startConversion}
									disabled={isLoading}
									className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading ? "Starting Conversion..." : "Start Conversion"}
								</button>
							</div>
						</div>
					) : (
						<ConversionProgressMonitor
							conversion={activeConversion}
							onPause={handlePauseConversion}
							onResume={handleResumeConversion}
							onCancel={handleCancelConversion}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
