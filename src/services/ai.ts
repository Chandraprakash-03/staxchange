import { OpenRouterClient, OpenRouterConfig } from './openrouter';
import { PromptEngineer, PromptContext, ConversionPromptOptions, PromptOptimizer } from '../utils/prompt-engineering';
import { TechStack, ConversionTask, FileTree } from '../types';

export interface AIServiceConfig extends OpenRouterConfig {
  defaultOptions?: ConversionPromptOptions;
}

export interface CodeConversionRequest {
  sourceCode: string;
  fileName: string;
  sourceTechStack: TechStack;
  targetTechStack: TechStack;
  projectStructure?: FileTree;
  dependencies?: string[];
  options?: ConversionPromptOptions;
}

export interface CodeAnalysisRequest {
  sourceCode: string;
  fileName: string;
  techStack: TechStack;
}

export interface CodeValidationRequest {
  originalCode: string;
  convertedCode: string;
  context: PromptContext;
}

export interface ConversionResult {
  convertedCode: string;
  confidence: number;
  warnings: string[];
  suggestions: string[];
}

export interface AnalysisResult {
  components: string[];
  functions: string[];
  classes: string[];
  dependencies: string[];
  patterns: string[];
  frameworkFeatures: string[];
  challenges: string[];
  conversionApproach: string;
}

export interface ValidationResult {
  isValid: boolean;
  functionalEquivalence: boolean;
  syntaxCorrect: boolean;
  followsBestPractices: boolean;
  issues: ValidationIssue[];
  overallScore: number;
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  line?: number;
  suggestion?: string;
}

export class AIService {
  private client: OpenRouterClient;
  private defaultOptions: ConversionPromptOptions;

  constructor(config: AIServiceConfig) {
    this.client = new OpenRouterClient(config);
    this.defaultOptions = config.defaultOptions || {
      includeComments: true,
      preserveFormatting: true,
      includeTests: false,
      optimizeForPerformance: true,
      followBestPractices: true,
    };
  }

