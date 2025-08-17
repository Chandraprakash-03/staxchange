// Middleware exports
export {
	authenticateToken,
	optionalAuth,
	requireOwnership,
	validateGitHubToken,
	authErrorHandler,
	type AuthenticatedRequest,
} from "./auth";

export {
	handleValidationErrors,
	validateGitHubUrl,
	validateGitHubUrlEnhanced,
	validateProjectId,
	validateTechStack,
	validateTechStackEnhanced,
	validateConversionJob,
	validatePagination,
	validateFilePath,
	validateFilePathEnhanced,
	validateExportRequest,
	sanitizeInput,
	validateContentType,
	validateRequestSize,
	validateJsonDepth,
} from "./validation";

export {
	rateLimitConfig,
	createUserRateLimit,
	aiApiRateLimit,
	conversionRateLimit,
	githubImportRateLimit,
} from "./rateLimiting";

export {
	securityMiddleware,
	requestId,
	requestSizeLimit,
	ipFilter,
	validateApiKey,
	validateUserAgent,
	sqlInjectionProtection,
	noSqlInjectionProtection,
	pathTraversalProtection,
	xssProtection,
} from "./security";

export {
	developmentLogger,
	productionLogger,
	errorLogger,
	apiAccessLogger,
	securityLogger,
	performanceLogger,
	getLogger,
} from "./logging";

export {
	errorHandler,
	asyncHandler,
	validationErrorHandler,
	rateLimitErrorHandler,
	notFoundHandler,
	timeoutHandler,
	healthCheckErrorHandler,
	developmentErrorHandler,
} from "./errorHandler";
