import { Router, Request, Response } from "express";
import {
	asyncHandler,
	authenticateToken,
	validateFilePath,
	handleValidationErrors,
	validateContentType,
} from "@/middleware";
import { PreviewService } from "@/services/preview";

const router = Router();

/**
 * Create preview environment
 * POST /api/preview/create
 */
router.post(
	"/create",
	authenticateToken,
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { projectId, conversionJobId } = req.body;
		const user = req.user!;

		if (!projectId) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_PROJECT_ID",
					message: "Project ID is required",
					userMessage: "Please specify a project to preview.",
				},
			});
		}

		const preview = await PreviewService.createPreviewEnvironment({
			projectId,
			conversionJobId,
			userId: user.id,
		});

		res.status(201).json({
			success: true,
			data: {
				preview: {
					id: preview.id,
					projectId: preview.projectId,
					url: preview.url,
					status: preview.status,
					environment: preview.environment,
					createdAt: preview.createdAt,
				},
			},
		});
	})
);

/**
 * Get preview environment
 * GET /api/preview/:previewId
 */
router.get(
	"/:previewId",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const user = req.user!;

		const preview = await PreviewService.getPreviewEnvironment(
			previewId,
			user.id
		);

		res.json({
			success: true,
			data: {
				preview: {
					id: preview.id,
					projectId: preview.projectId,
					url: preview.url,
					status: preview.status,
					environment: preview.environment,
					logs: preview.logs,
					errors: preview.errors,
					createdAt: preview.createdAt,
					updatedAt: preview.updatedAt,
				},
			},
		});
	})
);

/**
 * Update preview with file changes
 * POST /api/preview/:previewId/update
 */
router.post(
	"/:previewId/update",
	authenticateToken,
	validateContentType(["application/json"]),
	validateFilePath(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const { changes } = req.body;
		const user = req.user!;

		if (!changes || !Array.isArray(changes)) {
			return res.status(400).json({
				success: false,
				error: {
					code: "INVALID_CHANGES",
					message: "Changes must be an array",
					userMessage: "Please provide valid file changes.",
				},
			});
		}

		await PreviewService.updatePreviewEnvironment(previewId, user.id, changes);

		res.json({
			success: true,
			data: {
				message: "Preview updated successfully",
			},
		});
	})
);

/**
 * Get preview logs
 * GET /api/preview/:previewId/logs?level=error&limit=100
 */
router.get(
	"/:previewId/logs",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const user = req.user!;
		const level = req.query.level as string;
		const limit = parseInt(req.query.limit as string) || 100;
		const offset = parseInt(req.query.offset as string) || 0;

		const logs = await PreviewService.getPreviewLogs(previewId, user.id, {
			level,
			limit,
			offset,
		});

		res.json({
			success: true,
			data: {
				logs,
			},
		});
	})
);

/**
 * Execute command in preview environment
 * POST /api/preview/:previewId/execute
 */
router.post(
	"/:previewId/execute",
	authenticateToken,
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const { command } = req.body;
		const user = req.user!;

		if (!command || typeof command !== "string") {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_COMMAND",
					message: "Command is required",
					userMessage: "Please specify a command to execute.",
				},
			});
		}

		const result = await PreviewService.executePreviewCommand(
			previewId,
			user.id,
			command
		);

		res.json({
			success: true,
			data: {
				result: {
					command,
					output: result.output,
					error: result.error,
					exitCode: result.exitCode,
					executionTime: result.executionTime,
				},
			},
		});
	})
);

/**
 * Install package in preview environment
 * POST /api/preview/:previewId/install
 */
router.post(
	"/:previewId/install",
	authenticateToken,
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const { packages } = req.body;
		const user = req.user!;

		if (
			!packages ||
			(!Array.isArray(packages) && typeof packages !== "string")
		) {
			return res.status(400).json({
				success: false,
				error: {
					code: "INVALID_PACKAGES",
					message: "Packages must be a string or array of strings",
					userMessage: "Please specify valid package names.",
				},
			});
		}

		const result = await PreviewService.installPreviewPackages(
			previewId,
			user.id,
			packages
		);

		res.json({
			success: true,
			data: {
				result: {
					packages: Array.isArray(packages) ? packages : [packages],
					output: result.output,
					success: result.success,
					errors: result.errors,
				},
			},
		});
	})
);

/**
 * Get preview file system
 * GET /api/preview/:previewId/files?path=/src
 */
router.get(
	"/:previewId/files",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const { path } = req.query;
		const user = req.user!;

		const files = await PreviewService.listPreviewFiles(
			previewId,
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
 * Read file from preview environment
 * GET /api/preview/:previewId/files/content?filePath=/src/index.js
 */
router.get(
	"/:previewId/files/content",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
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

		const content = await PreviewService.readPreviewFile(
			previewId,
			user.id,
			filePath
		);

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
 * Write file to preview environment
 * POST /api/preview/:previewId/files/write
 */
router.post(
	"/:previewId/files/write",
	authenticateToken,
	validateContentType(["application/json"]),
	validateFilePath(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const { filePath, content } = req.body;
		const user = req.user!;

		if (!content) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_CONTENT",
					message: "File content is required",
					userMessage: "Please provide file content.",
				},
			});
		}

		await PreviewService.writePreviewFile(
			previewId,
			user.id,
			filePath,
			content
		);

		res.json({
			success: true,
			data: {
				message: "File written successfully",
			},
		});
	})
);

/**
 * Restart preview environment
 * POST /api/preview/:previewId/restart
 */
router.post(
	"/:previewId/restart",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const user = req.user!;

		await PreviewService.restartPreviewEnvironment(previewId, user.id);

		res.json({
			success: true,
			data: {
				message: "Preview environment restarted successfully",
			},
		});
	})
);

/**
 * Destroy preview environment
 * DELETE /api/preview/:previewId
 */
router.delete(
	"/:previewId",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { previewId } = req.params;
		const user = req.user!;

		await PreviewService.destroyPreviewEnvironment(previewId, user.id);

		res.json({
			success: true,
			data: {
				message: "Preview environment destroyed successfully",
			},
		});
	})
);

/**
 * Get user's preview environments
 * GET /api/preview?page=1&limit=10
 */
router.get(
	"/",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;

		const result = await PreviewService.getUserPreviewEnvironments(user.id, {
			page,
			limit,
		});

		res.json({
			success: true,
			data: {
				previews: result.previews.map((preview: any) => ({
					id: preview.id,
					projectId: preview.projectId,
					url: preview.url,
					status: preview.status,
					environment: preview.environment,
					createdAt: preview.createdAt,
					updatedAt: preview.updatedAt,
				})),
				pagination: result.pagination,
			},
		});
	})
);

export default router;
