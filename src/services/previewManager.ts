import { PreviewService } from './preview';
import { 
  PreviewEnvironment, 
  PreviewConfig, 
  FileChange, 
  FileTree, 
  Project,
  TechStack 
} from '../types';
import { BaseService } from './base';

export class PreviewManager extends BaseService {
  private previewService: PreviewService;
  private previewConfigs: Map<string, PreviewConfig> = new Map();
  private projectPreviews: Map<string, string> = new Map(); // projectId -> previewId

  constructor() {
    super();
    this.previewService = new PreviewService();
  }

  /**
   * Create a preview environment for a converted project
   */
  async createProjectPreview(
    project: Project, 
    convertedFiles: FileTree
  ): Promise<PreviewEnvironment> {
    try {
      // Generate preview configuration based on target tech stack
      const config = this.generatePreviewConfig(project.targetTechStack || project.originalTechStack);
      
      // Create the preview environment
      const preview = await this.previewService.createPreview(
        project.id,
        convertedFiles,
        config
      );

      // Store the mapping and config
      this.projectPreviews.set(project.id, preview.id);
      this.previewConfigs.set(preview.id, config);

      this.log(`Created preview for project ${project.id}: ${preview.id}`);
      return preview;

    } catch (error) {
      this.error(`Failed to create preview for project ${project.id}`);
      const err = error as Error
      throw new Error(`Failed to create project preview: ${err.message}`);
    }
  }
    
  /**
   * Update project preview with conversion results
   */
  async updateProjectPreview(projectId: string, changes: FileChange[]): Promise<void> {
    try {
      const previewId = this.projectPreviews.get(projectId);
      if (!previewId) {
        throw new Error(`No preview found for project: ${projectId}`);
      }

      await this.previewService.updatePreview(previewId, changes);
      this.log(`Updated preview for project ${projectId}`);

    } catch (error) {
      this.error(`Failed to update preview for project ${projectId}`);
      throw error;
    }
  }

  /**
   * Get preview environment for a project
   */
  async getProjectPreview(projectId: string): Promise<PreviewEnvironment | null> {
    try {
      const previewId = this.projectPreviews.get(projectId);
      if (!previewId) {
        return null;
      }

      return await this.previewService.getPreviewStatus(previewId);

    } catch (error) {
      this.error(`Failed to get preview for project ${projectId}`);
      return null;
    }
  }

  /**
   * Get preview URL for a project
   */
  async getProjectPreviewUrl(projectId: string): Promise<string | null> {
    try {
      const previewId = this.projectPreviews.get(projectId);
      if (!previewId) {
        return null;
      }

      return await this.previewService.getPreviewUrl(previewId);

    } catch (error) {
      this.error(`Failed to get preview URL for project ${projectId}`);
      return null;
    }
  }

  /**
   * Destroy preview environment for a project
   */
  async destroyProjectPreview(projectId: string): Promise<void> {
    try {
      const previewId = this.projectPreviews.get(projectId);
      if (!previewId) {
        this.warn(`No preview found to destroy for project: ${projectId}`);
        return;
      }

      await this.previewService.destroyPreview(previewId);
      
      // Clean up mappings
      this.projectPreviews.delete(projectId);
      this.previewConfigs.delete(previewId);

      this.log(`Destroyed preview for project ${projectId}`);

    } catch (error) {
      this.error(`Failed to destroy preview for project ${projectId}`);
      throw error;
    }
  }
    
  /**
   * Subscribe to hot reload updates for a project
   */
  onProjectPreviewUpdate(
    projectId: string, 
    callback: (changes: FileChange[]) => void
  ): () => void {
    return this.previewService.onPreviewUpdate((update) => {
      const previewId = this.projectPreviews.get(projectId);
      if (previewId === update.previewId) {
        callback(update.changes);
      }
    });
  }

  /**
   * Get all active project previews
   */
  getActiveProjectPreviews(): { projectId: string; previewId: string }[] {
    return Array.from(this.projectPreviews.entries()).map(([projectId, previewId]) => ({
      projectId,
      previewId
    }));
  }

  /**
   * Clean up all preview environments
   */
  async cleanup(): Promise<void> {
    try {
      const activePreviews = this.previewService.getActivePreviews();
      
      for (const previewId of activePreviews) {
        await this.previewService.destroyPreview(previewId);
      }

      this.projectPreviews.clear();
      this.previewConfigs.clear();

      this.log('Cleaned up all preview environments');

    } catch (error) {
      this.error('Failed to cleanup preview environments');
      throw error;
    }
  }

  /**
   * Generate preview configuration based on tech stack
   */
  private generatePreviewConfig(techStack: TechStack): PreviewConfig {
    const config: PreviewConfig = {
      runtime: 'node',
      port: 3000,
      entryPoint: 'index.js',
      environment: {}
    };

    // Configure based on framework
    switch (techStack.framework?.toLowerCase()) {
      case 'react':
        config.buildCommand = 'build';
        config.startCommand = 'start';
        config.entryPoint = 'src/index.js';
        break;

      case 'vue':
        config.buildCommand = 'build';
        config.startCommand = 'serve';
        config.entryPoint = 'src/main.js';
        break;

      case 'angular':
        config.buildCommand = 'build';
        config.startCommand = 'start';
        config.entryPoint = 'src/main.ts';
        break;

      case 'next.js':
      case 'nextjs':
        config.buildCommand = 'build';
        config.startCommand = 'start';
        config.entryPoint = 'pages/index.js';
        break;

      case 'express':
        config.startCommand = 'start';
        config.entryPoint = 'server.js';
        break;

      case 'fastapi':
        config.runtime = 'python';
        config.startCommand = 'uvicorn main:app --reload';
        config.entryPoint = 'main.py';
        break;

      case 'django':
        config.runtime = 'python';
        config.startCommand = 'runserver';
        config.entryPoint = 'manage.py';
        break;

      default:
        // Try to detect from language
        if (techStack.language?.toLowerCase() === 'python') {
          config.runtime = 'python';
          config.entryPoint = 'main.py';
        } else if (techStack.language?.toLowerCase() === 'javascript' || 
                   techStack.language?.toLowerCase() === 'typescript') {
          config.runtime = 'node';
          config.entryPoint = 'index.js';
        } else {
          // Default to static serving
          config.runtime = 'static';
          config.entryPoint = 'index.html';
        }
    }

    // Set environment variables based on tech stack
    config.environment = {
      NODE_ENV: 'development',
      PORT: config.port.toString(),
      ...this.getFrameworkEnvironment(techStack)
    };

    return config;
  }

  /**
   * Get framework-specific environment variables
   */
  private getFrameworkEnvironment(techStack: TechStack): Record<string, string> {
    const env: Record<string, string> = {};

    switch (techStack.framework?.toLowerCase()) {
      case 'react':
        env.REACT_APP_ENV = 'preview';
        break;

      case 'vue':
        env.VUE_APP_ENV = 'preview';
        break;

      case 'angular':
        env.NG_ENV = 'preview';
        break;

      case 'next.js':
      case 'nextjs':
        env.NEXT_PUBLIC_ENV = 'preview';
        break;
    }

    return env;
  }
}

export default PreviewManager;