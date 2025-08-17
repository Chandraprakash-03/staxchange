import { BaseService } from './base';
import { Project, TechStack } from '@/types';
import { ProjectModel } from '@/models/project';

export class ProjectService extends BaseService {
  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    try {
      this.log(`Fetching project with ID: ${id}`);
      
      const project = await ProjectModel.findById(id);
      
      if (!project) {
        this.warn(`Project not found: ${id}`);
        return null;
      }

      // Convert Prisma project to our Project type
      return this.convertPrismaProject(project);
    } catch (error) {
      this.error(`Failed to fetch project ${id}:`, error as Error);
      throw error;
    }
  }

  /**
   * Update project target tech stack
   */
  async updateTargetTechStack(id: string, targetTechStack: TechStack): Promise<Project | null> {
    try {
      this.log(`Updating target tech stack for project: ${id}`);
      
      const updatedProject = await ProjectModel.update(id, {
        targetTechStack: targetTechStack as any,
        updatedAt: new Date(),
      });

      if (!updatedProject) {
        this.warn(`Project not found for update: ${id}`);
        return null;
      }

      return this.convertPrismaProject(updatedProject);
    } catch (error) {
      this.error(`Failed to update project ${id}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get projects by user ID
   */
  async getProjectsByUser(userId: string): Promise<Project[]> {
    try {
      this.log(`Fetching projects for user: ${userId}`);
      
      const projects = await ProjectModel.findByUserId(userId);
      
      return projects.map(project => this.convertPrismaProject(project));
    } catch (error) {
      this.error(`Failed to fetch projects for user ${userId}:`, error as Error);
      throw error;
    }
  }

  /**
   * Convert Prisma project to our Project type
   */
  private convertPrismaProject(prismaProject: any): Project {
    return {
      id: prismaProject.id,
      name: prismaProject.name,
      githubUrl: prismaProject.githubUrl,
      userId: prismaProject.userId,
      originalTechStack: prismaProject.originalTechStack as TechStack,
      targetTechStack: prismaProject.targetTechStack as TechStack | undefined,
      status: prismaProject.status as any,
      fileStructure: prismaProject.fileStructure as any,
      createdAt: prismaProject.createdAt,
      updatedAt: prismaProject.updatedAt,
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();