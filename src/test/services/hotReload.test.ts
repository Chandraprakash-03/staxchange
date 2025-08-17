import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HotReloadService } from '../../services/hotReload';
import { FileChange } from '../../types';

describe('HotReloadService', () => {
  let hotReloadService: HotReloadService;
  let mockCallback: any;

  beforeEach(() => {
    hotReloadService = new HotReloadService();
    mockCallback = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    hotReloadService.cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startWatching', () => {
    it('should start watching for file changes', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);

      const stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(1);
    });

    it('should use custom options when provided', () => {
      const customOptions = {
        debounceMs: 500,
        maxBatchSize: 100,
        excludePatterns: ['*.test.js']
      };

      hotReloadService.startWatching('project-1', 'preview-1', mockCallback, customOptions);

      // Verify watcher is created (internal state check would require access to private members)
      const stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(1);
    });
  });

  describe('stopWatching', () => {
    it('should stop watching and clean up resources', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);
      
      let stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(1);

      hotReloadService.stopWatching('project-1', 'preview-1');

      stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(0);
    });

    it('should clear pending debounce timers', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);
      
      // Stop watching before timer fires
      hotReloadService.stopWatching('project-1', 'preview-1');

      // Advance timers - callback should not be called
      vi.advanceTimersByTime(1000);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('processFileChanges', () => {
    beforeEach(() => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);
    });

    it('should debounce file changes and call callback', () => {
      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test content' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      // Callback should not be called immediately
      expect(mockCallback).not.toHaveBeenCalled();

      // Advance timer to trigger debounce
      vi.advanceTimersByTime(300);

      expect(mockCallback).toHaveBeenCalledWith(changes);
    });

    it('should merge multiple file changes', () => {
      const changes1: FileChange[] = [
        { path: 'test1.js', type: 'update', content: 'content1' }
      ];

      const changes2: FileChange[] = [
        { path: 'test2.js', type: 'create', content: 'content2' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes1);
      hotReloadService.processFileChanges('project-1', 'preview-1', changes2);

      vi.advanceTimersByTime(300);

      expect(mockCallback).toHaveBeenCalledWith([
        { path: 'test1.js', type: 'update', content: 'content1' },
        { path: 'test2.js', type: 'create', content: 'content2' }
      ]);
    });

    it('should filter out excluded files', () => {
      hotReloadService.stopWatching('project-1', 'preview-1');
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback, {
        excludePatterns: ['node_modules/**', '*.log']
      });

      const changes: FileChange[] = [
        { path: 'src/test.js', type: 'update', content: 'test' },
        { path: 'node_modules/package/index.js', type: 'update', content: 'excluded' },
        { path: 'debug.log', type: 'create', content: 'log content' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      vi.advanceTimersByTime(300);

      expect(mockCallback).toHaveBeenCalledWith([
        { path: 'src/test.js', type: 'update', content: 'test' }
      ]);
    });

    it('should handle overlapping file changes correctly', () => {
      const changes1: FileChange[] = [
        { path: 'test.js', type: 'create', content: 'initial' }
      ];

      const changes2: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'updated' }
      ];

      const changes3: FileChange[] = [
        { path: 'test.js', type: 'delete' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes1);
      hotReloadService.processFileChanges('project-1', 'preview-1', changes2);
      hotReloadService.processFileChanges('project-1', 'preview-1', changes3);

      vi.advanceTimersByTime(300);

      // Should only have the final delete operation
      expect(mockCallback).toHaveBeenCalledWith([
        { path: 'test.js', type: 'delete' }
      ]);
    });

    it('should not process changes for non-existent watcher', () => {
      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.processFileChanges('non-existent', 'preview-1', changes);

      vi.advanceTimersByTime(300);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should not process empty change sets after filtering', () => {
      hotReloadService.stopWatching('project-1', 'preview-1');
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback, {
        excludePatterns: ['**/*']
      });

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      vi.advanceTimersByTime(300);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('triggerReload', () => {
    beforeEach(() => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);
    });

    it('should trigger immediate reload without debouncing', () => {
      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.triggerReload('project-1', 'preview-1', changes);

      expect(mockCallback).toHaveBeenCalledWith(changes);
    });

    it('should clear pending debounce timer when triggered manually', () => {
      const changes1: FileChange[] = [
        { path: 'test1.js', type: 'update', content: 'test1' }
      ];

      const changes2: FileChange[] = [
        { path: 'test2.js', type: 'update', content: 'test2' }
      ];

      // Start debounced process
      hotReloadService.processFileChanges('project-1', 'preview-1', changes1);

      // Trigger manual reload
      hotReloadService.triggerReload('project-1', 'preview-1', changes2);

      expect(mockCallback).toHaveBeenCalledWith(changes2);

      // Advance timer - should not trigger again
      vi.advanceTimersByTime(300);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle non-existent watcher gracefully', () => {
      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      expect(() => {
        hotReloadService.triggerReload('non-existent', 'preview-1', changes);
      }).not.toThrow();

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('onReload', () => {
    it('should subscribe to reload events', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);

      let reloadEventReceived = false;
      const unsubscribe = hotReloadService.onReload((update) => {
        expect(update.previewId).toBe('preview-1');
        expect(update.changes).toHaveLength(1);
        reloadEventReceived = true;
      });

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.triggerReload('project-1', 'preview-1', changes);

      expect(reloadEventReceived).toBe(true);

      unsubscribe();
    });

    it('should allow unsubscribing from reload events', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);

      let eventCount = 0;
      const unsubscribe = hotReloadService.onReload(() => {
        eventCount++;
      });

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.triggerReload('project-1', 'preview-1', changes);
      expect(eventCount).toBe(1);

      unsubscribe();

      hotReloadService.triggerReload('project-1', 'preview-1', changes);
      expect(eventCount).toBe(1); // Should not increment after unsubscribe
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      let stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(0);
      expect(stats.pendingChanges).toBe(0);

      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);
      hotReloadService.startWatching('project-2', 'preview-2', mockCallback);

      stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(2);

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      stats = hotReloadService.getStats();
      expect(stats.pendingChanges).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up all watchers and timers', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback);
      hotReloadService.startWatching('project-2', 'preview-2', mockCallback);

      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      let stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(2);
      expect(stats.pendingChanges).toBe(1);

      hotReloadService.cleanup();

      stats = hotReloadService.getStats();
      expect(stats.activeWatchers).toBe(0);
      expect(stats.pendingChanges).toBe(0);

      // Advance timers - callbacks should not be called
      vi.advanceTimersByTime(1000);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('batch size limiting', () => {
    it('should limit batch size when maxBatchSize is exceeded', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback, {
        maxBatchSize: 2
      });

      const changes: FileChange[] = [
        { path: 'test1.js', type: 'update', content: 'test1' },
        { path: 'test2.js', type: 'update', content: 'test2' },
        { path: 'test3.js', type: 'update', content: 'test3' },
        { path: 'test4.js', type: 'update', content: 'test4' }
      ];

      hotReloadService.triggerReload('project-1', 'preview-1', changes);

      expect(mockCallback).toHaveBeenCalledWith([
        { path: 'test1.js', type: 'update', content: 'test1' },
        { path: 'test2.js', type: 'update', content: 'test2' }
      ]);
    });
  });

  describe('glob pattern matching', () => {
    it('should correctly match glob patterns', () => {
      hotReloadService.startWatching('project-1', 'preview-1', mockCallback, {
        excludePatterns: [
          'node_modules/**',
          '*.log',
          'dist/*',
          'src/test/**/*.test.js'
        ]
      });

      const changes: FileChange[] = [
        { path: 'src/index.js', type: 'update', content: 'included' },
        { path: 'node_modules/package/index.js', type: 'update', content: 'excluded' },
        { path: 'debug.log', type: 'create', content: 'excluded' },
        { path: 'dist/bundle.js', type: 'update', content: 'excluded' },
        { path: 'src/test/unit/component.test.js', type: 'update', content: 'excluded' },
        { path: 'src/components/Button.js', type: 'update', content: 'included' }
      ];

      hotReloadService.processFileChanges('project-1', 'preview-1', changes);

      vi.advanceTimersByTime(300);

      expect(mockCallback).toHaveBeenCalledWith([
        { path: 'src/index.js', type: 'update', content: 'included' },
        { path: 'src/components/Button.js', type: 'update', content: 'included' }
      ]);
    });
  });
});