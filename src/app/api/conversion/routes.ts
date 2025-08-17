import { Router, Request, Response } from "express";
import {
	asyncHandler,
	authenticateToken,
	validateConversionJob,
	validatePagination,
	handleValidationErrors,
	validateContentType,
} from "@/middleware";
import { ConversionService } from "@/services/conversion";

const router = Router();

/**
 * Start conversion job
 * POST /api/conversion/start
 */
router.post(
	"/start",
	authenticateToken,
	validateContentType(["application/json"]),
	validateConversionJob(),
	handleValidationErrors,
	asyncHandler(async (req: Request, res: Response) => {
		const { projectId, targetTechStack, options } = req.body;
		const user = req.user!;

		const job = await ConversionService.startConversion({
			projectId,
			userId: user.id,
			targetTechStack,
			options: options || {},
		});

		res.status(201).json({
			success: true,
			data: {
				job: {
					id: job.id,
					projectId: job.projectId,
					status: job.status,
					progress: job.progress,
					currentTask: job.currentTask,
					estimatedDuration: job.estimatedDuration,
					startedAt: job.startedAt,
					createdAt: job.createdAt,
				},
			},
		});
	})
);

/**
 * Get conversion job status
 * GET /api/conversion/:jobId
 */
router.get(
	"/:jobId",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		const job = await ConversionService.getConversionJob(jobId, user.id);

		res.json({
			success: true,
			data: {
				job: {
					id: job.id,
					projectId: job.projectId,
					status: job.status,
					progress: job.progress,
					currentTask: job.currentTask,
					results: job.results,
					logs: job.logs,
					errors: job.errors,
					estimatedDuration: job.estimatedDuration,
					startedAt: job.startedAt,
					completedAt: job.completedAt,
					createdAt: job.createdAt,
					updatedAt: job.updatedAt,
				},
			},
		});
	})
);

/**
 * Get user's conversion jobs
 * GET /api/conversion?page=1&limit=10&status=completed
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

		const result = await ConversionService.getUserConversions(user.id, {
			page,
			limit,
			status,
			projectId,
		});

		res.json({
			success: true,
			data: {
				jobs: result.jobs.map(
					(job: {
						id: any;
						projectId: any;
						status: any;
						progress: any;
						currentTask: any;
						estimatedDuration: any;
						startedAt: any;
						completedAt: any;
						createdAt: any;
					}) => ({
						id: job.id,
						projectId: job.projectId,
						status: job.status,
						progress: job.progress,
						currentTask: job.currentTask,
						estimatedDuration: job.estimatedDuration,
						startedAt: job.startedAt,
						completedAt: job.completedAt,
						createdAt: job.createdAt,
					})
				),
				pagination: result.pagination,
			},
		});
	})
);

/**
 * Pause conversion job
 * POST /api/conversion/:jobId/pause
 */
router.post(
	"/:jobId/pause",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		await ConversionService.pauseConversion(jobId, user.id);

		res.json({
			success: true,
			data: {
				message: "Conversion job paused successfully",
			},
		});
	})
);

/**
 * Resume conversion job
 * POST /api/conversion/:jobId/resume
 */
router.post(
	"/:jobId/resume",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		await ConversionService.resumeConversion(jobId, user.id);

		res.json({
			success: true,
			data: {
				message: "Conversion job resumed successfully",
			},
		});
	})
);

/**
 * Cancel conversion job
 * POST /api/conversion/:jobId/cancel
 */
router.post(
	"/:jobId/cancel",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		await ConversionService.cancelConversion(jobId, user.id);

		res.json({
			success: true,
			data: {
				message: "Conversion job cancelled successfully",
			},
		});
	})
);

/**
 * Retry failed conversion job
 * POST /api/conversion/:jobId/retry
 */
router.post(
	"/:jobId/retry",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		const newJob = await ConversionService.retryConversion(jobId, user.id);

		res.json({
			success: true,
			data: {
				job: {
					id: newJob.id,
					projectId: newJob.projectId,
					status: newJob.status,
					progress: newJob.progress,
					currentTask: newJob.currentTask,
					startedAt: newJob.startedAt,
					createdAt: newJob.createdAt,
				},
			},
		});
	})
);

/**
 * Get conversion job logs
 * GET /api/conversion/:jobId/logs?level=error&limit=100
 */
router.get(
	"/:jobId/logs",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;
		const level = req.query.level as string;
		const limit = parseInt(req.query.limit as string) || 100;
		const offset = parseInt(req.query.offset as string) || 0;

		const logs = await ConversionService.getConversionLogs(jobId, user.id, {
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
 * Get conversion results
 * GET /api/conversion/:jobId/results
 */
router.get(
	"/:jobId/results",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const user = req.user!;

		const results = await ConversionService.getConversionResults(
			jobId,
			user.id
		);

		res.json({
			success: true,
			data: {
				results: {
					convertedFiles: results.convertedFiles,
					summary: results.summary,
					metrics: results.metrics,
					warnings: results.warnings,
					manualSteps: results.manualSteps,
				},
			},
		});
	})
);

/**
 * Get conversion diff for specific file
 * GET /api/conversion/:jobId/diff?filePath=/src/index.js
 */
router.get(
	"/:jobId/diff",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
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

		const diff = await ConversionService.getConversionDiff(
			jobId,
			user.id,
			filePath
		);

		res.json({
			success: true,
			data: {
				diff: {
					filePath,
					original: diff.original,
					converted: diff.converted,
					changes: diff.changes,
				},
			},
		});
	})
);

/**
 * Apply manual fix to conversion result
 * POST /api/conversion/:jobId/fix
 */
router.post(
	"/:jobId/fix",
	authenticateToken,
	validateContentType(["application/json"]),
	asyncHandler(async (req: Request, res: Response) => {
		const { jobId } = req.params;
		const { filePath, content, description } = req.body;
		const user = req.user!;

		if (!filePath || !content) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_REQUIRED_FIELDS",
					message: "File path and content are required",
					userMessage: "Please provide file path and content.",
				},
			});
		}

		await ConversionService.applyManualFix(jobId, user.id, {
			filePath,
			content,
			description,
		});

		res.json({
			success: true,
			data: {
				message: "Manual fix applied successfully",
			},
		});
	})
);

/**
 * Get conversion statistics
 * GET /api/conversion/stats
 */
router.get(
	"/stats",
	authenticateToken,
	asyncHandler(async (req: Request, res: Response) => {
		const user = req.user!;

		const stats = await ConversionService.getUserConversionStats(user.id);

		res.json({
			success: true,
			data: {
				stats: {
					totalJobs: stats.totalJobs,
					completedJobs: stats.completedJobs,
					failedJobs: stats.failedJobs,
					averageDuration: stats.averageDuration,
					totalFilesConverted: stats.totalFilesConverted,
					popularTargetStacks: stats.popularTargetStacks,
				},
			},
		});
	})
);

export default router;
