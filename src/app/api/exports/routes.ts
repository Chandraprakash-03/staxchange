import { Router, Request, Response } from "express";
import {
	asyncHandler,
	authenticateToken,
	validateExportRequest,
	validatePagination,
	handleValidationErrors,
	validateContentType,
} from "@/middleware";
import { ExportService } from "@/services/export";

const router = Router();

/**
 * Create export job
 * POST /api/exports/create
 */
router.post(
	"/create",
	authenticateToken,
	validateContentType(["application/json"]),
	validateExportRequest(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const {
			projectId,
			conversionJobId,
			format,
			includeSetupInstructions,
			options,
		} = req.body;
		const user = req.user!;

		const exportJob = await ExportService.createProjectExport({
			projectId,
			conversionJobId,
			userId: user.id,
			format: format || "zip",
			includeSetupInstructions: includeSetupInstructions !== false,
			options: options || {},
		});

		res.status(201).json({
			success: true,
			data: {
				export: {
					id: exportJob.id,
					projectId: exportJob.projectId,
					status: exportJob.status,
					format: exportJob.format,
					progress: exportJob.progress,
					createdAt: exportJob.createdAt,
				},
			},
		});
	})
);

/**
 * Get export job status
 * GET /api/exports/:exportId
 */
router.get(
	"/:exportId",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { exportId } = req.params;
		const user = req.user!;

		const exportJob = await ExportService.getExportJob(exportId, user.id);

		res.json({
			success: true,
			data: {
				export: {
					id: exportJob.id,
					projectId: exportJob.projectId,
					status: exportJob.status,
					format: exportJob.format,
					progress: exportJob.progress,
					downloadUrl: exportJob.downloadUrl,
					fileSize: exportJob.fileSize,
					expiresAt: exportJob.expiresAt,
					createdAt: exportJob.createdAt,
					completedAt: exportJob.completedAt,
				},
			},
		});
	})
);

/**
 * Download exported project
 * GET /api/exports/:exportId/download
 */
router.get(
	"/:exportId/download",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { exportId } = req.params;
		const user = req.user!;

		const downloadInfo = await ExportService.getExportDownloadInfo(
			exportId,
			user.id
		);

		if (!downloadInfo.available) {
			return res.status(404).json({
				success: false,
				error: {
					code: "EXPORT_NOT_AVAILABLE",
					message: "Export is not available for download",
					userMessage: "The export is not ready or has expired.",
				},
			});
		}

		// Set appropriate headers for file download
		res.setHeader("Content-Type", downloadInfo.contentType);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${downloadInfo.filename}"`
		);
		res.setHeader("Content-Length", downloadInfo.fileSize);

		// Stream the file
		const stream = await ExportService.createDownloadStream(exportId, user.id);
		stream.pipe(res);
	})
);

/**
 * Get user's export jobs
 * GET /api/exports?page=1&limit=10&status=completed
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
		const status = req.query.status as string;
		const projectId = req.query.projectId as string;

		const result = await ExportService.getUserExports(user.id, {
			page,
			limit,
			status,
			projectId,
		});

		res.json({
			success: true,
			data: {
				exports: result.exports.map((exportJob: any) => ({
					id: exportJob.id,
					projectId: exportJob.projectId,
					status: exportJob.status,
					format: exportJob.format,
					progress: exportJob.progress,
					fileSize: exportJob.fileSize,
					expiresAt: exportJob.expiresAt,
					createdAt: exportJob.createdAt,
					completedAt: exportJob.completedAt,
				})),
				pagination: result.pagination,
			},
		});
	})
);

/**
 * Cancel export job
 * POST /api/exports/:exportId/cancel
 */
router.post(
	"/:exportId/cancel",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { exportId } = req.params;
		const user = req.user!;

		await ExportService.cancelProjectExport(exportId, user.id);

		res.json({
			success: true,
			data: {
				message: "Export job cancelled successfully",
			},
		});
	})
);

/**
 * Retry failed export job
 * POST /api/exports/:exportId/retry
 */
router.post(
	"/:exportId/retry",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { exportId } = req.params;
		const user = req.user!;

		const newExport = await ExportService.retryProjectExport(exportId, user.id);

		res.json({
			success: true,
			data: {
				export: {
					id: newExport.id,
					projectId: newExport.projectId,
					status: newExport.status,
					format: newExport.format,
					progress: newExport.progress,
					createdAt: newExport.createdAt,
				},
			},
		});
	})
);

/**
 * Delete export job and files
 * DELETE /api/exports/:exportId
 */
router.delete(
	"/:exportId",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { exportId } = req.params;
		const user = req.user!;

		await ExportService.deleteProjectExport(exportId, user.id);

		res.json({
			success: true,
			data: {
				message: "Export deleted successfully",
			},
		});
	})
);

/**
 * Get export preview (list of files that will be included)
 * POST /api/exports/preview
 */
router.post(
	"/preview",
	authenticateToken,
	validateContentType(["application/json"]),
	validateExportRequest(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { projectId, conversionJobId, options } = req.body;
		const user = req.user!;

		const preview = await ExportService.generateExportPreview({
			projectId,
			conversionJobId,
			userId: user.id,
			options: options || {},
		});

		res.json({
			success: true,
			data: {
				preview: {
					files: preview.files,
					totalSize: preview.totalSize,
					structure: preview.structure,
					setupInstructions: preview.setupInstructions,
					warnings: preview.warnings,
				},
			},
		});
	})
);

/**
 * Get export templates
 * GET /api/exports/templates
 */
router.get(
	"/templates",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const templates = await ExportService.listExportTemplates();

		res.json({
			success: true,
			data: {
				templates: templates.map((template: any) => ({
					id: template.id,
					name: template.name,
					description: template.description,
					format: template.format,
					includes: template.includes,
					options: template.options,
				})),
			},
		});
	})
);

/**
 * Generate setup instructions
 * POST /api/exports/setup-instructions
 */
router.post(
	"/setup-instructions",
	authenticateToken,
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { projectId, conversionJobId, targetEnvironment } = req.body;
		const user = req.user!;

		if (!projectId) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_PROJECT_ID",
					message: "Project ID is required",
					userMessage: "Please specify a project.",
				},
			});
		}

		const instructions = await ExportService.createSetupInstructions({
			projectId,
			conversionJobId,
			userId: user.id,
			targetEnvironment: targetEnvironment || "local",
		});

		res.json({
			success: true,
			data: {
				instructions: {
					steps: instructions.steps,
					commands: instructions.commands,
					dependencies: instructions.dependencies,
					environmentVariables: instructions.environmentVariables,
					notes: instructions.notes,
				},
			},
		});
	})
);

export default router;
