import { Router, Request, Response } from "express";
import {
	asyncHandler,
	authenticateToken,
	validateGitHubUrl,
	validateProjectId,
	validateTechStack,
	validatePagination,
	handleValidationErrors,
	validateContentType,
	githubImportRateLimit,
} from "@/middleware";
import { GitHubService } from "@/services/github";
import { ProjectService } from "@/services/project";

const router = Router();

/**
 * Import project from GitHub
 * POST /api/projects/import
 */
router.post(
	"/import",
	authenticateToken,
	githubImportRateLimit,
	validateContentType(["application/json"]),
	validateGitHubUrl(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { url } = req.body;
		const user = req.user!;

		const importResult = await GitHubService.importRepository(
			url,
			user.accessToken!,
			user.id
		);

		res.status(201).json({
			success: true,
			data: {
				project: {
					id: importResult.projectId,
					name: importResult.name,
					githubUrl: url,
					status: importResult.status,
					structure: importResult.structure,
					detectedTechnologies: importResult.detectedTechnologies,
					size: importResult.size,
					createdAt: importResult.createdAt,
				},
			},
		});
	})
);

/**
 * Validate GitHub repository URL
 * POST /api/projects/validate
 */
router.post(
	"/validate",
	authenticateToken,
	validateContentType(["application/json"]),
	validateGitHubUrl(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { url } = req.body;
		const user = req.user!;

		const validation = await GitHubService.validateRepository(
			url,
			user.accessToken!
		);

		res.json({
			success: true,
			data: {
				valid: validation.valid,
				accessible: validation.accessible,
				size: validation.size,
				language: validation.language,
				isPrivate: validation.isPrivate,
				warnings: validation.warnings,
			},
		});
	})
);

/**
 * Get user's projects
 * GET /api/projects?page=1&limit=10
 */
router.get(
	"/",
	authenticateToken,
	validatePagination(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;

		const result = await ProjectService.listUserProjects(user.id, {
			page,
			limit,
		});

		res.json({
			success: true,
			data: {
				projects: result.projects.map((project: any) => ({
					id: project.id,
					name: project.name,
					githubUrl: project.githubUrl,
					status: project.status,
					originalTechStack: project.originalTechStack,
					targetTechStack: project.targetTechStack,
					createdAt: project.createdAt,
					updatedAt: project.updatedAt,
				})),
				pagination: {
					page: result.pagination.page,
					limit: result.pagination.limit,
					total: result.pagination.total,
					totalPages: result.pagination.totalPages,
					hasNext: result.pagination.hasNext,
					hasPrev: result.pagination.hasPrev,
				},
			},
		});
	})
);

/**
 * Get specific project
 * GET /api/projects/:id
 */
router.get(
	"/:id",
	authenticateToken,
	validateProjectId(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const user = req.user!;

		const project = await ProjectService.getProjectById(id, user.id);

		res.json({
			success: true,
			data: {
				project: {
					id: project.id,
					name: project.name,
					githubUrl: project.githubUrl,
					status: project.status,
					originalTechStack: project.originalTechStack,
					targetTechStack: project.targetTechStack,
					structure: project.structure,
					analysis: project.analysis,
					createdAt: project.createdAt,
					updatedAt: project.updatedAt,
				},
			},
		});
	})
);

/**
 * Update project target tech stack
 * PUT /api/projects/:id/tech-stack
 */
router.put(
	"/:id/tech-stack",
	authenticateToken,
	validateProjectId(),
	validateContentType(["application/json"]),
	validateTechStack(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const user = req.user!;
		const techStack = req.body;

		const updatedProject = await ProjectService.updateProjectTechStack(
			id,
			user.id,
			techStack
		);

		res.json({
			success: true,
			data: {
				project: {
					id: updatedProject.id,
					name: updatedProject.name,
					targetTechStack: updatedProject.targetTechStack,
					updatedAt: updatedProject.updatedAt,
				},
			},
		});
	})
);

/**
 * Analyze project structure and tech stack
 * POST /api/projects/:id/analyze
 */
router.post(
	"/:id/analyze",
	authenticateToken,
	validateProjectId(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const user = req.user!;

		const analysis = await ProjectService.analyzeProject(id, user.id);

		res.json({
			success: true,
			data: {
				analysis: {
					techStack: analysis.techStack,
					architecture: analysis.architecture,
					dependencies: analysis.dependencies,
					entryPoints: analysis.entryPoints,
					databaseSchema: analysis.databaseSchema,
					complexity: analysis.complexity,
					recommendations: analysis.recommendations,
				},
			},
		});
	})
);

/**
 * Get project files
 * GET /api/projects/:id/files?path=/src
 */
router.get(
	"/:id/files",
	authenticateToken,
	validateProjectId(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const { path } = req.query;
		const user = req.user!;

		const files = await ProjectService.listProjectFiles(
			id,
			user.id,
			path as string
		);

		res.json({
			success: true,
			data: {
				files,
			},
		});
	})
);

/**
 * Get specific file content
 * GET /api/projects/:id/files/content?filePath=/src/index.js
 */
router.get(
	"/:id/files/content",
	authenticateToken,
	validateProjectId(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const { filePath } = req.query;
		const user = req.user!;

		if (!filePath || typeof filePath !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_FILE_PATH",
					message: "File path is required",
					userMessage: "Please specify a file path.",
				},
			});
		}

		const content = await ProjectService.readProjectFile(id, user.id, filePath);

		res.json({
			success: true,
			data: {
				filePath,
				content,
			},
		});
	})
);

/**
 * Delete project
 * DELETE /api/projects/:id
 */
router.delete(
	"/:id",
	authenticateToken,
	validateProjectId(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const user = req.user!;

		await ProjectService.removeProject(id, user.id);

		res.json({
			success: true,
			data: {
				message: "Project deleted successfully",
			},
		});
	})
);

/**
 * Generate conversion plan
 * POST /api/projects/:id/conversion-plan
 */
router.post(
	"/:id/conversion-plan",
	authenticateToken,
	validateProjectId(),
	validateContentType(["application/json"]),
	validateTechStack(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.params;
		const user = req.user!;
		const targetTechStack = req.body;

		const plan = await ProjectService.createConversionPlan(
			id,
			user.id,
			targetTechStack
		);

		res.json({
			success: true,
			data: {
				plan: {
					id: plan.id,
					projectId: plan.projectId,
					tasks: plan.tasks,
					estimatedDuration: plan.estimatedDuration,
					complexity: plan.complexity,
					warnings: plan.warnings,
					feasible: plan.feasible,
					createdAt: plan.createdAt,
				},
			},
		});
	})
);

export default router;
