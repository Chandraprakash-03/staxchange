import { describe, it, expect } from 'vitest';
import { PromptEngineer, PromptOptimizer, PromptContext, ConversionPromptOptions } from '../../utils/prompt-engineering';
import { TechStack, FileTree } from '../../types';

describe('PromptEngineer', () => {
  const mockSourceTechStack: TechStack = {
    language: 'JavaScript',
    framework: 'React',
    database: 'PostgreSQL',
    runtime: 'Node.js',
    buildTool: 'Webpack',
    packageManager: 'npm',
    deployment: 'Docker',
    additional: {},
  };

  const mockTargetTechStack: TechStack = {
    language: 'TypeScript',
    framework: 'Vue',
    database: 'MongoDB',
    runtime: 'Node.js',
    buildTool: 'Vite',
    packageManager: 'pnpm',
    deployment: 'Docker',
    additional: {},
  };

  const mockContext: PromptContext = {
    sourceCode: 'function hello() { return "Hello World"; }',
    fileName: 'hello.js',
    sourceTechStack: mockSourceTechStack,
    targetTechStack: mockTargetTechStack,
    dependencies: ['react', 'axios'],
  };

  describe('generateConversionPrompt', () => {
    it('should generate a comprehensive conversion prompt', () => {
      const prompt = PromptEngineer.generateConversionPrompt(mockContext);

      expect(prompt).toContain('Convert the following JavaScript code to TypeScript');
      expect(prompt).toContain('hello.js');
      expect(prompt).toContain('React → Vue');
      expect(prompt).toContain('PostgreSQL → MongoDB');
      expect(prompt).toContain('function hello()');
      expect(prompt).toContain('Maintain exact functional equivalence');
      expect(prompt).toContain('Maintain exact functional equivalence');
    });

    it('should include conversion options in prompt', () => {
      const options: ConversionPromptOptions = {
        includeComments: true,
        preserveFormatting: true,
        includeTests: true,
        optimizeForPerformance: false,
        followBestPractices: true,
      };

      const prompt = PromptEngineer.generateConversionPrompt(mockContext, options);

      expect(prompt).toContain('Include helpful comments');
      expect(prompt).toContain('Maintain readable code structure');
      expect(prompt).toContain('Include basic test cases');
      expect(prompt).not.toContain('Optimize for performance');
    });

    it('should handle minimal tech stack information', () => {
      const minimalContext: PromptContext = {
        sourceCode: 'console.log("test");',
        fileName: 'test.js',
        sourceTechStack: { language: 'JavaScript', additional: {} },
        targetTechStack: { language: 'TypeScript', additional: {} },
      };

      const prompt = PromptEngineer.generateConversionPrompt(minimalContext);

      expect(prompt).toContain('JavaScript code to TypeScript');
      expect(prompt).toContain('test.js');
      expect(prompt).toContain('console.log("test")');
    });

    it('should include dependencies when provided', () => {
      const prompt = PromptEngineer.generateConversionPrompt(mockContext);

      expect(prompt).toContain('Dependencies: react, axios');
    });
  });

  describe('generateAnalysisPrompt', () => {
    it('should generate analysis prompt with correct structure', () => {
      const sourceCode = 'function analyze() { return "test"; }';
      const fileName = 'analyze.js';

      const prompt = PromptEngineer.generateAnalysisPrompt(sourceCode, fileName, mockSourceTechStack);

      expect(prompt).toContain('Analyze the following JavaScript code');
      expect(prompt).toContain('analyze.js');
      expect(prompt).toContain('JavaScript + React + PostgreSQL + Node.js');
      expect(prompt).toContain('function analyze()');
      expect(prompt).toContain('Identify the main components');
      expect(prompt).toContain('JSON format');
      expect(prompt).toContain('"components"');
      expect(prompt).toContain('"functions"');
      expect(prompt).toContain('"dependencies"');
    });

    it('should use correct language identifier', () => {
      const prompt = PromptEngineer.generateAnalysisPrompt(
        'def test(): pass',
        'test.py',
        { language: 'Python', additional: {} }
      );

      expect(prompt).toContain('```python');
    });
  });

  describe('generateValidationPrompt', () => {
    it('should generate validation prompt with both code versions', () => {
      const originalCode = 'function original() { return "original"; }';
      const convertedCode = 'function converted(): string { return "converted"; }';

      const prompt = PromptEngineer.generateValidationPrompt(originalCode, convertedCode, mockContext);

      expect(prompt).toContain('Validate the following code conversion');
      expect(prompt).toContain('Original Code (JavaScript)');
      expect(prompt).toContain('Converted Code (TypeScript)');
      expect(prompt).toContain('function original()');
      expect(prompt).toContain('function converted()');
      expect(prompt).toContain('Functional equivalence');
      expect(prompt).toContain('Syntax correctness');
      expect(prompt).toContain('"isValid"');
      expect(prompt).toContain('"issues"');
    });
  });

  describe('generateTestPrompt', () => {
    it('should generate test prompt with appropriate framework', () => {
      const sourceCode = 'function add(a, b) { return a + b; }';
      const convertedCode = 'function add(a: number, b: number): number { return a + b; }';

      const prompt = PromptEngineer.generateTestPrompt(sourceCode, convertedCode, mockContext);

      expect(prompt).toContain('Generate comprehensive test cases');
      expect(prompt).toContain('Original Code:');
      expect(prompt).toContain('Converted Code:');
      expect(prompt).toContain('function add(a, b)');
      expect(prompt).toContain('function add(a: number');
      expect(prompt).toContain('Jest testing framework');
      expect(prompt).toContain('Test all public methods');
      expect(prompt).toContain('100% functional coverage');
    });

    it('should use correct test framework for different languages', () => {
      const pythonContext: PromptContext = {
        ...mockContext,
        targetTechStack: { language: 'Python', additional: {} },
      };

      const prompt = PromptEngineer.generateTestPrompt('', '', pythonContext);

      expect(prompt).toContain('pytest testing framework');
    });
  });

  describe('language and framework detection', () => {
    it('should format tech stack correctly', () => {
      const prompt = PromptEngineer.generateConversionPrompt(mockContext);

      expect(prompt).toContain('JavaScript + React + PostgreSQL + Node.js');
      expect(prompt).toContain('TypeScript + Vue + MongoDB + Node.js');
    });

    it('should handle minimal tech stack', () => {
      const minimalContext: PromptContext = {
        sourceCode: 'test',
        fileName: 'test.js',
        sourceTechStack: { language: 'JavaScript', additional: {} },
        targetTechStack: { language: 'Python', additional: {} },
      };

      const prompt = PromptEngineer.generateConversionPrompt(minimalContext);

      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('Python');
    });

    it('should use correct language identifiers for code blocks', () => {
      const contexts = [
        { lang: 'JavaScript', expected: 'javascript' },
        { lang: 'TypeScript', expected: 'typescript' },
        { lang: 'Python', expected: 'python' },
        { lang: 'Java', expected: 'java' },
        { lang: 'C#', expected: 'csharp' },
        { lang: 'Go', expected: 'go' },
        { lang: 'Rust', expected: 'rust' },
      ];

      contexts.forEach(({ lang, expected }) => {
        const context: PromptContext = {
          sourceCode: 'test',
          fileName: 'test',
          sourceTechStack: { language: lang, additional: {} },
          targetTechStack: { language: 'JavaScript', additional: {} },
        };

        const prompt = PromptEngineer.generateConversionPrompt(context);
        expect(prompt).toContain(`\`\`\`${expected}`);
      });
    });
  });
});

