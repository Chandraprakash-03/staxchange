import prisma from '@/lib/prisma';
import { ConversionJob, Prisma } from '@/generated/prisma';
import { ValidationResult, ValidationError, ConversionPlan } from '@/types';

export class ConversionJobModel {
    /**
     * Create a new conversion job
     */
    static async create(jobData: Prisma.ConversionJobCreateInput): Promise<ConversionJob> {
        return await prisma.conversionJob.create({
            data: jobData,
            include: {
                project: {
                    include: {
                        user: true,
                    },
                },
            },
        });
    }

    /**
     * Find conversion job by ID
     */
    static async findById(id: string): Promise<ConversionJob | null> {
        return await prisma.conversionJob.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        user: true,
                    },
                },
            },
        });
    }

    /**
     * Find conversion jobs by project ID
     */
    static async findByProjectId(projectId: string): Promise<ConversionJob[]> {
        return await prisma.conversionJob.findMany({
            where: { projectId },
            include: {
                project: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find conversion jobs by status
     */
    static async findByStatus(status: string): Promise<ConversionJob[]> {
        return await prisma.conversionJob.findMany({
            where: { status },
            include: {
                project: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find active conversion jobs (running or pending)
     */
    static async findActive(): Promise<ConversionJob[]> {
        return await prisma.conversionJob.findMany({
            where: {
                status: {
                    in: ['pending', 'running'],
                },
            },
            include: {
                project: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    /**
     * Update conversion job
     */
    static async update(id: string, updates: Prisma.ConversionJobUpdateInput): Promise<ConversionJob | null> {
        try {
            return await prisma.conversionJob.update({
                where: { id },
                data: updates,
                include: {
                    project: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return null; // Conversion job not found
            }
            throw error;
        }
    }

    /**
     * Update job progress
     */
    static async updateProgress(id: string, progress: number, currentTask?: string): Promise<ConversionJob | null> {
        const updateData: Prisma.ConversionJobUpdateInput = {
            progress: Math.max(0, Math.min(100, progress)), // Ensure progress is between 0-100
        };

        if (currentTask) {
            updateData.currentTask = currentTask;
        }

        return this.update(id, updateData);
    }

    /**
     * Mark job as started
     */
    static async markAsStarted(id: string): Promise<ConversionJob | null> {
        return this.update(id, {
            status: 'running',
            startedAt: new Date(),
            progress: 0,
        });
    }

    /**
     * Mark job as completed
     */
    static async markAsCompleted(id: string, results?: any): Promise<ConversionJob | null> {
        const updateData: Prisma.ConversionJobUpdateInput = {
            status: 'completed',
            completedAt: new Date(),
            progress: 100,
            currentTask: null,
        };

        if (results) {
            updateData.results = results;
        }

        return this.update(id, updateData);
    }

    /**
     * Mark job as failed
     */
    static async markAsFailed(id: string, errorMessage: string): Promise<ConversionJob | null> {
        return this.update(id, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage,
        });
    }

    /**
     * Delete conversion job
     */
    static async delete(id: string): Promise<boolean> {
        try {
            await prisma.conversionJob.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return false; // Conversion job not found
            }
            throw error;
        }
    }

    /**
     * Get conversion job statistics
     */
    static async getStatistics(projectId?: string) {
        const whereClause = projectId ? { projectId } : {};

        const [total, byStatus] = await Promise.all([
            prisma.conversionJob.count({ where: whereClause }),
            prisma.conversionJob.groupBy({
                by: ['status'],
                where: whereClause,
                _count: {
                    status: true,
                },
            }),
        ]);

        return {
            total,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item.status] = item._count.status;
                return acc;
            }, {} as Record<string, number>),
        };
    }

    /**
     * Validate conversion job data
     */
    static validateJobData(jobData: Partial<Prisma.ConversionJobCreateInput>): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        // Required fields validation - check if project relation exists
        // For Prisma input, project can be provided as a relation object or direct reference
        const hasProject = !!(
            jobData.project && (
                (jobData.project as any)?.connect?.id ||
                (jobData.project as any)?.create ||
                (jobData.project as any)?.connectOrCreate
            )
        );
        
        if (!hasProject) {
            errors.push({
                field: 'projectId',
                message: 'Project ID is required',
                code: 'REQUIRED_FIELD',
            });
        }

        if (!jobData.plan) {
            errors.push({
                field: 'plan',
                message: 'Conversion plan is required',
                code: 'REQUIRED_FIELD',
            });
        }

        // Validate conversion plan
        if (jobData.plan) {
            try {
                const planValidation = this.validateConversionPlan(jobData.plan as unknown as ConversionPlan);
                errors.push(...planValidation.errors);
                warnings.push(...planValidation.warnings);
            } catch (error) {
                errors.push({
                    field: 'plan',
                    message: 'Invalid plan format',
                    code: 'INVALID_FORMAT',
                });
            }
        }

        // Validate status
        const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed'];
        if (jobData.status && !validStatuses.includes(jobData.status)) {
            errors.push({
                field: 'status',
                message: `Status must be one of: ${validStatuses.join(', ')}`,
                code: 'INVALID_VALUE',
            });
        }

        // Validate progress
        if (jobData.progress !== undefined) {
            if (typeof jobData.progress !== 'number' || jobData.progress < 0 || jobData.progress > 100) {
                errors.push({
                    field: 'progress',
                    message: 'Progress must be a number between 0 and 100',
                    code: 'INVALID_VALUE',
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate conversion plan
     */
    static validateConversionPlan(plan: ConversionPlan): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: string[] = [];

        if (!plan.id) {
            errors.push({
                field: 'plan.id',
                message: 'Plan ID is required',
                code: 'REQUIRED_FIELD',
            });
        }

        if (!plan.projectId) {
            errors.push({
                field: 'plan.projectId',
                message: 'Project ID is required in plan',
                code: 'REQUIRED_FIELD',
            });
        }

        if (!plan.tasks || !Array.isArray(plan.tasks)) {
            errors.push({
                field: 'plan.tasks',
                message: 'Tasks array is required',
                code: 'REQUIRED_FIELD',
            });
        } else if (plan.tasks.length === 0) {
            warnings.push('Conversion plan has no tasks');
        }

        if (!plan.complexity || !['low', 'medium', 'high'].includes(plan.complexity)) {
            errors.push({
                field: 'plan.complexity',
                message: 'Complexity must be low, medium, or high',
                code: 'INVALID_VALUE',
            });
        }

        if (typeof plan.estimatedDuration !== 'number' || plan.estimatedDuration <= 0) {
            errors.push({
                field: 'plan.estimatedDuration',
                message: 'Estimated duration must be a positive number',
                code: 'INVALID_VALUE',
            });
        }

        // Validate individual tasks
        if (plan.tasks && Array.isArray(plan.tasks)) {
            plan.tasks.forEach((task, index) => {
                if (!task.id) {
                    errors.push({
                        field: `plan.tasks[${index}].id`,
                        message: 'Task ID is required',
                        code: 'REQUIRED_FIELD',
                    });
                }

                if (!task.description) {
                    errors.push({
                        field: `plan.tasks[${index}].description`,
                        message: 'Task description is required',
                        code: 'REQUIRED_FIELD',
                    });
                }

                if (!task.type) {
                    errors.push({
                        field: `plan.tasks[${index}].type`,
                        message: 'Task type is required',
                        code: 'REQUIRED_FIELD',
                    });
                }

                if (!task.agentType) {
                    errors.push({
                        field: `plan.tasks[${index}].agentType`,
                        message: 'Agent type is required',
                        code: 'REQUIRED_FIELD',
                    });
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}