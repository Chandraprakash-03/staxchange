import { TechStack, ConversionTask, FileTree } from '../types';

export interface PromptContext {
  sourceCode: string;
  fileName: string;
  sourceTechStack: TechStack;
  targetTechStack: TechStack;
  projectStructure?: FileTree;
  dependencies?: string[];
  additionalContext?: Record<string, any>;
}

export interface ConversionPromptOptions {
  includeComments?: boolean;
  preserveFormatting?: boolean;
  includeTests?: boolean;
  optimizeForPerformance?: boolean;
  followBestPractices?: boolean;
}

export class PromptEngineer {
  /**
   * Generate a comprehensive code conversion prompt
   */
  static generateConversionPrompt(
    context: PromptContext,
    options: ConversionPromptOptions = {}
  ): string {
    const {
      includeComments = true,
      preserveFormatting = true,
      includeTests = false,
      optimizeForPerformance = true,
      followBestPractices = true,
    } = options;

    const sections = [
      this.buildTaskDescription(context),
      this.buildTechStackContext(context),
      this.buildCodeContext(context),
      this.buildConversionRules(options),
      this.buildOutputFormat(),
      this.buildQualityRequirements(options),
    ];

    return sections.join('\n\n');
  }

  /**
   * Generate a prompt for analyzing code structure
   */
  static generateAnalysisPrompt(sourceCode: string, fileName: string, techStack: TechStack): string {
    return `
Analyze the following ${techStack.language} code file and provide a detailed structural analysis:

**File:** ${fileName}
**Technology Stack:** ${this.formatTechStack(techStack)}

**Code to Analyze:**
\`\`\`${this.getLanguageIdentifier(techStack.language)}
${sourceCode}
\`\`\`

**Analysis Requirements:**
1. Identify the main components, functions, and classes
2. List all dependencies and imports
3. Describe the architectural patterns used
4. Identify any framework-specific features
5. Note any potential conversion challenges
6. Suggest the conversion approach

**Output Format:**
Provide your analysis in JSON format with the following structure:
\`\`\`json
{
  "components": [],
  "functions": [],
  "classes": [],
  "dependencies": [],
  "patterns": [],
  "frameworkFeatures": [],
  "challenges": [],
  "conversionApproach": ""
}
\`\`\`
    `.trim();
  }

  /**
   * Generate a prompt for validating converted code
   */
  static generateValidationPrompt(
    originalCode: string,
    convertedCode: string,
    context: PromptContext
  ): string {
    return `
Validate the following code conversion and ensure functional equivalence:

**Original Code (${context.sourceTechStack.language}):**
\`\`\`${this.getLanguageIdentifier(context.sourceTechStack.language)}
${originalCode}
\`\`\`

**Converted Code (${context.targetTechStack.language}):**
\`\`\`${this.getLanguageIdentifier(context.targetTechStack.language)}
${convertedCode}
\`\`\`

**Validation Criteria:**
1. Functional equivalence - does the converted code perform the same operations?
2. Syntax correctness - is the converted code syntactically valid?
3. Best practices - does it follow target language/framework conventions?
4. Performance considerations - are there any performance regressions?
5. Security implications - are there any security issues introduced?

**Output Format:**
Provide validation results in JSON format:
\`\`\`json
{
  "isValid": boolean,
  "functionalEquivalence": boolean,
  "syntaxCorrect": boolean,
  "followsBestPractices": boolean,
  "issues": [
    {
      "type": "error|warning|suggestion",
      "message": "description",
      "line": number,
      "suggestion": "how to fix"
    }
  ],
  "overallScore": number,
  "recommendations": []
}
\`\`\`
    `.trim();
  }

  /**
   * Generate a prompt for creating test cases
   */
  static generateTestPrompt(
    sourceCode: string,
    convertedCode: string,
    context: PromptContext
  ): string {
    const testFramework = this.getTestFramework(context.targetTechStack);
    
    return `
Generate comprehensive test cases for the converted code to ensure it maintains the same functionality as the original:

**Original Code:**
\`\`\`${this.getLanguageIdentifier(context.sourceTechStack.language)}
${sourceCode}
\`\`\`

**Converted Code:**
\`\`\`${this.getLanguageIdentifier(context.targetTechStack.language)}
${convertedCode}
\`\`\`

**Test Requirements:**
1. Use ${testFramework} testing framework
2. Test all public methods/functions
3. Include edge cases and error scenarios
4. Ensure 100% functional coverage
5. Follow ${context.targetTechStack.language} testing best practices

**Output Format:**
Provide complete test file with proper imports and setup:
\`\`\`${this.getLanguageIdentifier(context.targetTechStack.language)}
// Generated test file content here
\`\`\`
    `.trim();
  }

  private static buildTaskDescription(context: PromptContext): string {
    return `
**Task:** Convert the following ${context.sourceTechStack.language} code to ${context.targetTechStack.language}

**File:** ${context.fileName}
**Source Stack:** ${this.formatTechStack(context.sourceTechStack)}
**Target Stack:** ${this.formatTechStack(context.targetTechStack)}
    `.trim();
  }

