import { EventEmitter } from 'events';
import { FileChange, PreviewUpdate } from '../types';
import { BaseService } from './base';

export interface HotReloadOptions {
  debounceMs?: number;
  maxBatchSize?: number;
  excludePatterns?: string[];
}

export interface FileWatcher {
  projectId: string;
  previewId: string;
  callback: (changes: FileChange[]) => void;
  options: HotReloadOptions;
}

export class HotReloadService extends BaseService {
  private eventEmitter = new EventEmitter();
  private watchers: Map<string, FileWatcher> = new Map();
  private pendingChanges: Map<string, FileChange[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly DEFAULT_OPTIONS: HotReloadOptions = {
    debounceMs: 300,
    maxBatchSize: 50,
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ]
  };

  /**
   * Start watching for file changes in a project preview
   */
  startWatching(
    projectId: string, 
    previewId: string, 
    callback: (changes: FileChange[]) => void,
    options: Partial<HotReloadOptions> = {}
  ): void {
    const watcherId = `${projectId}:${previewId}`;
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    const watcher: FileWatcher = {
      projectId,
      previewId,
      callback,
      options: mergedOptions
    };

    this.watchers.set(watcherId, watcher);
    this.log(`Started hot reload watching for project ${projectId}`);
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(projectId: string, previewId: string): void {
    const watcherId = `${projectId}:${previewId}`;
    
    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(watcherId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(watcherId);
    }

    // Remove watcher and pending changes
    this.watchers.delete(watcherId);
    this.pendingChanges.delete(watcherId);

    this.log(`Stopped hot reload watching for project ${projectId}`);
  }

  /**
   * Process file changes and trigger hot reload
   */
  processFileChanges(projectId: string, previewId: string, changes: FileChange[]): void {
    const watcherId = `${projectId}:${previewId}`;
    const watcher = this.watchers.get(watcherId);

    if (!watcher) {
      this.warn(`No watcher found for project ${projectId}`);
      return;
    }

    // Filter out excluded files
    const filteredChanges = this.filterChanges(changes, watcher.options.excludePatterns || []);
    
    if (filteredChanges.length === 0) {
      return;
    }

    // Add to pending changes
    const existing = this.pendingChanges.get(watcherId) || [];
    const merged = this.mergeChanges([...existing, ...filteredChanges]);
    this.pendingChanges.set(watcherId, merged);

    // Debounce the reload
    this.debounceReload(watcherId, watcher);
  }

  /**
   * Manually trigger hot reload for a project
   */
  triggerReload(projectId: string, previewId: string, changes: FileChange[]): void {
    const watcherId = `${projectId}:${previewId}`;
    const watcher = this.watchers.get(watcherId);

    if (!watcher) {
      this.warn(`No watcher found for project ${projectId}`);
      return;
    }

    // Clear any pending timer and execute immediately
    const timer = this.debounceTimers.get(watcherId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(watcherId);
    }

    this.executeReload(watcherId, watcher, changes);
  }

  /**
   * Get hot reload statistics
   */
  getStats(): { activeWatchers: number; pendingChanges: number } {
    return {
      activeWatchers: this.watchers.size,
      pendingChanges: Array.from(this.pendingChanges.values())
        .reduce((sum, changes) => sum + changes.length, 0)
    };
  }

  /**
   * Subscribe to hot reload events
   */
  onReload(callback: (update: PreviewUpdate) => void): () => void {
    this.eventEmitter.on('reload', callback);
    
    return () => {
      this.eventEmitter.off('reload', callback);
    };
  }

  /**
   * Clean up all watchers
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.debounceTimers.clear();
    this.watchers.clear();
    this.pendingChanges.clear();

    this.log('Hot reload service cleaned up');
  }

  /**
   * Private helper methods
   */
  private debounceReload(watcherId: string, watcher: FileWatcher): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(watcherId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const changes = this.pendingChanges.get(watcherId) || [];
      if (changes.length > 0) {
        this.executeReload(watcherId, watcher, changes);
        this.pendingChanges.delete(watcherId);
      }
      this.debounceTimers.delete(watcherId);
    }, watcher.options.debounceMs || this.DEFAULT_OPTIONS.debounceMs);

    this.debounceTimers.set(watcherId, timer);
  }

  private executeReload(watcherId: string, watcher: FileWatcher, changes: FileChange[]): void {
    try {
      // Limit batch size
      const maxBatchSize = watcher.options.maxBatchSize || this.DEFAULT_OPTIONS.maxBatchSize!;
      const batchedChanges = changes.slice(0, maxBatchSize);

      if (changes.length > maxBatchSize) {
        this.warn(`Batching ${changes.length} changes to ${maxBatchSize} for project ${watcher.projectId}`);
      }

      // Execute the callback
      watcher.callback(batchedChanges);

      // Emit reload event
      const update: PreviewUpdate = {
        previewId: watcher.previewId,
        changes: batchedChanges,
        timestamp: new Date()
      };

      this.eventEmitter.emit('reload', update);

      this.log(`Hot reload executed for project ${watcher.projectId} with ${batchedChanges.length} changes`);

    } catch (error) {
      this.error(`Hot reload failed for project ${watcher.projectId}`);
    }
  }

  private filterChanges(changes: FileChange[], excludePatterns: string[]): FileChange[] {
    return changes.filter(change => {
      return !this.isExcluded(change.path, excludePatterns);
    });
  }

  private isExcluded(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simple glob pattern matching
      const regex = this.globToRegex(pattern);
      return regex.test(filePath);
    });
  }

  private globToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLE_STAR___/g, '.*')
      .replace(/\?/g, '[^/]');

    // Handle special case where pattern is **/* which should match everything
    if (pattern === '**/*') {
      regexPattern = '.*';
    }

    return new RegExp(`^${regexPattern}$`);
  }

  private mergeChanges(changes: FileChange[]): FileChange[] {
    const changeMap = new Map<string, FileChange>();

    // Merge changes by path, keeping the latest change
    for (const change of changes) {
      const existing = changeMap.get(change.path);
      
      if (!existing) {
        changeMap.set(change.path, change);
      } else {
        // If we have a delete followed by create/update, keep the latest
        // If we have create/update followed by delete, keep delete
        if (change.type === 'delete' || existing.type !== 'delete') {
          changeMap.set(change.path, change);
        }
      }
    }

    return Array.from(changeMap.values());
  }
}

export default HotReloadService;