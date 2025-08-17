// Code Generation Agent - Generates converted code using AI

import { BaseAgent } from './base';
import { AgentContext, AgentResult } from './types';
import { ConversionTask } from '../types';
import { OpenRouterClient } from '../services/openrouter';

export class CodeGenerationAgent extends BaseAgent {
  private aiClient: OpenRouterClient;

  constructor(aiClient: OpenRouterClient) {
    super('CodeGenerationAgent', 'code_generation', [
      'code_generation', 
      'dependency_update', 
      'config_update'
    ]);
    this.aiClient = aiClient;
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    try {
      switch (task.type) {
        case 'code_generation':
          return await this.generateCode(task, context);
        case 'dependency_update':
          return await this.updateDependencies(task, context);
        case 'config_update':
          return await this.updateConfiguration(task, context);
        default:
          return this.createErrorResult(`Unsupported task type: ${task.type}`);
      }
    } catch (error) {
      return this.createErrorResult(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateCode(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const generatedFiles: Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }> = [];

    for (const inputFile of task.inputFiles) {
      const sourceFile = this.findFileInTree(context.sourceFiles, inputFile);
      if (!sourceFile || !sourceFile.content) {
        this.warn(`Source file not found or empty: ${inputFile}`);
        continue;
      }

      const convertedCode = await this.convertSourceCode(
        sourceFile.content,
        inputFile,
        context.sourceTechStack,
        context.targetTechStack,
        task.context
      );

      if (convertedCode) {
        const outputPath = this.getOutputPath(inputFile, context.targetTechStack);
        generatedFiles.push({
          path: outputPath,
          content: convertedCode,
          type: outputPath === inputFile ? 'update' : 'create'
        });
      }
    }

    return this.createSuccessResult(
      { convertedFiles: generatedFiles.length },
      generatedFiles,
      {
        conversionType: 'code_generation',
        sourceLanguage: context.sourceTechStack.language,
        targetLanguage: context.targetTechStack.language
      }
    );
  }

  private async updateDependencies(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const updatedFiles: Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }> = [];

    for (const inputFile of task.inputFiles) {
      const sourceFile = this.findFileInTree(context.sourceFiles, inputFile);
      if (!sourceFile || !sourceFile.content) continue;

      const updatedContent = await this.convertDependencyFile(
        sourceFile.content,
        inputFile,
        context.sourceTechStack,
        context.targetTechStack
      );

      if (updatedContent) {
        updatedFiles.push({
          path: inputFile,
          content: updatedContent,
          type: 'update'
        });
      }
    }

    return this.createSuccessResult(
      { updatedDependencies: updatedFiles.length },
      updatedFiles,
      { conversionType: 'dependency_update' }
    );
  }

  private async updateConfiguration(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const updatedFiles: Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }> = [];

    for (const inputFile of task.inputFiles) {
      const sourceFile = this.findFileInTree(context.sourceFiles, inputFile);
      if (!sourceFile || !sourceFile.content) continue;

      const updatedContent = await this.convertConfigurationFile(
        sourceFile.content,
        inputFile,
        context.sourceTechStack,
        context.targetTechStack,
        task.context?.configType
      );

      if (updatedContent) {
        updatedFiles.push({
          path: inputFile,
          content: updatedContent,
          type: 'update'
        });
      }
    }

    return this.createSuccessResult(
      { updatedConfigs: updatedFiles.length },
      updatedFiles,
      { conversionType: 'config_update' }
    );
  }

  private async convertSourceCode(
    sourceCode: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any,
    taskContext?: any
  ): Promise<string | null> {
    const prompt = this.buildCodeConversionPrompt(
      sourceCode,
      filePath,
      sourceTechStack,
      targetTechStack,
      taskContext
    );

    try {
      const response = await this.aiClient.generateCompletion(prompt, {
        maxTokens: 4000,
        temperature: 0.1, // Low temperature for consistent code generation
        model: 'deepseek/deepseek-chat' // Using a good coding model
      });

      return this.extractCodeFromResponse(response);
    } catch (error) {
      this.error(`Failed to convert code for ${filePath}:`, error as Error);
      return null;
    }
  }

  private async convertDependencyFile(
    content: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any
  ): Promise<string | null> {
    const prompt = this.buildDependencyConversionPrompt(
      content,
      filePath,
      sourceTechStack,
      targetTechStack
    );

    try {
      const response = await this.aiClient.generateCompletion(prompt, {
        maxTokens: 2000,
        temperature: 0.1
      });

      return this.extractCodeFromResponse(response);
    } catch (error) {
      this.error(`Failed to convert dependencies for ${filePath}:`, error as Error);
      return null;
    }
  }

  private async convertConfigurationFile(
    content: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any,
    configType?: string
  ): Promise<string | null> {
    const prompt = this.buildConfigConversionPrompt(
      content,
      filePath,
      sourceTechStack,
      targetTechStack,
      configType
    );

    try {
      const response = await this.aiClient.generateCompletion(prompt, {
        maxTokens: 2000,
        temperature: 0.1
      });

      return this.extractCodeFromResponse(response);
    } catch (error) {
      this.error(`Failed to convert config for ${filePath}:`, error as Error);
      return null;
    }
  }

