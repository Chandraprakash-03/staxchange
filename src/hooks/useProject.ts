"use client";

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/store";
import { Project, TechStack, ConversionJob } from "@/types";

export function useProject(projectId?: string) {
	const {
		currentProject,
		projects,
		activeConversion,
		setCurrentProject,
		updateProject,
		addProject,
		removeProject,
		setActiveConversion,
		isLoading,
		setLoading,
		setError,
	} = useAppStore();

	// Load project by ID
	const loadProject = useCallback(
		async (id: string) => {
			setLoading(true);
			try {
				// First check if project is already in store
				const existingProject = projects.find((p) => p.id === id);
				if (existingProject) {
					setCurrentProject(existingProject);
					return existingProject;
				}

				// TODO: In real implementation, fetch from API
				// For now, return null if not found
				setError("Project not found");
				return null;
			} catch (error) {
				setError("Failed to load project");
				return null;
			} finally {
				setLoading(false);
			}
		},
		[projects, setCurrentProject, setLoading, setError]
	);

	// Auto-load project if projectId is provided
	useEffect(() => {
		if (projectId && (!currentProject || currentProject.id !== projectId)) {
			loadProject(projectId);
		}
	}, [projectId, currentProject, loadProject]);

	// Update project tech stack
	const updateTechStack = useCallback(
		async (id: string, targetStack: TechStack) => {
			setLoading(true);
			try {
				updateProject(id, {
					targetTechStack: targetStack,
					status: "ready",
					updatedAt: new Date(),
				});

				// TODO: In real implementation, save to API
				return true;
			} catch (error) {
				setError("Failed to update tech stack");
				return false;
			} finally {
				setLoading(false);
			}
		},
		[updateProject, setLoading, setError]
	);

	// Start conversion
	const startConversion = useCallback(
		async (id: string) => {
			const project = projects.find((p) => p.id === id);
			if (!project || !project.targetTechStack) {
				setError("Project or target tech stack not found");
				return null;
			}

			setLoading(true);
			try {
				// Create conversion job
				const conversionJob: ConversionJob = {
					id: `conv_${Date.now()}`,
					projectId: id,
					plan: {
						id: `plan_${Date.now()}`,
						projectId: id,
						tasks: [
							{
								id: "task_1",
								type: "analysis",
								description: "Analyzing project structure",
								inputFiles: ["**/*"],
								outputFiles: [],
								dependencies: [],
								agentType: "analysis",
								priority: 1,
							},
							{
								id: "task_2",
								type: "code_generation",
								description: "Converting source code",
								inputFiles: ["src/**/*"],
								outputFiles: ["src/**/*"],
								dependencies: ["task_1"],
								agentType: "code_generation",
								priority: 2,
							},
						],
						estimatedDuration: 300,
						complexity: "medium",
						warnings: [],
					},
					status: "pending",
					progress: 0,
					currentTask: "Initializing conversion...",
					startedAt: new Date(),
					completedAt: undefined,
					errorMessage: undefined,
				};

				setActiveConversion(conversionJob);

				// TODO: In real implementation, start actual conversion
				return conversionJob;
			} catch (error) {
				setError("Failed to start conversion");
				return null;
			} finally {
				setLoading(false);
			}
		},
		[projects, setActiveConversion, setLoading, setError]
	);

	// Get project status
	const getProjectStatus = useCallback(
		(id: string) => {
			const project = projects.find((p) => p.id === id);
			if (!project) return "not_found";

			if (activeConversion && activeConversion.projectId === id) {
				return activeConversion.status;
			}

			return project.status;
		},
		[projects, activeConversion]
	);

	// Check if project can be converted
	const canConvert = useCallback(
		(id: string) => {
			const project = projects.find((p) => p.id === id);
			return project && project.targetTechStack && project.status === "ready";
		},
		[projects]
	);

	return {
		// Current state
		currentProject,
		projects,
		activeConversion,
		isLoading,

		// Actions
		loadProject,
		updateTechStack,
		startConversion,
		addProject,
		removeProject,

		// Utilities
		getProjectStatus,
		canConvert,
	};
}
