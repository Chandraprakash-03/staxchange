import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/store";
import { Project, TechStack } from "@/types";

// Mock project data
const mockProject: Project = {
	id: "test-project-1",
	name: "Test Project",
	githubUrl: "https://github.com/test/project",
	userId: "test-user",
	originalTechStack: {
		language: "javascript",
		framework: "react",
		database: "postgresql",
		runtime: "node",
		buildTool: "webpack",
		packageManager: "npm",
		deployment: "vercel",
		additional: {},
	},
	targetTechStack: undefined,
	status: "imported",
	fileStructure: {
		name: "test-project",
		type: "directory",
		path: "/",
		children: [],
		metadata: { size: 0, lastModified: new Date() },
	},
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockTargetStack: TechStack = {
	language: "typescript",
	framework: "nextjs",
	database: "postgresql",
	runtime: "node",
	buildTool: "turbopack",
	packageManager: "npm",
	deployment: "vercel",
	additional: {},
};

describe("App Store", () => {
	beforeEach(() => {
		// Reset store state before each test
		useAppStore.getState().resetAll();
	});

	it("should initialize with default state", () => {
		const state = useAppStore.getState();

		expect(state.user).toBeNull();
		expect(state.isAuthenticated).toBe(false);
		expect(state.currentProject).toBeNull();
		expect(state.projects).toEqual([]);
		expect(state.activeConversion).toBeNull();
		expect(state.conversionHistory).toEqual([]);
		expect(state.isLoading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.currentPage).toBe("/");
		expect(state.previousPage).toBeNull();
	});

	it("should add and manage projects", () => {
		const { addProject, setCurrentProject, projects, currentProject } =
			useAppStore.getState();

		// Add project
		addProject(mockProject);
		expect(useAppStore.getState().projects).toHaveLength(1);
		expect(useAppStore.getState().projects[0]).toEqual(mockProject);

		// Set current project
		setCurrentProject(mockProject);
		expect(useAppStore.getState().currentProject).toEqual(mockProject);
	});

	it("should update project properties", () => {
		const { addProject, updateProject } = useAppStore.getState();

		// Add project
		addProject(mockProject);

		// Update project
		updateProject(mockProject.id, {
			targetTechStack: mockTargetStack,
			status: "ready",
		});

		const updatedProject = useAppStore.getState().projects[0];
		expect(updatedProject.targetTechStack).toEqual(mockTargetStack);
		expect(updatedProject.status).toBe("ready");
	});

	it("should manage navigation state", () => {
		const { setCurrentPage, navigateBack, currentPage, previousPage } =
			useAppStore.getState();

		// Navigate to new page
		setCurrentPage("/projects");
		expect(useAppStore.getState().currentPage).toBe("/projects");
		expect(useAppStore.getState().previousPage).toBe("/");

		// Navigate to another page
		setCurrentPage("/import");
		expect(useAppStore.getState().currentPage).toBe("/import");
		expect(useAppStore.getState().previousPage).toBe("/projects");

		// Navigate back
		navigateBack();
		expect(useAppStore.getState().currentPage).toBe("/projects");
		expect(useAppStore.getState().previousPage).toBeNull();
	});

	it("should manage loading and error states", () => {
		const { setLoading, setError } = useAppStore.getState();

		// Set loading
		setLoading(true);
		expect(useAppStore.getState().isLoading).toBe(true);

		// Set error
		setError("Test error");
		expect(useAppStore.getState().error).toBe("Test error");

		// Clear error
		setError(null);
		expect(useAppStore.getState().error).toBeNull();
	});

	it("should remove projects", () => {
		const { addProject, removeProject, setCurrentProject } =
			useAppStore.getState();

		// Add project and set as current
		addProject(mockProject);
		setCurrentProject(mockProject);

		// Remove project
		removeProject(mockProject.id);

		expect(useAppStore.getState().projects).toHaveLength(0);
		expect(useAppStore.getState().currentProject).toBeNull();
	});

	it("should reset state correctly", () => {
		const { addProject, setCurrentProject, setLoading, setError, resetAll } =
			useAppStore.getState();

		// Set some state
		addProject(mockProject);
		setCurrentProject(mockProject);
		setLoading(true);
		setError("Test error");

		// Reset all
		resetAll();

		const state = useAppStore.getState();
		expect(state.projects).toEqual([]);
		expect(state.currentProject).toBeNull();
		expect(state.isLoading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.currentPage).toBe("/");
	});
});
