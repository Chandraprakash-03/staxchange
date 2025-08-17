import { WebContainer } from '@webcontainer/api';
import { EventEmitter } from 'events';
import { 
  PreviewEnvironment, 
  PreviewConfig, 
  PreviewStatus, 
  LogEntry, 
  FileChange, 
  PreviewUpdate,
  WebContainerInstance,
  FileTree 
} from '../types';
import { BaseService } from './base';

export class PreviewService extends BaseService {
  private containers: Map<string, WebContainerInstance> = new Map();
  private eventEmitter = new EventEmitter();
  private readonly MAX_CONTAINERS = 10;
  private readonly CONTAINER_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    this.setupCleanupInterval();
  }

  /**
   * Create a new preview environment for a project
   */
  async createPreview(projectId: string, files: FileTree, config: PreviewConfig): Promise<PreviewEnvironment> {
    try {
      const previewId = this.generateId();
      
      // Check container limits
      if (this.containers.size >= this.MAX_CONTAINERS) {
        await this.cleanupOldestContainer();
      }

      // Initialize WebContainer
      const container = await WebContainer.boot();
      const containerInstance: WebContainerInstance = {
        id: previewId,
        container,
        status: 'starting'
      };

      this.containers.set(previewId, containerInstance);

      // Mount files to container
      await this.mountFiles(container, files);

      // Install dependencies and start the application
      const process = await this.startApplication(container, config);
      containerInstance.process = process;
      containerInstance.status = 'ready';

      const preview: PreviewEnvironment = {
        id: previewId,
        projectId,
        url: await this.getPreviewUrl(previewId),
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config
      };

      this.log(`Preview environment created: ${previewId}`);
      return preview;

    } catch (error) {
      this.error('Failed to create preview environment');
      const err = error as Error
      throw new Error(`Failed to create preview: ${err.message}`);
    }
  }
   

  /**
   * Update preview environment with new file changes
   */
  async updatePreview(previewId: string, changes: FileChange[]): Promise<void> {
    try {
      const containerInstance = this.containers.get(previewId);
      if (!containerInstance) {
        throw new Error(`Preview environment not found: ${previewId}`);
      }

      const { container } = containerInstance;

      // Apply file changes
      for (const change of changes) {
        switch (change.type) {
          case 'create':
          case 'update':
            if (change.content) {
              await container.fs.writeFile(change.path, change.content);
            }
            break;
          case 'delete':
            try {
              await container.fs.rm(change.path);
            } catch (error) {
              // File might not exist, continue
              const err = error as Error
              this.warn(`Failed to delete file ${change.path}: ${err.message}`);
            }
            break;
        }
      }

      // Update last accessed time
      containerInstance.container = container;
      
      // Emit update event for hot reload
      this.eventEmitter.emit('preview-updated', {
        previewId,
        changes,
        timestamp: new Date()
      } as PreviewUpdate);

      this.log(`Preview updated: ${previewId} with ${changes.length} changes`);

    } catch (error) {
      this.error(`Failed to update preview ${previewId}`);
      const err = error as Error
      throw new Error(`Failed to update preview: ${err.message}`);
    }
  }

  /**
   * Get preview URL for a given preview ID
   */
  async getPreviewUrl(previewId: string): Promise<string> {
    const containerInstance = this.containers.get(previewId);
    if (!containerInstance) {
      throw new Error(`Preview environment not found: ${previewId}`);
    }

    try {
      // WebContainer provides a URL once the server is running
      const { container } = containerInstance;
      
      // Wait for server to be ready and get the URL
      const serverProcess = containerInstance.process;
      if (serverProcess) {
        // WebContainer will provide the preview URL
        return container.url || `http://localhost:${containerInstance.container.port || 3000}`;
      }

      throw new Error('Server process not ready');
    } catch (error) {
      this.error(`Failed to get preview URL for ${previewId}`);
      const err = error as Error
      throw new Error(`Failed to get preview URL: ${err.message}`);
    }
  }

  /**
   * Get preview environment status and logs
   */
  async getPreviewStatus(previewId: string): Promise<PreviewEnvironment | null> {
    const containerInstance = this.containers.get(previewId);
    if (!containerInstance) {
      return null;
    }

    try {
      const logs = await this.getContainerLogs(previewId);
      
      return {
        id: previewId,
        projectId: '', // This would be stored separately in a real implementation
        url: await this.getPreviewUrl(previewId),
        status: containerInstance.status as PreviewStatus,
        logs,
        createdAt: new Date(), // This would be stored
        lastAccessed: new Date(),
        config: {} as PreviewConfig // This would be stored
      };
    } catch (error) {
      this.error(`Failed to get preview status for ${previewId}`);
      return null;
    }
  }

  /**
   * Destroy a preview environment
   */
  async destroyPreview(previewId: string): Promise<void> {
    try {
      const containerInstance = this.containers.get(previewId);
      if (!containerInstance) {
        this.warn(`Preview environment not found for destruction: ${previewId}`);
        return;
      }

      // Kill the process if running
      if (containerInstance.process) {
        containerInstance.process.kill();
      }

      // Tear down the container
      await containerInstance.container.teardown();

      // Remove from our tracking
      this.containers.delete(previewId);

      this.log(`Preview environment destroyed: ${previewId}`);
    } catch (error) {
      this.error(`Failed to destroy preview ${previewId}`);
      const err = error as Error;
      throw new Error(`Failed to destroy preview: ${err.message}`);
    }
  }

  /**
   * Subscribe to preview updates for hot reload
   */
  onPreviewUpdate(callback: (update: PreviewUpdate) => void): () => void {
    this.eventEmitter.on('preview-updated', callback);
    
    // Return unsubscribe function
    return () => {
      this.eventEmitter.off('preview-updated', callback);
    };
  }

  /**
   * Get all active preview environments
   */
  getActivePreviews(): string[] {
    return Array.from(this.containers.keys());
  }

  /**
   * Private helper methods
   */
  private async mountFiles(container: WebContainer, fileTree: FileTree): Promise<void> {
    const files = this.flattenFileTree(fileTree);
    
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        // Ensure directory exists
        const dir = file.path.substring(0, file.path.lastIndexOf('/'));
        if (dir) {
          await container.fs.mkdir(dir, { recursive: true });
        }
        
        await container.fs.writeFile(file.path, file.content);
      }
    }
  }

  private flattenFileTree(tree: FileTree, basePath = ''): FileTree[] {
    const files: FileTree[] = [];
    
    if (tree.type === 'file') {
      files.push({
        ...tree,
        path: basePath ? `${basePath}/${tree.name}` : tree.name
      });
    } else if (tree.children) {
      for (const child of tree.children) {
        const childPath = basePath ? `${basePath}/${tree.name}` : tree.name;
        files.push(...this.flattenFileTree(child, childPath));
      }
    }
    
    return files;
  }

  private async startApplication(container: WebContainer, config: PreviewConfig): Promise<any> {
    try {
      // Install dependencies if package.json exists
      if (config.runtime === 'node') {
        const packageJsonExists = await this.fileExists(container, 'package.json');
        if (packageJsonExists) {
          const installProcess = await container.spawn('npm', ['install']);
          await installProcess.exit;
        }

        // Run build command if specified
        if (config.buildCommand) {
          const buildProcess = await container.spawn('npm', ['run', config.buildCommand]);
          await buildProcess.exit;
        }

        // Start the application
        const startCommand = config.startCommand || 'start';
        return await container.spawn('npm', ['run', startCommand]);
      }

      // For static files, start a simple server
      if (config.runtime === 'static') {
        return await container.spawn('npx', ['serve', '.', '-p', config.port.toString()]);
      }

      throw new Error(`Unsupported runtime: ${config.runtime}`);
    } catch (error) {
      this.error('Failed to start application');
      throw error;
    }
  }

  private async fileExists(container: WebContainer, path: string): Promise<boolean> {
    try {
      await container.fs.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  private async getContainerLogs(previewId: string): Promise<LogEntry[]> {
    // In a real implementation, this would collect logs from the container
    // For now, return empty array
    return [];
  }

  private async cleanupOldestContainer(): Promise<void> {
    // Find the oldest container and clean it up
    const containers = Array.from(this.containers.entries());
    if (containers.length > 0) {
      const [oldestId] = containers[0];
      await this.destroyPreview(oldestId);
    }
  }

  private setupCleanupInterval(): void {
    // Clean up inactive containers every 5 minutes
    setInterval(async () => {
      const now = Date.now();
      const containersToCleanup: string[] = [];

      for (const [id, instance] of this.containers.entries()) {
        // Check if container has been inactive for too long
        // In a real implementation, you'd track last access time
        if (instance.status === 'error') {
          containersToCleanup.push(id);
        }
      }

      for (const id of containersToCleanup) {
        try {
          await this.destroyPreview(id);
        } catch (error) {
          this.error(`Failed to cleanup container ${id}`);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private generateId(): string {
    return `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default PreviewService;