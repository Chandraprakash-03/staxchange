import { describe, it, expect } from 'vitest';
import { ProjectModel } from '@/models/project';
import { TechStack, FileTree } from '@/types';

describe('ProjectModel', () => {
  describe('validateProjectData', () => {
    it('should validate required fields', () => {
      const result = ProjectModel.validateProjectData({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.field)).toContain('name');
      expect(result.errors.map(e => e.field)).toContain('githubUrl');
      expect(result.errors.map(e => e.field)).toContain('originalTechStack');
    });

    it('should pass validation with valid data', () => {
      const validProjectData = {
        name: 'Test Project',
        githubUrl: 'https://github.com/user/repo',
        originalTechStack: {
          language: 'javascript',
          framework: 'react',
          additional: {},
        },
      };

      const result = ProjectModel.validateProjectData(validProjectData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate GitHub URL format', () => {
      const invalidGithubUrlData = {
        name: 'Test Project',
        githubUrl: 'https://gitlab.com/user/repo',
        originalTechStack: {
          language: 'javascript',
          additional: {},
        },
      };

      const result = ProjectModel.validateProjectData(invalidGithubUrlData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'githubUrl' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should validate project name length', () => {
      const shortNameData = {
        name: 'A',
        githubUrl: 'https://github.com/user/repo',
        originalTechStack: {
          language: 'javascript',
          additional: {},
        },
      };

      const result = ProjectModel.validateProjectData(shortNameData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.code === 'INVALID_LENGTH')).toBe(true);
    });

    it('should accept valid GitHub URLs', () => {
      const validUrls = [
        'https://github.com/user/repo',
        'https://github.com/user-name/repo-name',
        'https://github.com/user.name/repo.name',
        'https://github.com/user/repo/',
      ];

      validUrls.forEach(githubUrl => {
        const result = ProjectModel.validateProjectData({
          name: 'Test Project',
          githubUrl,
          originalTechStack: {
            language: 'javascript',
            additional: {},
          },
        });
        
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateTechStack', () => {
    it('should require language field', () => {
      const techStack: TechStack = {
        language: '',
        additional: {},
      };

      const result = ProjectModel.validateTechStack(techStack);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'techStack.language')).toBe(true);
    });

    it('should pass validation with valid tech stack', () => {
      const techStack: TechStack = {
        language: 'javascript',
        framework: 'react',
        database: 'postgresql',
        additional: {},
      };

      const result = ProjectModel.validateTechStack(techStack);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about unsupported languages', () => {
      const techStack: TechStack = {
        language: 'cobol',
        additional: {},
      };

      const result = ProjectModel.validateTechStack(techStack);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('may have limited conversion support'))).toBe(true);
    });

    it('should accept supported languages', () => {
      const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'ruby', 'csharp'];

      supportedLanguages.forEach(language => {
        const techStack: TechStack = {
          language,
          additional: {},
        };

        const result = ProjectModel.validateTechStack(techStack);
        
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });

  describe('validateFileTree', () => {
    it('should validate required fields', () => {
      const fileTree: Partial<FileTree> = {
        type: 'file',
      };

      const result = ProjectModel.validateFileTree(fileTree as FileTree);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fileTree.name')).toBe(true);
      expect(result.errors.some(e => e.field === 'fileTree.path')).toBe(true);
    });

    it('should validate file type', () => {
      const fileTree: any = {
        name: 'test.txt',
        path: '/test.txt',
        type: 'invalid',
        metadata: {
          size: 100,
          lastModified: new Date(),
        },
      };

      const result = ProjectModel.validateFileTree(fileTree);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fileTree.type' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should pass validation with valid file', () => {
      const fileTree: FileTree = {
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        content: 'Hello, world!',
        metadata: {
          size: 13,
          lastModified: new Date(),
        },
      };

      const result = ProjectModel.validateFileTree(fileTree);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with valid directory', () => {
      const fileTree: FileTree = {
        name: 'src',
        path: '/src',
        type: 'directory',
        children: [
          {
            name: 'index.js',
            path: '/src/index.js',
            type: 'file',
            content: 'console.log("Hello");',
            metadata: {
              size: 20,
              lastModified: new Date(),
            },
          },
        ],
        metadata: {
          size: 0,
          lastModified: new Date(),
        },
      };

      const result = ProjectModel.validateFileTree(fileTree);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about large files', () => {
      const largeContent = 'x'.repeat(1000001); // Over 1MB
      const fileTree: FileTree = {
        name: 'large.txt',
        path: '/large.txt',
        type: 'file',
        content: largeContent,
        metadata: {
          size: largeContent.length,
          lastModified: new Date(),
        },
      };

      const result = ProjectModel.validateFileTree(fileTree);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('is very large'))).toBe(true);
    });

    it('should validate nested directory structure', () => {
      const fileTree: FileTree = {
        name: 'project',
        path: '/project',
        type: 'directory',
        children: [
          {
            name: 'src',
            path: '/project/src',
            type: 'directory',
            children: [
              {
                name: '', // Invalid name
                path: '/project/src/invalid',
                type: 'file',
                metadata: {
                  size: 0,
                  lastModified: new Date(),
                },
              },
            ],
            metadata: {
              size: 0,
              lastModified: new Date(),
            },
          },
        ],
        metadata: {
          size: 0,
          lastModified: new Date(),
        },
      };

      const result = ProjectModel.validateFileTree(fileTree);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'fileTree.name')).toBe(true);
    });
  });
});