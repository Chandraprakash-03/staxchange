/**
 * AST parsing utilities for code analysis
 * This module provides utilities to parse and analyze code using Abstract Syntax Trees
 */

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  children?: ASTNode[];
  value?: any;
  metadata?: Record<string, any>;
}

export interface CodeAnalysisResult {
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  dependencies: string[];
  complexity: number;
  linesOfCode: number;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  type: 'default' | 'named' | 'namespace' | 'side-effect';
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'class' | 'function' | 'variable';
  line: number;
}

export interface FunctionInfo {
  name: string;
  parameters: string[];
  isAsync: boolean;
  isGenerator: boolean;
  line: number;
  complexity: number;
}

export interface ClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  methods: FunctionInfo[];
  properties: string[];
  line: number;
}

export interface VariableInfo {
  name: string;
  type: 'var' | 'let' | 'const';
  line: number;
  isExported: boolean;
}

export class ASTParser {
  /**
   * Analyze JavaScript/TypeScript code
   */
  static analyzeJavaScript(code: string, filename: string): CodeAnalysisResult {
    const result: CodeAnalysisResult = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: [],
      dependencies: [],
      complexity: 0,
      linesOfCode: code.split('\n').length,
    };

    try {
      // Simple regex-based parsing for basic analysis
      // In a production environment, you'd use a proper parser like @babel/parser
      
      // Analyze imports
      result.imports = this.parseImports(code);
      result.dependencies = result.imports.map(imp => imp.module);
      
      // Analyze exports
      result.exports = this.parseExports(code);
      
      // Analyze functions
      result.functions = this.parseFunctions(code);
      
      // Analyze classes
      result.classes = this.parseClasses(code);
      
      // Analyze variables
      result.variables = this.parseVariables(code);
      
      // Calculate complexity
      result.complexity = this.calculateComplexity(code);
      
    } catch (error) {
      console.warn(`Error parsing JavaScript file ${filename}:`, error);
    }