  /**
   * Convert code from one tech stack to another
   */
  async convertCode(request: CodeConversionRequest): Promise<ConversionResult> {
    try {
      const context: PromptContext = {
        sourceCode: request.sourceCode,
        fileName: request.fileName,
        sourceTechStack: request.sourceTechStack,
        targetTechStack: request.targetTechStack,
        projectStructure: request.projectStructure,
        dependencies: request.dependencies,
      };

      const options = { ...this.defaultOptions, ...request.options };
      
      // Optimize code length if necessary
      const optimizedCode = PromptOptimizer.truncateCode(request.sourceCode);
      const optimizedContext = { ...context, sourceCode: optimizedCode };

      const prompt = PromptEngineer.generateConversionPrompt(optimizedContext, options);
      const response = await this.client.generateCode(prompt, {
        task: 'code_conversion',
        source_language: request.sourceTechStack.language,
        target_language: request.targetTechStack.language,
      });

      const convertedCode = this.extractCodeFromResponse(response);
      
      return {
        convertedCode,
        confidence: this.calculateConfidence(response),
        warnings: this.extractWarnings(response),
        suggestions: this.extractSuggestions(response),
      };
    } catch (error) {
      throw new Error(`Code conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze code structure and patterns
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<AnalysisResult> {
    try {
      const prompt = PromptEngineer.generateAnalysisPrompt(
        request.sourceCode,
        request.fileName,
        request.techStack
      );

      const response = await this.client.generateCode(prompt, {
        task: 'code_analysis',
        language: request.techStack.language,
      });

      return this.parseAnalysisResponse(response);
    } catch (error) {
      throw new Error(`Code analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate converted code for correctness and equivalence
   */
  async validateConversion(request: CodeValidationRequest): Promise<ValidationResult> {
    try {
      const prompt = PromptEngineer.generateValidationPrompt(
        request.originalCode,
        request.convertedCode,
        request.context
      );

      const response = await this.client.generateCode(prompt, {
        task: 'code_validation',
        source_language: request.context.sourceTechStack.language,
        target_language: request.context.targetTechStack.language,
      });

      return this.parseValidationResponse(response);
    } catch (error) {
      throw new Error(`Code validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate test cases for converted code
   */
  async generateTests(
    sourceCode: string,
    convertedCode: string,
    context: PromptContext
  ): Promise<string> {
    try {
      const prompt = PromptEngineer.generateTestPrompt(sourceCode, convertedCode, context);
      
      const response = await this.client.generateCode(prompt, {
        task: 'test_generation',
        language: context.targetTechStack.language,
      });

      return this.extractCodeFromResponse(response);
    } catch (error) {
      throw new Error(`Test generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a conversion task with full workflow
   */
  async processConversionTask(task: ConversionTask, context: PromptContext): Promise<ConversionResult> {
    // First analyze the code if needed
    if (task.type === 'analysis') {
      const analysisResult = await this.analyzeCode({
        sourceCode: context.sourceCode,
        fileName: context.fileName,
        techStack: context.sourceTechStack,
      });
      
      // Store analysis results in context for next tasks
      context.additionalContext = {
        ...context.additionalContext,
        analysis: analysisResult,
      };
    }

    // Perform the main conversion
    const conversionResult = await this.convertCode({
      sourceCode: context.sourceCode,
      fileName: context.fileName,
      sourceTechStack: context.sourceTechStack,
      targetTechStack: context.targetTechStack,
      projectStructure: context.projectStructure,
      dependencies: context.dependencies,
    });

    // Validate the conversion if required
    if (task.type === 'validation') {
      const validationResult = await this.validateConversion({
        originalCode: context.sourceCode,
        convertedCode: conversionResult.convertedCode,
        context,
      });

      // Add validation results to warnings and suggestions
      conversionResult.warnings.push(...validationResult.issues
        .filter(issue => issue.type === 'warning')
        .map(issue => issue.message));
      
      conversionResult.suggestions.push(...validationResult.recommendations);
    }

    return conversionResult;
  }

  /**
   * Check if the AI service is healthy and responsive
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  private extractCodeFromResponse(response: string): string {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      // Return the largest code block (most likely the main conversion)
      return matches
        .map(match => match[1])
        .reduce((longest, current) => current.length > longest.length ? current : longest, '');
    }

    // If no code blocks found, return the response as-is (might be plain code)
    return response.trim();
  }

  private calculateConfidence(response: string): number {
    // Simple heuristic to calculate confidence based on response characteristics
    let confidence = 0.5; // Base confidence

    // Increase confidence if response contains proper code structure
    if (response.includes('function') || response.includes('class') || response.includes('import')) {
      confidence += 0.2;
    }

    // Increase confidence if response is well-formatted
    if (response.includes('```')) {
      confidence += 0.1;
    }

    // Increase confidence based on response length (more detailed = higher confidence)
    if (response.length > 500) {
      confidence += 0.1;
    }

    // Decrease confidence if response contains error indicators
    if (response.toLowerCase().includes('error') || response.toLowerCase().includes('cannot')) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private extractWarnings(response: string): string[] {
    const warnings: string[] = [];
    
    // Look for common warning patterns in the response
    const warningPatterns = [
      /warning:?\s*(.+)/gi,
      /note:?\s*(.+)/gi,
      /caution:?\s*(.+)/gi,
    ];

    warningPatterns.forEach(pattern => {
      const matches = [...response.matchAll(pattern)];
      warnings.push(...matches.map(match => match[1].trim()));
    });

    return warnings;
  }

  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    // Look for suggestion patterns in the response
    const suggestionPatterns = [
      /suggestion:?\s*(.+)/gi,
      /consider:?\s*(.+)/gi,
      /recommend:?\s*(.+)/gi,
    ];

    suggestionPatterns.forEach(pattern => {
      const matches = [...response.matchAll(pattern)];
      suggestions.push(...matches.map(match => match[1].trim()));
    });

    return suggestions;
  }

  private parseAnalysisResponse(response: string): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Fallback: try to parse the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      // If JSON parsing fails, return a default structure
      return {
        components: [],
        functions: [],
        classes: [],
        dependencies: [],
        patterns: [],
        frameworkFeatures: [],
        challenges: ['Failed to parse analysis response'],
        conversionApproach: 'Manual analysis required',
      };
    }
  }

  private parseValidationResponse(response: string): ValidationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Fallback: try to parse the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      // If JSON parsing fails, return a default structure
      return {
        isValid: false,
        functionalEquivalence: false,
        syntaxCorrect: false,
        followsBestPractices: false,
        issues: [{
          type: 'error',
          message: 'Failed to parse validation response',
        }],
        overallScore: 0,
        recommendations: ['Manual validation required'],
      };
    }
  }
}