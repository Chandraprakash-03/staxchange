import prisma from '@/lib/prisma';
import { Project, Prisma } from '@/generated/prisma';
import { ValidationResult, ValidationError, TechStack, FileTree } from '@/types';

export class ProjectModel {
  /**
   * Create a new project
   */
  static async create(projectData: Prisma.ProjectCreateInput): Promise<Project> {
    return await prisma.project.create({
      data: projectData,
      include: {
        user: true,
        conversionJobs: true,
      },
    });
  }

  /**
   * Find project by ID
   */
  static async findById(id: string): Promise<Project | null> {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        user: true,
        conversionJobs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Find projects by user ID
   */
  static async findByUserId(userId: string): Promise<Project[]> {
    return await prisma.project.findMany({
      where: { userId },
      include: {
        user: true,
        conversionJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get the latest conversion job
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find projects by status
   */
  static async findByStatus(status: string): Promise<Project[]> {
    return await prisma.project.findMany({
      where: { status },
      include: {
        user: true,
        conversionJobs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update project
   */
  static async update(id: string, updates: Prisma.ProjectUpdateInput): Promise<Project | null> {
    try {
      return await prisma.project.update({
        where: { id },
        data: updates,
        include: {
          user: true,
          conversionJobs: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null; // Project not found
      }
      throw error;
    }
  }

  /**
   * Delete project
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.project.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false; // Project not found
      }
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  static async getStatistics(userId?: string) {
    const whereClause = userId ? { userId } : {};
    
    const [total, byStatus] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.groupBy({
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
   * Validate project data
   */
  static validateProjectData(projectData: Partial<Prisma.ProjectCreateInput>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!projectData.name) {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!projectData.githubUrl) {
      errors.push({
        field: 'githubUrl',
        message: 'GitHub URL is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!projectData.originalTechStack) {
      errors.push({
        field: 'originalTechStack',
        message: 'Original tech stack is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Format validation
    if (projectData.githubUrl && !this.isValidGithubUrl(projectData.githubUrl)) {
      errors.push({
        field: 'githubUrl',
        message: 'Invalid GitHub URL format',
        code: 'INVALID_FORMAT',
      });
    }

    if (projectData.name && projectData.name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Project name must be at least 2 characters long',
        code: 'INVALID_LENGTH',
      });
    }

    // Tech stack validation
    if (projectData.originalTechStack) {
      try {
        const techStackValidation = this.validateTechStack(projectData.originalTechStack as unknown as TechStack);
        errors.push(...techStackValidation.errors);
        warnings.push(...techStackValidation.warnings);
      } catch (error) {
        errors.push({
          field: 'originalTechStack',
          message: 'Invalid tech stack format',
          code: 'INVALID_FORMAT',
        });
      }
    }

    if (projectData.targetTechStack) {
      try {
        const techStackValidation = this.validateTechStack(projectData.targetTechStack as unknown as TechStack);
        errors.push(...techStackValidation.errors);
        warnings.push(...techStackValidation.warnings);
      } catch (error) {
        errors.push({
          field: 'targetTechStack',
          message: 'Invalid tech stack format',
          code: 'INVALID_FORMAT',
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
   * Validate tech stack data
   */
  static validateTechStack(techStack: TechStack): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!techStack.language) {
      errors.push({
        field: 'techStack.language',
        message: 'Programming language is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate known languages
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'csharp'];
    if (techStack.language && !supportedLanguages.includes(techStack.language.toLowerCase())) {
      warnings.push(`Language '${techStack.language}' may have limited conversion support`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate file tree structure
   */
  static validateFileTree(fileTree: FileTree): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!fileTree.name) {
      errors.push({
        field: 'fileTree.name',
        message: 'File/directory name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!fileTree.path) {
      errors.push({
        field: 'fileTree.path',
        message: 'File/directory path is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (fileTree.type !== 'file' && fileTree.type !== 'directory') {
      errors.push({
        field: 'fileTree.type',
        message: 'File type must be either "file" or "directory"',
        code: 'INVALID_VALUE',
      });
    }

    // Validate children for directories
    if (fileTree.type === 'directory' && fileTree.children) {
      for (const child of fileTree.children) {
        const childValidation = this.validateFileTree(child);
        errors.push(...childValidation.errors);
        warnings.push(...childValidation.warnings);
      }
    }

    // Validate file content for files
    if (fileTree.type === 'file' && fileTree.content && fileTree.content.length > 1000000) {
      warnings.push(`File '${fileTree.name}' is very large (${fileTree.content.length} characters)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isValidGithubUrl(url: string): boolean {
    const githubUrlRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    return githubUrlRegex.test(url);
  }
}