    return result;
  }

  /**
   * Analyze Python code
   */
  static analyzePython(code: string, filename: string): CodeAnalysisResult {
    const result: CodeAnalysisResult = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: [],
      dependencies: [],
      complexity: 0,
      linesOfCode: code.split('\n').length,
    };

    try {
      // Analyze Python imports
      result.imports = this.parsePythonImports(code);
      result.dependencies = result.imports.map(imp => imp.module);
      
      // Analyze Python functions
      result.functions = this.parsePythonFunctions(code);
      
      // Analyze Python classes
      result.classes = this.parsePythonClasses(code);
      
      // Calculate complexity
      result.complexity = this.calculateComplexity(code);
      
    } catch (error) {
      console.warn(`Error parsing Python file ${filename}:`, error);
    }

    return result;
  }

  /**
   * Parse JavaScript/TypeScript imports
   */
  private static parseImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // ES6 imports
      const es6ImportMatch = line.match(/^import\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`]/);
      if (es6ImportMatch) {
        const importClause = es6ImportMatch[1].trim();
        const module = es6ImportMatch[2];
        
        let type: ImportInfo['type'] = 'named';
        let importNames: string[] = [];
        
        if (importClause.includes('{')) {
          // Named imports: import { a, b } from 'module'
          const namedMatch = importClause.match(/\{([^}]+)\}/);
          if (namedMatch) {
            importNames = namedMatch[1].split(',').map(name => name.trim());
          }
          type = 'named';
        } else if (importClause.includes('*')) {
          // Namespace import: import * as name from 'module'
          const namespaceMatch = importClause.match(/\*\s+as\s+(\w+)/);
          if (namespaceMatch) {
            importNames = [namespaceMatch[1]];
          }
          type = 'namespace';
        } else {
          // Default import: import name from 'module'
          importNames = [importClause];
          type = 'default';
        }
        
        imports.push({
          module,
          imports: importNames,
          type,
          line: i + 1,
        });
      }
      
      // Side-effect imports
      const sideEffectMatch = line.match(/^import\s+['"`]([^'"`]+)['"`]/);
      if (sideEffectMatch) {
        imports.push({
          module: sideEffectMatch[1],
          imports: [],
          type: 'side-effect',
          line: i + 1,
        });
      }
      
      // CommonJS require
      const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"`]([^'"`]+)['"`]\)/);
      if (requireMatch) {
        const varName = requireMatch[1].trim();
        const module = requireMatch[2];
        
        imports.push({
          module,
          imports: [varName],
          type: 'default',
          line: i + 1,
        });
      }
    }
    
    return imports;
  }

  /**
   * Parse JavaScript/TypeScript exports
   */
  private static parseExports(code: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Default exports
      const defaultExportMatch = line.match(/^export\s+default\s+(.+)/);
      if (defaultExportMatch) {
        const exported = defaultExportMatch[1];
        let type: ExportInfo['type'] = 'default';
        
        if (exported.startsWith('class')) {
          type = 'class';
        } else if (exported.startsWith('function')) {
          type = 'function';
        }
        
        exports.push({
          name: 'default',
          type,
          line: i + 1,
        });
      }
      
      // Named exports
      const namedExportMatch = line.match(/^export\s+\{([^}]+)\}/);
      if (namedExportMatch) {
        const exportNames = namedExportMatch[1].split(',').map(name => name.trim());
        for (const name of exportNames) {
          exports.push({
            name,
            type: 'named',
            line: i + 1,
          });
        }
      }
      
      // Export declarations
      const exportDeclMatch = line.match(/^export\s+(class|function|const|let|var)\s+(\w+)/);
      if (exportDeclMatch) {
        const declType = exportDeclMatch[1];
        const name = exportDeclMatch[2];
        
        let type: ExportInfo['type'] = 'named';
        if (declType === 'class') type = 'class';
        else if (declType === 'function') type = 'function';
        else type = 'variable';
        
        exports.push({
          name,
          type,
          line: i + 1,
        });
      }
    }
    
    return exports;
  }

  /**
   * Parse JavaScript/TypeScript functions
   */
  private static parseFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Function declarations
      const funcMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const name = funcMatch[1];
        const params = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
        const isAsync = line.includes('async');
        const isGenerator = line.includes('function*');
        
        functions.push({
          name,
          parameters: params,
          isAsync,
          isGenerator,
          line: i + 1,
          complexity: this.calculateFunctionComplexity(code, i),
        });
      }
      
      // Arrow functions
      const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const isAsync = line.includes('async');
        
        functions.push({
          name,
          parameters: [],
          isAsync,
          isGenerator: false,
          line: i + 1,
          complexity: this.calculateFunctionComplexity(code, i),
        });
      }
    }
    
    return functions;
  }

  /**
   * Parse JavaScript/TypeScript classes
   */
  private static parseClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(/^(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
      if (classMatch) {
        const name = classMatch[1];
        const extendsClass = classMatch[2];
        const implementsInterfaces = classMatch[3]?.split(',').map(i => i.trim());
        
        // Find class methods and properties
        const methods: FunctionInfo[] = [];
        const properties: string[] = [];
        
        // Simple method detection within class body
        let braceCount = 0;
        let inClass = false;
        
        for (let j = i; j < lines.length; j++) {
          const classLine = lines[j];
          
          if (classLine.includes('{')) {
            braceCount += (classLine.match(/\{/g) || []).length;
            inClass = true;
          }
          if (classLine.includes('}')) {
            braceCount -= (classLine.match(/\}/g) || []).length;
          }
          
          if (inClass && braceCount === 0) {
            break; // End of class
          }
          
          if (inClass && j > i) {
            // Method detection
            const methodMatch = classLine.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)/);
            if (methodMatch) {
              methods.push({
                name: methodMatch[1],
                parameters: [],
                isAsync: classLine.includes('async'),
                isGenerator: false,
                line: j + 1,
                complexity: 1,
              });
            }
            
            // Property detection
            const propMatch = classLine.match(/^\s*(\w+)\s*[:=]/);
            if (propMatch && !methodMatch) {
              properties.push(propMatch[1]);
            }
          }
        }
        
        classes.push({
          name,
          extends: extendsClass,
          implements: implementsInterfaces,
          methods,
          properties,
          line: i + 1,
        });
      }
    }
    
    return classes;
  }

  /**
   * Parse JavaScript/TypeScript variables
   */
  private static parseVariables(code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const varMatch = line.match(/^(?:export\s+)?(const|let|var)\s+(\w+)/);
      if (varMatch) {
        const type = varMatch[1] as VariableInfo['type'];
        const name = varMatch[2];
        const isExported = line.startsWith('export');
        
        variables.push({
          name,
          type,
          line: i + 1,
          isExported,
        });
      }
    }
    
    return variables;
  }

  /**
   * Parse Python imports
   */
  private static parsePythonImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // from module import ...
      const fromImportMatch = line.match(/^from\s+([^\s]+)\s+import\s+(.+)/);
      if (fromImportMatch) {
        const module = fromImportMatch[1];
        const importClause = fromImportMatch[2];
        
        let importNames: string[] = [];
        if (importClause === '*') {
          importNames = ['*'];
        } else {
          importNames = importClause.split(',').map(name => name.trim());
        }
        
        imports.push({
          module,
          imports: importNames,
          type: 'named',
          line: i + 1,
        });
      }
      
      // import module
      const importMatch = line.match(/^import\s+([^\s]+)(?:\s+as\s+(\w+))?/);
      if (importMatch) {
        const module = importMatch[1];
        const alias = importMatch[2];
        
        imports.push({
          module,
          imports: [alias || module],
          type: 'default',
          line: i + 1,
        });
      }
    }
    
    return imports;
  }

  /**
   * Parse Python functions
   */
  private static parsePythonFunctions(code: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const funcMatch = line.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const name = funcMatch[1];
        const params = funcMatch[2].split(',').map(p => p.trim()).filter(p => p);
        const isAsync = line.includes('async');
        
        functions.push({
          name,
          parameters: params,
          isAsync,
          isGenerator: false,
          line: i + 1,
          complexity: this.calculateFunctionComplexity(code, i),
        });
      }
    }
    
    return functions;
  }

  /**
   * Parse Python classes
   */
  private static parsePythonClasses(code: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const classMatch = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
      if (classMatch) {
        const name = classMatch[1];
        const baseClasses = classMatch[2]?.split(',').map(c => c.trim());
        
        // Find methods within class
        const methods: FunctionInfo[] = [];
        let indentLevel = 0;
        
        for (let j = i + 1; j < lines.length; j++) {
          const classLine = lines[j];
          
          if (classLine.trim() === '') continue;
          
          const currentIndent = classLine.length - classLine.trimStart().length;
          
          if (j === i + 1) {
            indentLevel = currentIndent;
          } else if (currentIndent <= indentLevel && classLine.trim()) {
            break; // End of class
          }
          
          const methodMatch = classLine.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\([^)]*\)/);
          if (methodMatch) {
            methods.push({
              name: methodMatch[1],
              parameters: [],
              isAsync: classLine.includes('async'),
              isGenerator: false,
              line: j + 1,
              complexity: 1,
            });
          }
        }
        
        classes.push({
          name,
          extends: baseClasses?.[0],
          implements: baseClasses?.slice(1),
          methods,
          properties: [],
          line: i + 1,
        });
      }
    }
    
    return classes;
  }

  /**
   * Calculate cyclomatic complexity of code
   */
  private static calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b&&\b/g,
      /\b\|\|\b/g,
      /\?\s*:/g, // Ternary operator
    ];
    
    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Calculate complexity for a specific function
   */
  private static calculateFunctionComplexity(code: string, startLine: number): number {
    const lines = code.split('\n');
    let complexity = 1;
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('{')) {
        braceCount += (line.match(/\{/g) || []).length;
        inFunction = true;
      }
      if (line.includes('}')) {
        braceCount -= (line.match(/\}/g) || []).length;
      }
      
      if (inFunction && braceCount === 0) {
        break; // End of function
      }
      
      if (inFunction) {
        // Count decision points in this line
        if (/\b(if|while|for|switch|case|catch)\b/.test(line)) {
          complexity++;
        }
        if (/(\|\||&&)/.test(line)) {
          complexity++;
        }
      }
    }
    
    return complexity;
  }
}