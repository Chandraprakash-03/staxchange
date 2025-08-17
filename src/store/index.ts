import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Project, TechStack, ConversionJob, User } from "@/types";

// Application state interface
interface AppState {
	// User state
	user: User | null;
	isAuthenticated: boolean;

	// Current project state
	currentProject: Project | null;
	projects: Project[];

	// Conversion state
	activeConversion: ConversionJob | null;
	conversionHistory: ConversionJob[];

	// UI state
	isLoading: boolean;
	error: string | null;

	// Navigation state
	currentPage: string;
	previousPage: string | null;

	// Actions
	setUser: (user: User | null) => void;
	setCurrentProject: (project: Project | null) => void;
	addProject: (project: Project) => void;
	updateProject: (projectId: string, updates: Partial<Project>) => void;
	removeProject: (projectId: string) => void;

	setActiveConversion: (conversion: ConversionJob | null) => void;
	addConversionToHistory: (conversion: ConversionJob) => void;

	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;

	setCurrentPage: (page: string) => void;
	navigateBack: () => void;

	// Reset functions
	resetProjectState: () => void;
	resetConversionState: () => void;
	resetAll: () => void;
}

// Create the store
export const useAppStore = create<AppState>()(
	devtools(
		persist(
			(set, get) => ({
				// Initial state
				user: null,
				isAuthenticated: false,
				currentProject: null,
				projects: [],
				activeConversion: null,
				conversionHistory: [],
				isLoading: false,
				error: null,
				currentPage: "/",
				previousPage: null,

				// User actions
				setUser: (user) =>
					set({ user, isAuthenticated: !!user }, false, "setUser"),

				// Project actions
				setCurrentProject: (project) =>
					set({ currentProject: project }, false, "setCurrentProject"),

				addProject: (project) =>
					set(
						(state) => ({
							projects: [...state.projects, project],
						}),
						false,
						"addProject"
					),

				updateProject: (projectId, updates) =>
					set(
						(state) => ({
							projects: state.projects.map((p) =>
								p.id === projectId ? { ...p, ...updates } : p
							),
							currentProject:
								state.currentProject?.id === projectId
									? { ...state.currentProject, ...updates }
									: state.currentProject,
						}),
						false,
						"updateProject"
					),

				removeProject: (projectId) =>
					set(
						(state) => ({
							projects: state.projects.filter((p) => p.id !== projectId),
							currentProject:
								state.currentProject?.id === projectId
									? null
									: state.currentProject,
						}),
						false,
						"removeProject"
					),

				// Conversion actions
				setActiveConversion: (conversion) =>
					set({ activeConversion: conversion }, false, "setActiveConversion"),

				addConversionToHistory: (conversion) =>
					set(
						(state) => ({
							conversionHistory: [
								conversion,
								...state.conversionHistory.slice(0, 9),
							], // Keep last 10
						}),
						false,
						"addConversionToHistory"
					),

				// UI actions
				setLoading: (loading) =>
					set({ isLoading: loading }, false, "setLoading"),
				setError: (error) => set({ error }, false, "setError"),

				// Navigation actions
				setCurrentPage: (page) =>
					set(
						(state) => ({
							previousPage: state.currentPage,
							currentPage: page,
						}),
						false,
						"setCurrentPage"
					),

				navigateBack: () => {
					const { previousPage } = get();
					if (previousPage) {
						set(
							(state) => ({
								currentPage: state.previousPage!,
								previousPage: null,
							}),
							false,
							"navigateBack"
						);
					}
				},

				// Reset functions
				resetProjectState: () =>
					set(
						{
							currentProject: null,
							projects: [],
						},
						false,
						"resetProjectState"
					),

				resetConversionState: () =>
					set(
						{
							activeConversion: null,
							conversionHistory: [],
						},
						false,
						"resetConversionState"
					),

				resetAll: () =>
					set(
						{
							user: null,
							isAuthenticated: false,
							currentProject: null,
							projects: [],
							activeConversion: null,
							conversionHistory: [],
							isLoading: false,
							error: null,
							currentPage: "/",
							previousPage: null,
						},
						false,
						"resetAll"
					),
			}),
			{
				name: "ai-tech-stack-converter-store",
				partialize: (state) => ({
					// Only persist certain parts of the state
					user: state.user,
					isAuthenticated: state.isAuthenticated,
					projects: state.projects,
					conversionHistory: state.conversionHistory,
				}),
			}
		),
		{
			name: "ai-tech-stack-converter",
		}
	)
);

// Selector hooks for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () =>
	useAppStore((state) => state.isAuthenticated);
export const useCurrentProject = () =>
	useAppStore((state) => state.currentProject);
export const useProjects = () => useAppStore((state) => state.projects);
export const useActiveConversion = () =>
	useAppStore((state) => state.activeConversion);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useCurrentPage = () => useAppStore((state) => state.currentPage);
