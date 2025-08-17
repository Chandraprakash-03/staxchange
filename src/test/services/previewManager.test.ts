import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreviewManager } from '../../services/previewManager';
import { PreviewService } from '../../services/preview';
import { Project, TechStack, FileTree, FileChange, PreviewEnvironment } from '../../types';

// Mock PreviewService
vi.mock('../../services/preview');

describe('PreviewManager', () => {
  let previewManager: PreviewManager;
  let mockPreviewService: any;
  let mockProject: Project;
  let mockFileTree: FileTree;

  beforeEach(() => {
    mockPreviewService = {
      createPreview: vi.fn(),
      updatePreview: vi.fn(),
      getPreviewStatus: vi.fn(),
      getPreviewUrl: vi.fn(),
      destroyPreview: vi.fn(),
      onPreviewUpdate: vi.fn(),
      getActivePreviews: vi.fn()
    };

    vi.mocked(PreviewService).mockImplementation(() => mockPreviewService);

    previewManager = new PreviewManager();

    mockProject = {
      id: 'project-1',
      name: 'Test Project',
      githubUrl: 'https://github.com/test/repo',
      userId: 'user-1',
      originalTechStack: {
        language: 'javascript',
        framework: 'react',
        additional: {}
      },
      targetTechStack: {
        language: 'typescript',
        framework: 'vue',
        additional: {}
      },
      status: 'ready',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFileTree = {
      name: 'project',
      type: 'directory',
      path: '/',
      metadata: {
        size: 1024,
        lastModified: new Date()
      },
      children: [
        {
          name: 'src',
          type: 'directory',
          path: '/src',
          metadata: { size: 512, lastModified: new Date() },
          children: [
            {
              name: 'App.vue',
              type: 'file',
              path: '/src/App.vue',
              content: '<template><div>Hello Vue</div></template>',
              metadata: { size: 64, lastModified: new Date() }
            }
          ]
        }
      ]
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createProjectPreview', () => {
    it('should create preview with Vue configuration for Vue target stack', async () => {
      const mockPreview: PreviewEnvironment = {
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {
          runtime: 'node',
          port: 3000,
          entryPoint: 'src/main.js',
          buildCommand: 'build',
          startCommand: 'serve',
          environment: {
            NODE_ENV: 'development',
            PORT: '3000',
            VUE_APP_ENV: 'preview'
          }
        }
      };

      mockPreviewService.createPreview.mockResolvedValue(mockPreview);

      const result = await previewManager.createProjectPreview(mockProject, mockFileTree);

      expect(result).toEqual(mockPreview);
      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'node',
          entryPoint: 'src/main.js',
          buildCommand: 'build',
          startCommand: 'serve',
          environment: expect.objectContaining({
            VUE_APP_ENV: 'preview'
          })
        })
      );
    });

    it('should create preview with React configuration for React target stack', async () => {
      const reactProject = {
        ...mockProject,
        targetTechStack: {
          language: 'javascript',
          framework: 'react',
          additional: {}
        }
      };

      const mockPreview: PreviewEnvironment = {
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {
          runtime: 'node',
          port: 3000,
          entryPoint: 'src/index.js',
          buildCommand: 'build',
          startCommand: 'start',
          environment: {
            NODE_ENV: 'development',
            PORT: '3000',
            REACT_APP_ENV: 'preview'
          }
        }
      };

      mockPreviewService.createPreview.mockResolvedValue(mockPreview);

      const result = await previewManager.createProjectPreview(reactProject, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'node',
          entryPoint: 'src/index.js',
          buildCommand: 'build',
          startCommand: 'start',
          environment: expect.objectContaining({
            REACT_APP_ENV: 'preview'
          })
        })
      );
    });

    it('should create preview with Next.js configuration', async () => {
      const nextProject = {
        ...mockProject,
        targetTechStack: {
          language: 'typescript',
          framework: 'next.js',
          additional: {}
        }
      };

      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(nextProject, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'node',
          entryPoint: 'pages/index.js',
          buildCommand: 'build',
          startCommand: 'start',
          environment: expect.objectContaining({
            NEXT_PUBLIC_ENV: 'preview'
          })
        })
      );
    });

    it('should create preview with Python configuration for FastAPI', async () => {
      const fastApiProject = {
        ...mockProject,
        targetTechStack: {
          language: 'python',
          framework: 'fastapi',
          additional: {}
        }
      };

      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(fastApiProject, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'python',
          entryPoint: 'main.py',
          startCommand: 'uvicorn main:app --reload'
        })
      );
    });

    it('should fallback to original tech stack if no target stack', async () => {
      const projectWithoutTarget = {
        ...mockProject,
        targetTechStack: undefined
      };

      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(projectWithoutTarget, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'node',
          entryPoint: 'src/index.js',
          environment: expect.objectContaining({
            REACT_APP_ENV: 'preview'
          })
        })
      );
    });

    it('should handle preview creation failure', async () => {
      mockPreviewService.createPreview.mockRejectedValue(new Error('Creation failed'));

      await expect(
        previewManager.createProjectPreview(mockProject, mockFileTree)
      ).rejects.toThrow('Failed to create project preview: Creation failed');
    });
  });

  describe('updateProjectPreview', () => {
    it('should update existing project preview', async () => {
      // First create a preview
      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(mockProject, mockFileTree);

      const changes: FileChange[] = [
        {
          path: 'src/App.vue',
          type: 'update',
          content: '<template><div>Updated Vue App</div></template>'
        }
      ];

      await previewManager.updateProjectPreview('project-1', changes);

      expect(mockPreviewService.updatePreview).toHaveBeenCalledWith('preview-1', changes);
    });

    it('should throw error for non-existent project preview', async () => {
      const changes: FileChange[] = [
        { path: 'test.js', type: 'update', content: 'test' }
      ];

      await expect(
        previewManager.updateProjectPreview('non-existent', changes)
      ).rejects.toThrow('No preview found for project: non-existent');
    });
  });

  describe('getProjectPreview', () => {
    it('should return preview for existing project', async () => {
      const mockPreview = {
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready' as const,
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      };

      mockPreviewService.createPreview.mockResolvedValue(mockPreview);
      mockPreviewService.getPreviewStatus.mockResolvedValue(mockPreview);

      await previewManager.createProjectPreview(mockProject, mockFileTree);
      const result = await previewManager.getProjectPreview('project-1');

      expect(result).toEqual(mockPreview);
      expect(mockPreviewService.getPreviewStatus).toHaveBeenCalledWith('preview-1');
    });

    it('should return null for non-existent project', async () => {
      const result = await previewManager.getProjectPreview('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getProjectPreviewUrl', () => {
    it('should return preview URL for existing project', async () => {
      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      mockPreviewService.getPreviewUrl.mockResolvedValue('http://localhost:3000');

      await previewManager.createProjectPreview(mockProject, mockFileTree);
      const url = await previewManager.getProjectPreviewUrl('project-1');

      expect(url).toBe('http://localhost:3000');
      expect(mockPreviewService.getPreviewUrl).toHaveBeenCalledWith('preview-1');
    });

    it('should return null for non-existent project', async () => {
      const url = await previewManager.getProjectPreviewUrl('non-existent');
      expect(url).toBeNull();
    });
  });

  describe('destroyProjectPreview', () => {
    it('should destroy existing project preview', async () => {
      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(mockProject, mockFileTree);
      await previewManager.destroyProjectPreview('project-1');

      expect(mockPreviewService.destroyPreview).toHaveBeenCalledWith('preview-1');
    });

    it('should handle destroying non-existent project gracefully', async () => {
      await expect(
        previewManager.destroyProjectPreview('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('onProjectPreviewUpdate', () => {
    it('should subscribe to preview updates for specific project', async () => {
      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      let callbackCalled = false;
      const callback = vi.fn(() => { callbackCalled = true; });

      // Mock the onPreviewUpdate to call our callback
      mockPreviewService.onPreviewUpdate.mockImplementation((cb: any) => {
        // Simulate an update for the correct preview
        setTimeout(() => {
          cb({
            previewId: 'preview-1',
            changes: [{ path: 'test.js', type: 'update', content: 'test' }],
            timestamp: new Date()
          });
        }, 0);
        return () => {}; // unsubscribe function
      });

      await previewManager.createProjectPreview(mockProject, mockFileTree);
      previewManager.onProjectPreviewUpdate('project-1', callback);

      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith([
        { path: 'test.js', type: 'update', content: 'test' }
      ]);
    });
  });

  describe('getActiveProjectPreviews', () => {
    it('should return list of active project previews', async () => {
      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      await previewManager.createProjectPreview(mockProject, mockFileTree);

      const activePreviews = previewManager.getActiveProjectPreviews();

      expect(activePreviews).toEqual([
        { projectId: 'project-1', previewId: 'preview-1' }
      ]);
    });

    it('should return empty array when no previews are active', () => {
      const activePreviews = previewManager.getActiveProjectPreviews();
      expect(activePreviews).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all preview environments', async () => {
      mockPreviewService.getActivePreviews.mockReturnValue(['preview-1', 'preview-2']);

      await previewManager.cleanup();

      expect(mockPreviewService.destroyPreview).toHaveBeenCalledWith('preview-1');
      expect(mockPreviewService.destroyPreview).toHaveBeenCalledWith('preview-2');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockPreviewService.getActivePreviews.mockReturnValue(['preview-1']);
      mockPreviewService.destroyPreview.mockRejectedValue(new Error('Cleanup failed'));

      await expect(previewManager.cleanup()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('generatePreviewConfig', () => {
    it('should generate static config for unknown frameworks', () => {
      const unknownProject = {
        ...mockProject,
        targetTechStack: {
          language: 'html',
          framework: 'unknown',
          additional: {}
        }
      };

      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      previewManager.createProjectPreview(unknownProject, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'static',
          entryPoint: 'index.html'
        })
      );
    });

    it('should generate Python config for Python language without framework', () => {
      const pythonProject = {
        ...mockProject,
        targetTechStack: {
          language: 'python',
          additional: {}
        }
      };

      mockPreviewService.createPreview.mockResolvedValue({
        id: 'preview-1',
        projectId: 'project-1',
        url: 'http://localhost:3000',
        status: 'ready',
        logs: [],
        createdAt: new Date(),
        lastAccessed: new Date(),
        config: {} as any
      });

      previewManager.createProjectPreview(pythonProject, mockFileTree);

      expect(mockPreviewService.createPreview).toHaveBeenCalledWith(
        'project-1',
        mockFileTree,
        expect.objectContaining({
          runtime: 'python',
          entryPoint: 'main.py'
        })
      );
    });
  });
});