  private static buildTechStackContext(context: PromptContext): string {
    const sections = [
      '**Technology Stack Conversion Details:**',
    ];

    if (context.sourceTechStack.framework && context.targetTechStack.framework) {
      sections.push(`- Framework: ${context.sourceTechStack.framework} → ${context.targetTechStack.framework}`);
    }

    if (context.sourceTechStack.database && context.targetTechStack.database) {
      sections.push(`- Database: ${context.sourceTechStack.database} → ${context.targetTechStack.database}`);
    }

    if (context.sourceTechStack.buildTool && context.targetTechStack.buildTool) {
      sections.push(`- Build Tool: ${context.sourceTechStack.buildTool} → ${context.targetTechStack.buildTool}`);
    }

    if (context.dependencies?.length) {
      sections.push(`- Dependencies: ${context.dependencies.join(', ')}`);
    }

    return sections.join('\n');
  }

  private static buildCodeContext(context: PromptContext): string {
    return `
**Source Code:**
\`\`\`${this.getLanguageIdentifier(context.sourceTechStack.language)}
${context.sourceCode}
\`\`\`
    `.trim();
  }

  private static buildConversionRules(options: ConversionPromptOptions): string {
    const rules = [
      '**Conversion Rules:**',
      '1. Maintain exact functional equivalence',
      '2. Preserve all business logic and algorithms',
      '3. Convert syntax and idioms to target language/framework',
      '4. Update import statements and dependencies',
    ];

    if (options.followBestPractices) {
      rules.push('5. Follow target language/framework best practices and conventions');
    }

    if (options.optimizeForPerformance) {
      rules.push('6. Optimize for performance where possible without changing functionality');
    }

    if (options.includeComments) {
      rules.push('7. Include helpful comments explaining complex conversions');
    }

    if (options.preserveFormatting) {
      rules.push('8. Maintain readable code structure and formatting');
    }

    return rules.join('\n');
  }

  private static buildOutputFormat(): string {
    return `
**Output Format:**
Provide only the converted code without additional explanations. Use proper code blocks:

\`\`\`[language]
// Converted code here
\`\`\`
    `.trim();
  }

  private static buildQualityRequirements(options: ConversionPromptOptions): string {
    const requirements = [
      '**Quality Requirements:**',
      '- Code must be syntactically correct and runnable',
      '- All imports and dependencies must be properly updated',
      '- Variable names and function signatures should follow target language conventions',
      '- Error handling should be adapted to target language patterns',
    ];

    if (options.includeTests) {
      requirements.push('- Include basic test cases to verify functionality');
    }

    return requirements.join('\n');
  }

  private static formatTechStack(techStack: TechStack): string {
    const parts = [techStack.language];
    
    if (techStack.framework) parts.push(techStack.framework);
    if (techStack.database) parts.push(techStack.database);
    if (techStack.runtime) parts.push(techStack.runtime);
    
    return parts.join(' + ');
  }

  private static getLanguageIdentifier(language: string): string {
    const languageMap: Record<string, string> = {
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Python': 'python',
      'Java': 'java',
      'C#': 'csharp',
      'Go': 'go',
      'Rust': 'rust',
      'PHP': 'php',
      'Ruby': 'ruby',
      'Swift': 'swift',
      'Kotlin': 'kotlin',
    };

    return languageMap[language] || language.toLowerCase();
  }

  private static getTestFramework(techStack: TechStack): string {
    const frameworkMap: Record<string, string> = {
      'JavaScript': 'Jest',
      'TypeScript': 'Jest',
      'Python': 'pytest',
      'Java': 'JUnit',
      'C#': 'NUnit',
      'Go': 'testing',
      'Rust': 'cargo test',
      'PHP': 'PHPUnit',
      'Ruby': 'RSpec',
    };

    return frameworkMap[techStack.language] || 'appropriate testing framework';
  }
}

/**
 * Utility functions for prompt optimization
 */
export class PromptOptimizer {
  /**
   * Truncate code to fit within token limits while preserving important parts
   */
  static truncateCode(code: string, maxLength: number = 8000): string {
    if (code.length <= maxLength) {
      return code;
    }

    // Try to preserve the beginning and end of the file
    const halfLength = Math.floor(maxLength / 2) - 100;
    const beginning = code.substring(0, halfLength);
    const end = code.substring(code.length - halfLength);
    
    return `${beginning}\n\n// ... [truncated for length] ...\n\n${end}`;
  }

  /**
   * Extract key context from large codebases
   */
  static extractKeyContext(fileTree: FileTree, maxFiles: number = 10): string[] {
    const importantFiles: string[] = [];
    
    const traverse = (node: FileTree) => {
      if (node.type === 'file' && this.isImportantFile(node.name)) {
        importantFiles.push(node.path);
      }
      
      if (node.children && importantFiles.length < maxFiles) {
        node.children.forEach(traverse);
      }
    };

    traverse(fileTree);
    return importantFiles.slice(0, maxFiles);
  }

  private static isImportantFile(fileName: string): boolean {
    const importantPatterns = [
      /package\.json$/,
      /requirements\.txt$/,
      /Gemfile$/,
      /pom\.xml$/,
      /build\.gradle$/,
      /Cargo\.toml$/,
      /composer\.json$/,
      /main\./,
      /index\./,
      /app\./,
      /config\./,
      /\.config\./,
    ];

    return importantPatterns.some(pattern => pattern.test(fileName));
  }
}