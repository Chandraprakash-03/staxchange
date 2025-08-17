import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubImportService } from '@/services/github';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock fs/promises
vi.mock('fs/promises');
const mockedFs = vi.mocked(fs);

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-project-id-123'
}));

describe('GitHubImportService', () => {
  let service: GitHubImportService;
  const mockRepoData = {
    id: 123,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    private: false,
    html_url: 'https://github.com/testuser/test-repo',
    clone_url: 'https://github.com/testuser/test-repo.git',
    size: 1024,
    default_branch: 'main',
    language: 'JavaScript',
    languages_url: 'https://api.github.com/repos/testuser/test-repo/languages'
  };

  const mockLanguages = {
    'JavaScript': 15000,
    'TypeScript': 5000,
    'CSS': 2000
  };

  const mockContents = [
    {
      name: 'package.json',
      path: 'package.json',
      type: 'file' as const,
      size: 500,
      download_url: 'https://raw.githubusercontent.com/testuser/test-repo/main/package.json'
    },
    {
      name: 'src',
      path: 'src',
      type: 'dir' as const
    },
    {
      name: 'README.md',
      path: 'README.md',
      type: 'file' as const,
      size: 200,
      download_url: 'https://raw.githubusercontent.com/testuser/test-repo/main/README.md'
    }
  ];

  const mockPackageJson = JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      react: '^18.0.0',
      axios: '^1.0.0'
    },
    devDependencies: {
      typescript: '^5.0.0',
      '@types/react': '^18.0.0'
    }
  });

  beforeEach(() => {
    service = new GitHubImportService();
    vi.clearAllMocks();

    // Setup axios create mock
    mockedAxios.create = vi.fn().mockReturnValue({
      get: vi.fn(),
      defaults: {
        headers: {
          common: {}
        }
      }
    });

    // Setup fs mocks
    mockedFs.mkdir = vi.fn().mockResolvedValue(undefined);
    mockedFs.writeFile = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateRepository', () => {
    it('should validate a correct GitHub URL', async () => {
      const mockApiClient = {
        get: vi.fn().mockResolvedValue({ data: mockRepoData })
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.validateRepository('https://github.com/testuser/test-repo');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockApiClient.get).toHaveBeenCalledWith('/repos/testuser/test-repo');
    });

    it('should reject invalid GitHub URL format', async () => {
      const result = await service.validateRepository('https://invalid-url.com/repo');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_URL_FORMAT');
    });

    it('should handle repository not found error', async () => {
      const mockApiClient = {
        get: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 404 }
        })
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.validateRepository('https://github.com/testuser/nonexistent');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REPO_NOT_FOUND');
    });

    it('should handle authentication required error', async () => {
      const mockApiClient = {
        get: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 403 }
        })
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.validateRepository('https://github.com/testuser/private-repo');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AUTH_REQUIRED');
    });

    it('should warn about large repositories', async () => {
      const largeRepoData = { ...mockRepoData, size: 150000 };
      const mockApiClient = {
        get: vi.fn().mockResolvedValue({ data: largeRepoData })
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.validateRepository('https://github.com/testuser/large-repo');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Repository is large and may take longer to import');
    });

    it('should warn about private repositories', async () => {
      const privateRepoData = { ...mockRepoData, private: true };
      const mockApiClient = {
        get: vi.fn().mockResolvedValue({ data: privateRepoData })
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.validateRepository('https://github.com/testuser/private-repo');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Repository is private - authentication may be required');
    });
  });

  describe('importRepository', () => {
    it('should successfully import a public repository', async () => {
      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData }) // validateRepository call
          .mockResolvedValueOnce({ data: mockRepoData }) // getRepositoryInfo call
          .mockResolvedValueOnce({ data: mockContents }) // getRepositoryContents call
          .mockResolvedValueOnce({ data: mockLanguages }), // languages call
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      // Mock axios.get for file downloads
      mockedAxios.get = vi.fn()
        .mockResolvedValueOnce({ data: mockPackageJson }) // package.json content
        .mockResolvedValueOnce({ data: '# Test Repository' }); // README.md content

      const result = await service.importRepository('https://github.com/testuser/test-repo');

      expect(result.status).toBe('success');
      expect(result.projectId).toBe('test-project-id-123');
      expect(result.size).toBe(1024);
      expect(result.detectedTechnologies.language).toBe('typescript');
      expect(result.detectedTechnologies.framework).toBe('react');
      expect(result.structure.name).toBe('test-repo');
      expect(result.structure.type).toBe('directory');
    });

    it('should handle authentication with access token', async () => {
      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: mockContents })
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn()
        .mockResolvedValueOnce({ data: mockPackageJson })
        .mockResolvedValueOnce({ data: '# Test Repository' });

      const accessToken = 'github_token_123';
      await service.importRepository('https://github.com/testuser/test-repo', accessToken);

      expect((mockApiClient.defaults.headers.common as any)['Authorization']).toBe(`token ${accessToken}`);
    });

    it('should return error for invalid repository URL', async () => {
      const result = await service.importRepository('https://invalid-url.com/repo');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid GitHub repository URL format');
    });

    it('should handle API errors gracefully', async () => {
      // Mock validation to fail first
      const mockApiClient = {
        get: vi.fn().mockRejectedValue({
          isAxiosError: true,
          response: { status: 500 }
        }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      const result = await service.importRepository('https://github.com/testuser/test-repo');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to access GitHub API');
    });
  });

  describe('technology detection', () => {
    it('should detect React framework from package.json', async () => {
      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: [mockContents[0]] }) // Only package.json
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn().mockResolvedValueOnce({ data: mockPackageJson });

      const result = await service.importRepository('https://github.com/testuser/react-app');

      expect(result.detectedTechnologies.framework).toBe('react');
      expect(result.detectedTechnologies.language).toBe('typescript');
      expect(result.detectedTechnologies.packageManager).toBe('npm');
    });

    it('should detect Vue framework', async () => {
      const vuePackageJson = JSON.stringify({
        dependencies: { vue: '^3.0.0' }
      });

      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: [mockContents[0]] })
          .mockResolvedValueOnce({ data: { 'Vue': 10000 } }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn().mockResolvedValueOnce({ data: vuePackageJson });

      const result = await service.importRepository('https://github.com/testuser/vue-app');

      expect(result.detectedTechnologies.framework).toBe('vue');
    });

    it('should detect Python projects', async () => {
      const pythonContents = [
        {
          name: 'requirements.txt',
          path: 'requirements.txt',
          type: 'file' as const,
          size: 100,
          download_url: 'https://raw.githubusercontent.com/testuser/python-app/main/requirements.txt'
        }
      ];

      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: { ...mockRepoData, language: 'Python' } })
          .mockResolvedValueOnce({ data: pythonContents })
          .mockResolvedValueOnce({ data: { 'Python': 15000 } }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn().mockResolvedValueOnce({ data: 'flask==2.0.0\nrequests==2.25.0' });

      const result = await service.importRepository('https://github.com/testuser/python-app');

      expect(result.detectedTechnologies.language).toBe('python');
      expect(result.detectedTechnologies.packageManager).toBe('pip');
    });

    it('should detect build tools', async () => {
      const webpackContents = [
        {
          name: 'webpack.config.js',
          path: 'webpack.config.js',
          type: 'file' as const,
          size: 200,
          download_url: 'https://raw.githubusercontent.com/testuser/webpack-app/main/webpack.config.js'
        }
      ];

      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: webpackContents })
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn().mockResolvedValueOnce({ data: 'module.exports = {};' });

      const result = await service.importRepository('https://github.com/testuser/webpack-app');

      expect(result.detectedTechnologies.buildTool).toBe('webpack');
    });

    it('should detect deployment configurations', async () => {
      const dockerContents = [
        {
          name: 'Dockerfile',
          path: 'Dockerfile',
          type: 'file' as const,
          size: 300,
          download_url: 'https://raw.githubusercontent.com/testuser/docker-app/main/Dockerfile'
        }
      ];

      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: dockerContents })
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      mockedAxios.get = vi.fn().mockResolvedValueOnce({ data: 'FROM node:18\nCOPY . .\nRUN npm install' });

      const result = await service.importRepository('https://github.com/testuser/docker-app');

      expect(result.detectedTechnologies.deployment).toBe('docker');
    });
  });

  describe('utility methods', () => {
    it('should correctly parse GitHub URLs', () => {
      const parseUrl = (service as any).parseGitHubUrl.bind(service);

      expect(parseUrl('https://github.com/owner/repo')).toEqual({
        owner: 'owner',
        repo: 'repo'
      });

      expect(parseUrl('https://github.com/owner/repo.git')).toEqual({
        owner: 'owner',
        repo: 'repo'
      });

      expect(parseUrl('https://github.com/owner/repo/')).toEqual({
        owner: 'owner',
        repo: 'repo'
      });
    });

    it('should validate GitHub URL format', () => {
      const isValid = (service as any).isValidGitHubUrl.bind(service);

      expect(isValid('https://github.com/owner/repo')).toBe(true);
      expect(isValid('https://github.com/owner/repo.git')).toBe(true); // .git is allowed
      expect(isValid('https://github.com/owner/repo/')).toBe(true);
      expect(isValid('https://gitlab.com/owner/repo')).toBe(false);
      expect(isValid('https://github.com/owner')).toBe(false);
      expect(isValid('invalid-url')).toBe(false);
    });

    it('should determine correct MIME types', () => {
      const getMimeType = (service as any).getMimeType.bind(service);

      expect(getMimeType('script.js')).toBe('application/javascript');
      expect(getMimeType('component.ts')).toBe('application/typescript');
      expect(getMimeType('data.json')).toBe('application/json');
      expect(getMimeType('style.css')).toBe('text/css');
      expect(getMimeType('readme.md')).toBe('text/markdown');
      expect(getMimeType('app.py')).toBe('text/x-python');
      expect(getMimeType('unknown.xyz')).toBe('text/plain');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors', async () => {
      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: mockContents })
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      // Mock fs.mkdir to fail
      mockedFs.mkdir = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const result = await service.importRepository('https://github.com/testuser/test-repo');

      expect(result.status).toBe('error');
      expect(result.error).toContain('Permission denied');
    });

    it('should handle network errors during file download', async () => {
      const mockApiClient = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: mockRepoData })
          .mockResolvedValueOnce({ data: mockContents })
          .mockResolvedValueOnce({ data: mockLanguages }),
        defaults: {
          headers: {
            common: {}
          }
        }
      };
      (service as any).apiClient = mockApiClient;

      // Mock axios.get to fail for file downloads
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.importRepository('https://github.com/testuser/test-repo');

      // Should still succeed but with empty file contents
      expect(result.status).toBe('success');
      expect(result.structure.children).toBeDefined();
    });
  });
});