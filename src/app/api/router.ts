import { Router } from "express";
import {
	securityMiddleware,
	requestId,
	getLogger,
	rateLimitConfig,
	sanitizeInput,
	validateContentType,
	errorHandler,
	notFoundHandler,
	timeoutHandler,
	sqlInjectionProtection,
	noSqlInjectionProtection,
	pathTraversalProtection,
	xssProtection,
	validateRequestSize,
	validateJsonDepth,
	aiApiRateLimit,
	conversionRateLimit,
	githubImportRateLimit,
} from "@/middleware";

// Import route handlers
import authRoutes from "./auth/routes";
import projectRoutes from "./projects/routes";
import conversionRoutes from "./conversion/routes";
import previewRoutes from "./preview/routes";
import exportRoutes from "./exports/routes";
import healthRoutes from "./health/routes";

/**
 * Main API router configuration
 */
export const createApiRouter = (): Router => {
	const router = Router();

	// Apply security middleware
	router.use(securityMiddleware.helmet);
	router.use(securityMiddleware.cors);
	router.use(securityMiddleware.compression);

	// Apply request tracking
	router.use(requestId);

	// Apply logging
	const loggers = getLogger();
	loggers.forEach((logger) => router.use(logger));

	// Apply request timeout
	router.use(timeoutHandler(30000)); // 30 second timeout

	// Apply general rate limiting
	router.use(rateLimitConfig.general);

	// Apply security protections
	router.use(sqlInjectionProtection);
	router.use(noSqlInjectionProtection);
	router.use(pathTraversalProtection);
	router.use(xssProtection);

	// Apply input validation
	router.use(validateRequestSize(10 * 1024 * 1024)); // 10MB limit
	router.use(validateJsonDepth(10));
	router.use(sanitizeInput);

	// Apply content type validation for non-GET requests
	router.use(validateContentType(["application/json", "multipart/form-data"]));

	// Health check routes (no authentication required)
	router.use("/health", healthRoutes);

	// Authentication routes
	router.use("/auth", rateLimitConfig.auth, authRoutes);

	// Project management routes with GitHub import rate limiting
	router.use("/projects", githubImportRateLimit, projectRoutes);

	// Conversion routes with AI rate limiting
	router.use(
		"/conversion",
		aiApiRateLimit,
		conversionRateLimit,
		conversionRoutes
	);

	// Preview routes
	router.use("/preview", rateLimitConfig.preview, previewRoutes);

	// Export routes
	router.use("/exports", exportRoutes);

	// 404 handler for unmatched API routes
	router.use(notFoundHandler);

	// Error handling middleware (must be last)
	router.use(errorHandler);

	return router;
};

export default createApiRouter;