describe('PromptOptimizer', () => {
  describe('truncateCode', () => {
    it('should return code as-is when under limit', () => {
      const shortCode = 'function test() { return "short"; }';
      const result = PromptOptimizer.truncateCode(shortCode, 1000);

      expect(result).toBe(shortCode);
    });

    it('should truncate long code while preserving beginning and end', () => {
      const longCode = 'a'.repeat(10000);
      const result = PromptOptimizer.truncateCode(longCode, 1000);

      expect(result.length).toBeLessThan(longCode.length);
      expect(result).toContain('truncated for length');
      expect(result.startsWith('a')).toBe(true);
      expect(result.endsWith('a')).toBe(true);
    });

    it('should use default max length when not specified', () => {
      const longCode = 'a'.repeat(10000);
      const result = PromptOptimizer.truncateCode(longCode);

      expect(result.length).toBeLessThan(longCode.length);
      expect(result).toContain('truncated for length');
    });
  });

  describe('extractKeyContext', () => {
    const mockFileTree: FileTree = {
      name: 'root',
      type: 'directory',
      path: '/',
      metadata: { size: 0, lastModified: new Date() },
      children: [
        {
          name: 'package.json',
          type: 'file',
          path: '/package.json',
          metadata: { size: 100, lastModified: new Date() },
        },
        {
          name: 'src',
          type: 'directory',
          path: '/src',
          metadata: { size: 0, lastModified: new Date() },
          children: [
            {
              name: 'main.js',
              type: 'file',
              path: '/src/main.js',
              metadata: { size: 200, lastModified: new Date() },
            },
            {
              name: 'index.js',
              type: 'file',
              path: '/src/index.js',
              metadata: { size: 150, lastModified: new Date() },
            },
            {
              name: 'utils.js',
              type: 'file',
              path: '/src/utils.js',
              metadata: { size: 300, lastModified: new Date() },
            },
          ],
        },
        {
          name: 'requirements.txt',
          type: 'file',
          path: '/requirements.txt',
          metadata: { size: 50, lastModified: new Date() },
        },
      ],
    };

    it('should extract important files', () => {
      const result = PromptOptimizer.extractKeyContext(mockFileTree);

      expect(result).toContain('/package.json');
      expect(result).toContain('/requirements.txt');
      expect(result).toContain('/src/main.js');
      expect(result).toContain('/src/index.js');
    });

    it('should limit number of files', () => {
      const result = PromptOptimizer.extractKeyContext(mockFileTree, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should prioritize important file patterns', () => {
      const result = PromptOptimizer.extractKeyContext(mockFileTree);

      // package.json should be prioritized
      expect(result).toContain('/package.json');
      expect(result).toContain('/requirements.txt');
    });

    it('should handle empty file tree', () => {
      const emptyTree: FileTree = {
        name: 'empty',
        type: 'directory',
        path: '/',
        metadata: { size: 0, lastModified: new Date() },
        children: [],
      };

      const result = PromptOptimizer.extractKeyContext(emptyTree);

      expect(result).toEqual([]);
    });

    it('should handle file tree without children', () => {
      const singleFileTree: FileTree = {
        name: 'single.js',
        type: 'file',
        path: '/single.js',
        metadata: { size: 100, lastModified: new Date() },
      };

      const result = PromptOptimizer.extractKeyContext(singleFileTree);

      expect(result).toEqual([]);
    });
  });

  describe('important file detection', () => {
    const testCases = [
      { fileName: 'package.json', expected: true },
      { fileName: 'requirements.txt', expected: true },
      { fileName: 'Gemfile', expected: true },
      { fileName: 'pom.xml', expected: true },
      { fileName: 'build.gradle', expected: true },
      { fileName: 'Cargo.toml', expected: true },
      { fileName: 'composer.json', expected: true },
      { fileName: 'main.js', expected: true },
      { fileName: 'index.html', expected: true },
      { fileName: 'app.py', expected: true },
      { fileName: 'config.yml', expected: true },
      { fileName: 'webpack.config.js', expected: true },
      { fileName: 'random-file.txt', expected: false },
      { fileName: 'test.spec.js', expected: false },
      { fileName: 'README.md', expected: false },
    ];

    testCases.forEach(({ fileName, expected }) => {
      it(`should ${expected ? 'identify' : 'not identify'} ${fileName} as important`, () => {
        const fileTree: FileTree = {
          name: 'root',
          type: 'directory',
          path: '/',
          metadata: { size: 0, lastModified: new Date() },
          children: [
            {
              name: fileName,
              type: 'file',
              path: `/${fileName}`,
              metadata: { size: 100, lastModified: new Date() },
            },
          ],
        };

        const result = PromptOptimizer.extractKeyContext(fileTree);

        if (expected) {
          expect(result).toContain(`/${fileName}`);
        } else {
          expect(result).not.toContain(`/${fileName}`);
        }
      });
    });
  });
});