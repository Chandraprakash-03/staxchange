import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService, CodeConversionRequest, CodeAnalysisRequest, CodeValidationRequest } from '../../services/ai';
import { OpenRouterClient } from '../../services/openrouter';
import { TechStack, ConversionTask } from '../../types';

// Mock the OpenRouter client
vi.mock('../../services/openrouter');
const MockedOpenRouterClient = vi.mocked(OpenRouterClient);

describe('AIService', () => {
  let aiService: AIService;
  let mockClient: any;

  const mockTechStack: TechStack = {
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

  beforeEach(() => {
    mockClient = {
      generateCode: vi.fn(),
      healthCheck: vi.fn(),
    };

    MockedOpenRouterClient.mockImplementation(() => mockClient);

    aiService = new AIService({
      apiKey: 'test-key',
      defaultOptions: {
        includeComments: true,
        preserveFormatting: true,
        includeTests: false,
        optimizeForPerformance: true,
        followBestPractices: true,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('convertCode', () => {
    it('should successfully convert code', async () => {
      const mockResponse = `
\`\`\`typescript
// Converted TypeScript code
function convertedFunction() {
  return 'converted';
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(mockResponse);

      const request: CodeConversionRequest = {
        sourceCode: 'function originalFunction() { return "original"; }',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.convertCode(request);

      expect(result.convertedCode).toContain('convertedFunction');
      expect(result.confidence).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle conversion with project structure and dependencies', async () => {
      const mockResponse = 'converted code';
      mockClient.generateCode.mockResolvedValue(mockResponse);

      const request: CodeConversionRequest = {
        sourceCode: 'test code',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
        projectStructure: {
          name: 'root',
          type: 'directory',
          path: '/',
          children: [],
          metadata: {
            size: 0,
            lastModified: new Date(),
          },
        },
        dependencies: ['react', 'axios'],
      };

      const result = await aiService.convertCode(request);

      expect(mockClient.generateCode).toHaveBeenCalledWith(
        expect.stringContaining('test code'),
        expect.objectContaining({
          task: 'code_conversion',
          source_language: 'JavaScript',
          target_language: 'TypeScript',
        })
      );
      expect(result.convertedCode).toBe(mockResponse);
    });

    it('should handle conversion errors', async () => {
      mockClient.generateCode.mockRejectedValue(new Error('API Error'));

      const request: CodeConversionRequest = {
        sourceCode: 'test code',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      await expect(aiService.convertCode(request)).rejects.toThrow(
        'Code conversion failed: API Error'
      );
    });

    it('should truncate long source code', async () => {
      const longCode = 'a'.repeat(10000);
      mockClient.generateCode.mockResolvedValue('converted');

      const request: CodeConversionRequest = {
        sourceCode: longCode,
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      await aiService.convertCode(request);

      const callArgs = mockClient.generateCode.mock.calls[0][0];
      expect(callArgs.length).toBeLessThan(longCode.length);
      expect(callArgs).toContain('truncated for length');
    });
  });

  describe('analyzeCode', () => {
    it('should successfully analyze code', async () => {
      const mockAnalysisResponse = `
\`\`\`json
{
  "components": ["Component1", "Component2"],
  "functions": ["func1", "func2"],
  "classes": ["Class1"],
  "dependencies": ["react", "axios"],
  "patterns": ["MVC"],
  "frameworkFeatures": ["hooks"],
  "challenges": ["complex state management"],
  "conversionApproach": "gradual migration"
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(mockAnalysisResponse);

      const request: CodeAnalysisRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        techStack: mockTechStack,
      };

      const result = await aiService.analyzeCode(request);

      expect(result.components).toEqual(['Component1', 'Component2']);
      expect(result.functions).toEqual(['func1', 'func2']);
      expect(result.classes).toEqual(['Class1']);
      expect(result.dependencies).toEqual(['react', 'axios']);
    });

    it('should handle malformed analysis response', async () => {
      mockClient.generateCode.mockResolvedValue('invalid json response');

      const request: CodeAnalysisRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        techStack: mockTechStack,
      };

      const result = await aiService.analyzeCode(request);

      expect(result.challenges).toContain('Failed to parse analysis response');
      expect(result.conversionApproach).toBe('Manual analysis required');
    });

    it('should handle analysis errors', async () => {
      mockClient.generateCode.mockRejectedValue(new Error('Analysis failed'));

      const request: CodeAnalysisRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        techStack: mockTechStack,
      };

      await expect(aiService.analyzeCode(request)).rejects.toThrow(
        'Code analysis failed: Analysis failed'
      );
    });
  });

  describe('validateConversion', () => {
    it('should successfully validate conversion', async () => {
      const mockValidationResponse = `
\`\`\`json
{
  "isValid": true,
  "functionalEquivalence": true,
  "syntaxCorrect": true,
  "followsBestPractices": true,
  "issues": [],
  "overallScore": 0.95,
  "recommendations": ["Consider adding type annotations"]
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(mockValidationResponse);

      const request: CodeValidationRequest = {
        originalCode: 'function original() {}',
        convertedCode: 'function converted() {}',
        context: {
          sourceCode: 'function original() {}',
          fileName: 'test.js',
          sourceTechStack: mockTechStack,
          targetTechStack: mockTargetTechStack,
        },
      };

      const result = await aiService.validateConversion(request);

      expect(result.isValid).toBe(true);
      expect(result.functionalEquivalence).toBe(true);
      expect(result.syntaxCorrect).toBe(true);
      expect(result.followsBestPractices).toBe(true);
      expect(result.overallScore).toBe(0.95);
    });

    it('should handle validation with issues', async () => {
      const mockValidationResponse = `
\`\`\`json
{
  "isValid": false,
  "functionalEquivalence": false,
  "syntaxCorrect": true,
  "followsBestPractices": false,
  "issues": [
    {
      "type": "error",
      "message": "Logic error in conversion",
      "line": 5,
      "suggestion": "Fix the logic"
    }
  ],
  "overallScore": 0.3,
  "recommendations": ["Review the conversion logic"]
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(mockValidationResponse);

      const request: CodeValidationRequest = {
        originalCode: 'function original() {}',
        convertedCode: 'function converted() {}',
        context: {
          sourceCode: 'function original() {}',
          fileName: 'test.js',
          sourceTechStack: mockTechStack,
          targetTechStack: mockTargetTechStack,
        },
      };

      const result = await aiService.validateConversion(request);

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('error');
      expect(result.issues[0].message).toBe('Logic error in conversion');
    });

    it('should handle malformed validation response', async () => {
      mockClient.generateCode.mockResolvedValue('invalid response');

      const request: CodeValidationRequest = {
        originalCode: 'function original() {}',
        convertedCode: 'function converted() {}',
        context: {
          sourceCode: 'function original() {}',
          fileName: 'test.js',
          sourceTechStack: mockTechStack,
          targetTechStack: mockTargetTechStack,
        },
      };

      const result = await aiService.validateConversion(request);

      expect(result.isValid).toBe(false);
      expect(result.issues[0].message).toBe('Failed to parse validation response');
    });
  });

  describe('generateTests', () => {
    it('should generate test cases', async () => {
      const mockTestResponse = `
\`\`\`typescript
import { describe, it, expect } from 'vitest';

describe('ConvertedFunction', () => {
  it('should work correctly', () => {
    expect(convertedFunction()).toBe('converted');
  });
});
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(mockTestResponse);

      const result = await aiService.generateTests(
        'function original() {}',
        'function converted() {}',
        {
          sourceCode: 'function original() {}',
          fileName: 'test.js',
          sourceTechStack: mockTechStack,
          targetTechStack: mockTargetTechStack,
        }
      );

      expect(result).toContain('describe');
      expect(result).toContain('it');
      expect(result).toContain('expect');
    });

    it('should handle test generation errors', async () => {
      mockClient.generateCode.mockRejectedValue(new Error('Test generation failed'));

      await expect(
        aiService.generateTests(
          'function original() {}',
          'function converted() {}',
          {
            sourceCode: 'function original() {}',
            fileName: 'test.js',
            sourceTechStack: mockTechStack,
            targetTechStack: mockTargetTechStack,
          }
        )
      ).rejects.toThrow('Test generation failed: Test generation failed');
    });
  });

  describe('processConversionTask', () => {
    it('should process analysis task', async () => {
      const mockAnalysisResponse = `
\`\`\`json
{
  "components": [],
  "functions": [],
  "classes": [],
  "dependencies": [],
  "patterns": [],
  "frameworkFeatures": [],
  "challenges": [],
  "conversionApproach": "direct conversion"
}
\`\`\`
      `;

      const mockConversionResponse = 'converted code';

      mockClient.generateCode
        .mockResolvedValueOnce(mockAnalysisResponse)
        .mockResolvedValueOnce(mockConversionResponse);

      const task: ConversionTask = {
        id: 'task-1',
        type: 'analysis',
        description: 'Analyze code',
        inputFiles: ['test.js'],
        outputFiles: ['test.ts'],
        dependencies: [],
        agentType: 'analysis',
        priority: 1,
        status: 'pending',
        estimatedDuration: 300,
      };

      const context = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.processConversionTask(task, context);

      expect(mockClient.generateCode).toHaveBeenCalledTimes(2);
      expect(result.convertedCode).toBe(mockConversionResponse);
    });

    it('should process validation task', async () => {
      const mockConversionResponse = 'converted code';
      const mockValidationResponse = `
\`\`\`json
{
  "isValid": true,
  "functionalEquivalence": true,
  "syntaxCorrect": true,
  "followsBestPractices": true,
  "issues": [
    {
      "type": "warning",
      "message": "Consider optimization"
    }
  ],
  "overallScore": 0.9,
  "recommendations": ["Add documentation"]
}
\`\`\`
      `;

      mockClient.generateCode
        .mockResolvedValueOnce(mockConversionResponse)
        .mockResolvedValueOnce(mockValidationResponse);

      const task: ConversionTask = {
        id: 'task-1',
        type: 'validation',
        description: 'Validate conversion',
        inputFiles: ['test.js'],
        outputFiles: ['test.ts'],
        dependencies: [],
        agentType: 'validation',
        priority: 1,
        status: 'pending',
        estimatedDuration: 300,
      };

      const context = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.processConversionTask(task, context);

      expect(result.warnings).toContain('Consider optimization');
      expect(result.suggestions).toContain('Add documentation');
    });
  });

  describe('healthCheck', () => {
    it('should return client health check result', async () => {
      mockClient.healthCheck.mockResolvedValue(true);

      const result = await aiService.healthCheck();

      expect(result).toBe(true);
      expect(mockClient.healthCheck).toHaveBeenCalled();
    });
  });

  describe('response parsing', () => {
    it('should extract code from markdown blocks', async () => {
      const responseWithMultipleBlocks = `
Here's the converted code:

\`\`\`typescript
// Short code block
const x = 1;
\`\`\`

And here's the main conversion:

\`\`\`typescript
// This is the main converted code
function convertedFunction() {
  return 'This is a longer code block that should be selected';
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(responseWithMultipleBlocks);

      const request: CodeConversionRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.convertCode(request);

      expect(result.convertedCode).toContain('convertedFunction');
      expect(result.convertedCode).toContain('longer code block');
    });

    it('should return response as-is when no code blocks found', async () => {
      const plainResponse = 'function plainCode() { return "no blocks"; }';
      mockClient.generateCode.mockResolvedValue(plainResponse);

      const request: CodeConversionRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.convertCode(request);

      expect(result.convertedCode).toBe(plainResponse);
    });

    it('should calculate confidence based on response characteristics', async () => {
      const goodResponse = `
\`\`\`typescript
function wellStructuredCode() {
  // This is a well-structured response with proper formatting
  import { Component } from 'framework';
  
  class MyClass {
    constructor() {
      // Implementation
    }
  }
}
\`\`\`
      `;

      mockClient.generateCode.mockResolvedValue(goodResponse);

      const request: CodeConversionRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.convertCode(request);

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should extract warnings and suggestions from response', async () => {
      const responseWithWarnings = `
\`\`\`typescript
function converted() {}
\`\`\`

Warning: This conversion may have performance implications.
Note: Consider using async/await pattern.
Suggestion: Add error handling.
Recommend: Use TypeScript strict mode.
      `;

      mockClient.generateCode.mockResolvedValue(responseWithWarnings);

      const request: CodeConversionRequest = {
        sourceCode: 'function test() {}',
        fileName: 'test.js',
        sourceTechStack: mockTechStack,
        targetTechStack: mockTargetTechStack,
      };

      const result = await aiService.convertCode(request);

      expect(result.warnings).toContain('This conversion may have performance implications.');
      expect(result.warnings).toContain('Consider using async/await pattern.');
      expect(result.suggestions).toContain('Add error handling.');
      expect(result.suggestions).toContain('Use TypeScript strict mode.');
    });
  });
});