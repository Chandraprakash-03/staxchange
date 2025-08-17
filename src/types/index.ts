// Core data types for the application

export interface User {
	id: string;
	githubId: string;
	username: string;
	email?: string;
	avatarUrl?: string;
	accessToken?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface TechStack {
	language: string;
	framework?: string;
	database?: string;
	runtime?: string;
	buildTool?: string;
	packageManager?: string;
	deployment?: string;
	additional: Record<string, string>;
}

export interface Project {
	id: string;
	name: string;
	githubUrl: string;
	userId: string;
	originalTechStack: TechStack;
	targetTechStack?: TechStack;
	status: ProjectStatus;
	fileStructure?: FileTree;
	createdAt: Date;
	updatedAt: Date;
}

export type ProjectStatus =
	| "imported"
	| "analyzing"
	| "ready"
	| "converting"
	| "completed"
	| "failed";

export interface FileTree {
	name: string;
	type: "file" | "directory";
	path: string;
	content?: string;
	children?: FileTree[];
	metadata: FileMetadata;
}

export interface FileMetadata {
	size: number;
	lastModified: Date;
	encoding?: string;
	mimeType?: string;
	permissions?: string;
	isExecutable?: boolean;
}

export interface ConversionPlan {
	id: string;
	projectId: string;
	tasks: ConversionTask[];
	estimatedDuration: number;
	complexity: "low" | "medium" | "high";
	warnings: string[];
	feasible: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export interface ConversionTask {
	id: string;
	type: TaskType;
	description: string;
	inputFiles: string[];
	outputFiles: string[];
	dependencies: string[];
	agentType: AgentType;
	priority: number;
	status: TaskStatus;
	estimatedDuration: number;
	context?: Record<string, any>;
}

export type TaskStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "skipped";

export type TaskType =
	| "analysis"
	| "code_generation"
	| "dependency_update"
	| "config_update"
	| "validation"
	| "integration";

export type AgentType =
	| "analysis"
	| "planning"
	| "code_generation"
	| "validation"
	| "integration";

export interface ConversionJob {
	id: string;
	projectId: string;
	plan: ConversionPlan;
	status: ConversionStatus;
	progress: number;
	currentTask?: string;
	results?: ConversionResult[];
	errorMessage?: string;
	startedAt?: Date;
	completedAt?: Date;
	createdAt?: Date;
}

export type ConversionStatus =
	| "pending"
	| "running"
	| "paused"
	| "completed"
	| "failed";

export interface ConversionResult {
	taskId: string;
	status: "success" | "error";
	output?: string;
	error?: string;
	files: FileChange[];
}

export interface FileChange {
	path: string;
	type: "create" | "update" | "delete";
	content?: string;
	oldContent?: string;
}

export interface ImportResult {
	projectId: string;
	structure: FileTree;
	detectedTechnologies: TechStack;
	size: number;
	status: "success" | "error";
	error?: string;
}

export interface ProjectAnalysis {
	techStack: TechStack;
	architecture: ArchitectureType;
	dependencies: Dependency[];
	entryPoints: string[];
	databaseSchema?: DatabaseSchema;
}

export type ArchitectureType =
	| "spa"
	| "ssr"
	| "api"
	| "fullstack"
	| "microservices"
	| "monolith";

export interface Dependency {
	name: string;
	version: string;
	type: "runtime" | "dev" | "peer";
	source: string;
}

export interface DatabaseSchema {
	tables: Table[];
	relationships: Relationship[];
}

export interface Table {
	name: string;
	columns: Column[];
}

export interface Column {
	name: string;
	type: string;
	nullable: boolean;
	primaryKey: boolean;
	foreignKey?: string;
}

export interface Relationship {
	from: string;
	to: string;
	type: "one-to-one" | "one-to-many" | "many-to-many";
}

// Validation interfaces
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
	warnings: string[];
}

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

// Utility types for database operations
export type CreateProjectInput = Omit<
	Project,
	"id" | "createdAt" | "updatedAt"
>;
export type UpdateProjectInput = Partial<
	Omit<Project, "id" | "createdAt" | "updatedAt">
>;
export type CreateConversionJobInput = Omit<ConversionJob, "id" | "createdAt">;
export type UpdateConversionJobInput = Partial<
	Omit<ConversionJob, "id" | "projectId" | "createdAt">
>;

// Task Queue types
export interface QueueJob<T = any> {
	id: string;
	type: string;
	data: T;
	opts?: QueueJobOptions;
}

export interface QueueJobOptions {
	priority?: number;
	delay?: number;
	attempts?: number;
	backoff?: {
		type: "fixed" | "exponential";
		delay: number;
	};
	removeOnComplete?: number;
	removeOnFail?: number;
}

export interface JobProgress {
	percentage: number;
	message?: string;
	data?: any;
}

export interface JobResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	duration: number;
}

export interface QueueStats {
	waiting: number;
	active: number;
	completed: number;
	failed: number;
	delayed: number;
	paused: number;
}

// Conversion Job Queue specific types
export interface ConversionJobData {
	jobId: string;
	projectId: string;
	plan: ConversionPlan;
	userId: string;
}

export interface ConversionTaskJobData {
	taskId: string;
	jobId: string;
	task: ConversionTask;
	context: Record<string, any>;
}

export interface JobProgressUpdate {
	jobId: string;
	taskId?: string;
	progress: number;
	message: string;
	status: ConversionStatus | TaskStatus;
	data?: any;
}

// Preview Environment types
export interface PreviewEnvironment {
	id: string;
	projectId: string;
	url: string;
	status: PreviewStatus;
	logs: LogEntry[];
	createdAt: Date;
	lastAccessed: Date;
	config: PreviewConfig;
}

export type PreviewStatus = "initializing" | "ready" | "error" | "stopped";

export interface PreviewConfig {
	runtime: "node" | "python" | "static";
	port: number;
	entryPoint: string;
	buildCommand?: string;
	startCommand?: string;
	environment: Record<string, string>;
}

export interface LogEntry {
	id: string;
	timestamp: Date;
	level: "info" | "warn" | "error" | "debug";
	message: string;
	source: "system" | "application" | "build";
}

export interface PreviewUpdate {
	previewId: string;
	changes: FileChange[];
	timestamp: Date;
}

export interface WebContainerInstance {
	id: string;
	container: any; // WebContainer instance
	status: "starting" | "ready" | "error" | "stopped";
	process?: any; // WebContainer process
}

// API Response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