  private buildCodeConversionPrompt(
    sourceCode: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any,
    taskContext?: any
  ): string {
    return `You are an expert code conversion assistant. Convert the following ${sourceTechStack.language} code to ${targetTechStack.language}.

Source Tech Stack:
- Language: ${sourceTechStack.language}
- Framework: ${sourceTechStack.framework || 'None'}
- Runtime: ${sourceTechStack.runtime || 'Default'}

Target Tech Stack:
- Language: ${targetTechStack.language}
- Framework: ${targetTechStack.framework || 'None'}
- Runtime: ${targetTechStack.runtime || 'Default'}

File: ${filePath}

Requirements:
1. Preserve the original functionality and logic
2. Follow ${targetTechStack.language} best practices and conventions
3. Update imports and dependencies to match the target stack
4. Maintain code structure and organization
5. Add appropriate type annotations if converting to TypeScript
6. Ensure the converted code is syntactically correct

Source Code:
\`\`\`${sourceTechStack.language}
${sourceCode}
\`\`\`

Please provide only the converted code without explanations. Wrap the code in appropriate language tags.`;
  }

  private buildDependencyConversionPrompt(
    content: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any
  ): string {
    const fileName = filePath.split('/').pop();
    
    return `Convert the following dependency file from ${sourceTechStack.language} to ${targetTechStack.language}.

Source Tech Stack: ${sourceTechStack.language} (${sourceTechStack.framework || 'vanilla'})
Target Tech Stack: ${targetTechStack.language} (${targetTechStack.framework || 'vanilla'})

File: ${fileName}

Requirements:
1. Convert all dependencies to their ${targetTechStack.language} equivalents
2. Maintain version compatibility where possible
3. Add any new dependencies required for the target stack
4. Remove dependencies that are no longer needed
5. Follow ${targetTechStack.language} package management conventions

Original ${fileName}:
\`\`\`
${content}
\`\`\`

Provide only the converted dependency file content:`;
  }

  private buildConfigConversionPrompt(
    content: string,
    filePath: string,
    sourceTechStack: any,
    targetTechStack: any,
    configType?: string
  ): string {
    return `Convert the following configuration file for ${targetTechStack.language} with ${targetTechStack.framework || 'vanilla'} setup.

Source: ${sourceTechStack.language} (${sourceTechStack.framework || 'vanilla'})
Target: ${targetTechStack.language} (${targetTechStack.framework || 'vanilla'})
Config Type: ${configType || 'general'}

File: ${filePath}

Requirements:
1. Update all paths and file extensions for the target language
2. Configure build tools and bundlers for the target stack
3. Set up appropriate compiler options if needed
4. Maintain development and production configurations
5. Follow ${targetTechStack.language} configuration best practices

Original Configuration:
\`\`\`
${content}
\`\`\`

Provide only the converted configuration:`;
  }

  private extractCodeFromResponse(response: string): string {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/;
    const match = response.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If no code block found, return the response as-is (might be plain code)
    return response.trim();
  }

  private getOutputPath(inputPath: string, targetTechStack: any): string {
    // Simple file extension conversion based on target language
    const pathParts = inputPath.split('.');
    const extension = pathParts.pop();
    const basePath = pathParts.join('.');

    const extensionMap: Record<string, Record<string, string>> = {
      'typescript': {
        'js': 'ts',
        'jsx': 'tsx'
      },
      'javascript': {
        'ts': 'js',
        'tsx': 'jsx'
      },
      'python': {
        'js': 'py',
        'ts': 'py',
        'jsx': 'py',
        'tsx': 'py'
      }
    };

    const targetLang = targetTechStack.language?.toLowerCase();
    const newExtension = extensionMap[targetLang]?.[extension || ''] || extension;
    
    return newExtension ? `${basePath}.${newExtension}` : inputPath;
  }

  // Override canHandle to be more specific about code generation tasks
  canHandle(task: ConversionTask): boolean {
    const supportedTypes = ['code_generation', 'dependency_update', 'config_update'];
    return supportedTypes.includes(task.type) && task.agentType === 'code_generation';
  }

  // Enhanced validation for code generation tasks
  async validate(task: ConversionTask, context: AgentContext): Promise<boolean> {
    const baseValidation = await super.validate(task, context);
    if (!baseValidation) return false;

    // Additional validation for code generation
    if (!context.targetTechStack.language) {
      this.warn('Target language not specified');
      return false;
    }

    if (!this.aiClient) {
      this.error('AI client not available for code generation');
      return false;
    }

    // Check if we support the conversion path
    const supportedLanguages = ['javascript', 'typescript', 'python'];
    const sourceLang = context.sourceTechStack.language?.toLowerCase();
    const targetLang = context.targetTechStack.language?.toLowerCase();

    if (!supportedLanguages.includes(sourceLang) || !supportedLanguages.includes(targetLang)) {
      this.warn(`Unsupported conversion path: ${sourceLang} -> ${targetLang}`);
      return false;
    }

    return true;
  }
}