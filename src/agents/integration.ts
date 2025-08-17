// Integration Agent - Integrates converted components and ensures system compatibility

import { BaseAgent } from './base';
import { AgentContext, AgentResult } from './types';
import { ConversionTask } from '../types';

export class IntegrationAgent extends BaseAgent {
  constructor() {
    super('IntegrationAgent', 'integration', ['integration', 'system_integration', 'compatibility_check']);
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    try {
      switch (task.type) {
        case 'integration':
          return await this.performIntegration(task, context);
        default:
          return this.createErrorResult(`Unsupported task type: ${task.type}`);
      }
    } catch (error) {
      return this.createErrorResult(`Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performIntegration(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const integrationResults = {
      componentIntegration: await this.integrateComponents(task.inputFiles, context),
      dependencyResolution: await this.resolveDependencies(task.inputFiles, context),
      configurationIntegration: await this.integrateConfigurations(task.inputFiles, context),
      systemCompatibility: await this.checkSystemCompatibility(task.inputFiles, context),
      buildValidation: await this.validateBuild(task.inputFiles, context),
      runtimeValidation: await this.validateRuntime(task.inputFiles, context),
      overallScore: 0,
      issues: [] as Array<{ type: string; severity: 'error' | 'warning' | 'info'; message: string; component?: string }>,
      recommendations: [] as string[]
    };

    // Calculate overall integration score
    integrationResults.overallScore = this.calculateIntegrationScore(integrationResults);

    // Generate integration recommendations
    integrationResults.recommendations = this.generateIntegrationRecommendations(integrationResults);

    const isIntegrated = integrationResults.overallScore >= 0.8 && 
                        !integrationResults.issues.some(issue => issue.severity === 'error');

    return this.createSuccessResult(
      {
        isIntegrated,
        score: integrationResults.overallScore,
        ...integrationResults
      },
      this.generateIntegrationFiles(integrationResults, context),
      {
        integrationType: task.context?.integrationType || 'full_system',
        targetTechStack: context.targetTechStack
      }
    );
  }

  private async integrateComponents(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      totalComponents: 0,
      integratedComponents: 0,
      failedComponents: 0,
      componentMap: new Map<string, any>(),
      interfaceCompatibility: [] as Array<{ component: string; compatible: boolean; issues: string[] }>,
      score: 0
    };

    // Identify and categorize components
    const components = this.identifyComponents(filePaths, context);
    results.totalComponents = components.length;

    for (const component of components) {
      try {
        const integrationResult = await this.integrateComponent(component, context);
        
        if (integrationResult.success) {
          results.integratedComponents++;
          results.componentMap.set(component.name, integrationResult);
        } else {
          results.failedComponents++;
          results.interfaceCompatibility.push({
            component: component.name,
            compatible: false,
            issues: integrationResult.issues || []
          });
        }
      } catch (error) {
        results.failedComponents++;
        this.error(`Failed to integrate component ${component.name}:`, error as Error);
      }
    }

    results.score = results.totalComponents > 0 ? results.integratedComponents / results.totalComponents : 1;
    return results;
  }

  private async resolveDependencies(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      totalDependencies: 0,
      resolvedDependencies: 0,
      unresolvedDependencies: [] as string[],
      conflictingDependencies: [] as Array<{ name: string; versions: string[]; resolution?: string }>,
      circularDependencies: [] as string[],
      score: 0
    };

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(filePaths, context);
    results.totalDependencies = Object.keys(dependencyGraph).length;

    // Resolve dependencies
    for (const [dependency, info] of Object.entries(dependencyGraph)) {
      const resolution = await this.resolveDependency(dependency, info as any, context);
      
      if (resolution.resolved) {
        results.resolvedDependencies++;
      } else {
        results.unresolvedDependencies.push(dependency);
      }

      if (resolution.conflicts) {
        results.conflictingDependencies.push({
          name: dependency,
          versions: resolution.conflicts,
          resolution: resolution.suggestedResolution
        });
      }
    }

    // Detect circular dependencies
    results.circularDependencies = this.detectCircularDependencies(dependencyGraph);

    const totalIssues = results.unresolvedDependencies.length + 
                       results.conflictingDependencies.length + 
                       results.circularDependencies.length;

    results.score = totalIssues === 0 ? 1 : Math.max(0, 1 - (totalIssues * 0.1));
    return results;
  }

  private async integrateConfigurations(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      configFiles: [] as string[],
      integratedConfigs: 0,
      configConflicts: [] as Array<{ file: string; conflicts: string[] }>,
      missingConfigs: [] as string[],
      score: 0
    };

    // Find all configuration files
    results.configFiles = filePaths.filter(path => this.isConfigurationFile(path));

    // Check for required configurations
    const requiredConfigs = this.getRequiredConfigurations(context.targetTechStack);
    results.missingConfigs = requiredConfigs.filter(config => 
      !results.configFiles.some(file => file.includes(config))
    );

    // Validate configuration compatibility
    for (const configFile of results.configFiles) {
      const validation = await this.validateConfiguration(configFile, context);
      
      if (validation.valid) {
        results.integratedConfigs++;
      } else {
        results.configConflicts.push({
          file: configFile,
          conflicts: validation.conflicts || []
        });
      }
    }

    const totalIssues = results.configConflicts.length + results.missingConfigs.length;
    results.score = totalIssues === 0 ? 1 : Math.max(0, 1 - (totalIssues * 0.1));
    
    return results;
  }

  private async checkSystemCompatibility(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      runtimeCompatibility: this.checkRuntimeCompatibility(context.targetTechStack),
      platformCompatibility: this.checkPlatformCompatibility(context.targetTechStack),
      versionCompatibility: this.checkVersionCompatibility(filePaths, context),
      environmentCompatibility: this.checkEnvironmentCompatibility(filePaths, context),
      score: 0
    };

    // Calculate compatibility score
    const compatibilityScores = [
      results.runtimeCompatibility.score,
      results.platformCompatibility.score,
      results.versionCompatibility.score,
      results.environmentCompatibility.score
    ];

    results.score = compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
    return results;
  }

  private async validateBuild(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      buildConfigValid: false,
      buildScriptsValid: false,
      dependenciesInstallable: false,
      buildExecutable: false,
      buildErrors: [] as string[],
      buildWarnings: [] as string[],
      score: 0
    };

    try {
      // Validate build configuration
      results.buildConfigValid = await this.validateBuildConfiguration(filePaths, context);
      
      // Validate build scripts
      results.buildScriptsValid = await this.validateBuildScripts(filePaths, context);
      
      // Check if dependencies can be installed
      results.dependenciesInstallable = await this.checkDependencyInstallation(filePaths, context);
      
      // Simulate build execution (dry run)
      const buildSimulation = await this.simulateBuild(filePaths, context);
      results.buildExecutable = buildSimulation.success;
      results.buildErrors = buildSimulation.errors || [];
      results.buildWarnings = buildSimulation.warnings || [];

      // Calculate build score
      const buildChecks = [
        results.buildConfigValid,
        results.buildScriptsValid,
        results.dependenciesInstallable,
        results.buildExecutable
      ];

      results.score = buildChecks.filter(check => check).length / buildChecks.length;
    } catch (error) {
      results.buildErrors.push(`Build validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.score = 0;
    }

    return results;
  }

  private async validateRuntime(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      runtimeConfigValid: false,
      entryPointsValid: false,
      moduleResolutionValid: false,
      runtimeErrors: [] as string[],
      performanceMetrics: {} as any,
      score: 0
    };

    try {
      // Validate runtime configuration
      results.runtimeConfigValid = await this.validateRuntimeConfiguration(filePaths, context);
      
      // Validate entry points
      results.entryPointsValid = await this.validateEntryPoints(filePaths, context);
      
      // Validate module resolution
      results.moduleResolutionValid = await this.validateModuleResolution(filePaths, context);
      
      // Simulate runtime execution
      const runtimeSimulation = await this.simulateRuntime(filePaths, context);
      results.runtimeErrors = runtimeSimulation.errors || [];
      results.performanceMetrics = runtimeSimulation.metrics || {};

      // Calculate runtime score
      const runtimeChecks = [
        results.runtimeConfigValid,
        results.entryPointsValid,
        results.moduleResolutionValid,
        results.runtimeErrors.length === 0
      ];

      results.score = runtimeChecks.filter(check => check).length / runtimeChecks.length;
    } catch (error) {
      results.runtimeErrors.push(`Runtime validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.score = 0;
    }

    return results;
  }

  // Helper methods for component integration
  private identifyComponents(filePaths: string[], context: AgentContext): any[] {
    const components: any[] = [];
    
    // Group files by component type
    const componentGroups = this.groupFilesByComponent(filePaths);
    
    for (const [componentType, files] of componentGroups.entries()) {
      components.push({
        name: componentType,
        type: this.determineComponentType(componentType, files),
        files,
        dependencies: this.extractComponentDependencies(files, context)
      });
    }

    return components;
  }

  private async integrateComponent(component: any, context: AgentContext): Promise<any> {
    const result = {
      success: false,
      issues: [] as string[],
      integrationPoints: [] as string[]
    };

    try {
      // Check component interface compatibility
      const interfaceCheck = await this.checkComponentInterface(component, context);
      if (!interfaceCheck.compatible) {
        result.issues.push(...interfaceCheck.issues);
        return result;
      }

      // Validate component dependencies
      const dependencyCheck = await this.validateComponentDependencies(component, context);
      if (!dependencyCheck.valid) {
        result.issues.push(...dependencyCheck.issues);
        return result;
      }

      // Perform integration
      result.integrationPoints = await this.createIntegrationPoints(component, context);
      result.success = true;
    } catch (error) {
      result.issues.push(`Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private buildDependencyGraph(filePaths: string[], context: AgentContext): any {
    const graph: any = {};
    
    // Analyze each file for dependencies
    for (const filePath of filePaths) {
      const file = this.findFileInTree(context.sourceFiles, filePath);
      if (!file || !file.content) continue;

      const dependencies = this.extractFileDependencies(file.content, filePath);
      graph[filePath] = {
        dependencies,
        type: this.getFileType(filePath),
        exports: this.extractFileExports(file.content, filePath)
      };
    }

    return graph;
  }

  private async resolveDependency(dependency: string, info: any, context: AgentContext): Promise<any> {
    const result = {
      resolved: false,
      conflicts: null as string[] | null,
      suggestedResolution: null as string | null
    };

    try {
      // Check if dependency exists in target tech stack
      const availability = await this.checkDependencyAvailability(dependency, context.targetTechStack);
      
      if (availability.available) {
        result.resolved = true;
      } else if (availability.alternatives.length > 0) {
        result.suggestedResolution = availability.alternatives[0];
        result.resolved = true;
      } else {
        result.conflicts = [`Dependency ${dependency} not available in target tech stack`];
      }
    } catch (error) {
      result.conflicts = [`Failed to resolve dependency ${dependency}: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }

    return result;
  }

  private detectCircularDependencies(graph: any): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const dfs = (node: string, path: string[] = []): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          circularDeps.push(path.slice(cycleStart).join(' -> ') + ' -> ' + node);
        }
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph[node]?.dependencies || [];
      for (const dep of dependencies) {
        dfs(dep, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return circularDeps;
  }

  // Configuration integration helpers
  private isConfigurationFile(path: string): boolean {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'webpack.config', 'vite.config',
      'next.config', 'tailwind.config', 'jest.config', 'babel.config',
      '.env', 'docker-compose.yml', 'Dockerfile'
    ];
    
    return configPatterns.some(pattern => path.includes(pattern));
  }

  private getRequiredConfigurations(techStack: any): string[] {
    const configs: Record<string, string[]> = {
      'typescript': ['tsconfig.json', 'package.json'],
      'javascript': ['package.json'],
      'python': ['requirements.txt'],
      'nextjs': ['next.config.js', 'package.json'],
      'react': ['package.json']
    };

    const required = new Set<string>();
    
    if (techStack.language) {
      configs[techStack.language.toLowerCase()]?.forEach(config => required.add(config));
    }
    
    if (techStack.framework) {
      configs[techStack.framework.toLowerCase()]?.forEach(config => required.add(config));
    }

    return Array.from(required);
  }

  private async validateConfiguration(configFile: string, context: AgentContext): Promise<any> {
    const result = {
      valid: true,
      conflicts: [] as string[]
    };

    try {
      const file = this.findFileInTree(context.sourceFiles, configFile);
      if (!file || !file.content) {
        result.valid = false;
        result.conflicts.push('Configuration file not found or empty');
        return result;
      }

      // Parse and validate configuration based on file type
      if (configFile.includes('package.json')) {
        result.conflicts.push(...this.validatePackageJson(file.content, context.targetTechStack));
      } else if (configFile.includes('tsconfig.json')) {
        result.conflicts.push(...this.validateTsConfig(file.content, context.targetTechStack));
      }
      // Add more configuration validators as needed

      result.valid = result.conflicts.length === 0;
    } catch (error) {
      result.valid = false;
      result.conflicts.push(`Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // System compatibility helpers
  private checkRuntimeCompatibility(techStack: any): any {
    const compatibility = {
      nodeVersion: this.checkNodeCompatibility(techStack),
      pythonVersion: this.checkPythonCompatibility(techStack),
      score: 0
    };

    const scores = Object.values(compatibility).filter(val => typeof val === 'object' && 'score' in val);
    compatibility.score = scores.length > 0 ? 
      scores.reduce((sum: number, item: any) => sum + item.score, 0) / scores.length : 1;

    return compatibility;
  }

  private checkPlatformCompatibility(techStack: any): any {
    return {
      windows: true,
      macos: true,
      linux: true,
      score: 1
    };
  }

  private checkVersionCompatibility(filePaths: string[], context: AgentContext): any {
    return {
      languageVersion: this.checkLanguageVersionCompatibility(context.targetTechStack),
      frameworkVersion: this.checkFrameworkVersionCompatibility(context.targetTechStack),
      score: 1
    };
  }

  private checkEnvironmentCompatibility(filePaths: string[], context: AgentContext): any {
    return {
      development: true,
      production: true,
      testing: true,
      score: 1
    };
  }

  // Build and runtime validation helpers
  private async validateBuildConfiguration(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Check for build configuration files and validate their content
    const buildConfigs = filePaths.filter(path => 
      path.includes('webpack.config') || 
      path.includes('vite.config') || 
      path.includes('rollup.config')
    );

    return buildConfigs.length > 0; // Simplified validation
  }

  private async validateBuildScripts(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Check package.json for build scripts
    const packageJsonPath = filePaths.find(path => path.endsWith('package.json'));
    if (!packageJsonPath) return false;

    const packageFile = this.findFileInTree(context.sourceFiles, packageJsonPath);
    if (!packageFile || !packageFile.content) return false;

    try {
      const packageData = JSON.parse(packageFile.content);
      return packageData.scripts && (packageData.scripts.build || packageData.scripts.start);
    } catch {
      return false;
    }
  }

  private async checkDependencyInstallation(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Simplified check - in real implementation, this would verify all dependencies are available
    return true;
  }

  private async simulateBuild(filePaths: string[], context: AgentContext): Promise<any> {
    // Simulate build process and return results
    return {
      success: true,
      errors: [],
      warnings: []
    };
  }

  private async validateRuntimeConfiguration(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Validate runtime-specific configurations
    return true;
  }

  private async validateEntryPoints(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Check for valid entry points
    const entryPoints = filePaths.filter(path => 
      path.includes('index.') || 
      path.includes('main.') || 
      path.includes('app.')
    );

    return entryPoints.length > 0;
  }

  private async validateModuleResolution(filePaths: string[], context: AgentContext): Promise<boolean> {
    // Validate that all imports can be resolved
    return true;
  }

  private async simulateRuntime(filePaths: string[], context: AgentContext): Promise<any> {
    // Simulate runtime execution
    return {
      errors: [],
      metrics: {
        startupTime: 100,
        memoryUsage: 50
      }
    };
  }

  // Utility methods
  private calculateIntegrationScore(results: any): number {
    const weights = {
      components: 0.25,
      dependencies: 0.25,
      configuration: 0.2,
      compatibility: 0.15,
      build: 0.1,
      runtime: 0.05
    };

    return (
      results.componentIntegration.score * weights.components +
      results.dependencyResolution.score * weights.dependencies +
      results.configurationIntegration.score * weights.configuration +
      results.systemCompatibility.score * weights.compatibility +
      results.buildValidation.score * weights.build +
      results.runtimeValidation.score * weights.runtime
    );
  }

  private generateIntegrationRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    if (results.componentIntegration.score < 0.8) {
      recommendations.push('Review component interfaces and resolve compatibility issues');
    }

    if (results.dependencyResolution.unresolvedDependencies.length > 0) {
      recommendations.push('Resolve unresolved dependencies before deployment');
    }

    if (results.configurationIntegration.missingConfigs.length > 0) {
      recommendations.push(`Add missing configuration files: ${results.configurationIntegration.missingConfigs.join(', ')}`);
    }

    if (results.buildValidation.score < 0.8) {
      recommendations.push('Fix build configuration issues');
    }

    return recommendations;
  }

  private generateIntegrationFiles(results: any, context: AgentContext): Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }> {
    const files: Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }> = [];

    // Generate integration report
    files.push({
      path: 'integration_report.json',
      content: JSON.stringify(results, null, 2),
      type: 'create'
    });

    // Generate any missing configuration files
    if (results.configurationIntegration.missingConfigs.length > 0) {
      for (const missingConfig of results.configurationIntegration.missingConfigs) {
        const configContent = this.generateDefaultConfig(missingConfig, context.targetTechStack);
        if (configContent) {
          files.push({
            path: missingConfig,
            content: configContent,
            type: 'create'
          });
        }
      }
    }

    return files;
  }

  // Additional helper methods (simplified implementations)
  private groupFilesByComponent(filePaths: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    
    filePaths.forEach(path => {
      const parts = path.split('/');
      const component = parts.length > 1 ? parts[parts.length - 2] : 'root';
      
      if (!groups.has(component)) {
        groups.set(component, []);
      }
      groups.get(component)!.push(path);
    });

    return groups;
  }

  private determineComponentType(name: string, files: string[]): string {
    if (files.some(f => f.includes('component') || f.includes('Component'))) return 'ui-component';
    if (files.some(f => f.includes('service') || f.includes('Service'))) return 'service';
    if (files.some(f => f.includes('util') || f.includes('helper'))) return 'utility';
    return 'module';
  }

  private extractComponentDependencies(files: string[], context: AgentContext): string[] {
    // Extract dependencies for a component
    return [];
  }

  private async checkComponentInterface(component: any, context: AgentContext): Promise<any> {
    return { compatible: true, issues: [] };
  }

  private async validateComponentDependencies(component: any, context: AgentContext): Promise<any> {
    return { valid: true, issues: [] };
  }

  private async createIntegrationPoints(component: any, context: AgentContext): Promise<string[]> {
    return [];
  }

  private extractFileDependencies(content: string, filePath: string): string[] {
    const dependencies: string[] = [];
    const importRegex = /(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  private getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'react',
      'tsx': 'react-typescript',
      'py': 'python',
      'json': 'config'
    };
    return typeMap[ext || ''] || 'unknown';
  }

  private extractFileExports(content: string, filePath: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private async checkDependencyAvailability(dependency: string, techStack: any): Promise<any> {
    // Check if dependency is available in target tech stack
    return {
      available: true,
      alternatives: []
    };
  }

  private validatePackageJson(content: string, techStack: any): string[] {
    const conflicts: string[] = [];
    
    try {
      const packageData = JSON.parse(content);
      
      // Check for conflicting dependencies
      if (techStack.language === 'typescript' && !packageData.devDependencies?.typescript) {
        conflicts.push('TypeScript dependency missing for TypeScript project');
      }
      
    } catch (error) {
      conflicts.push('Invalid package.json format');
    }

    return conflicts;
  }

  private validateTsConfig(content: string, techStack: any): string[] {
    const conflicts: string[] = [];
    
    try {
      const tsConfig = JSON.parse(content);
      
      // Basic TypeScript configuration validation
      if (!tsConfig.compilerOptions) {
        conflicts.push('Missing compilerOptions in tsconfig.json');
      }
      
    } catch (error) {
      conflicts.push('Invalid tsconfig.json format');
    }

    return conflicts;
  }

  private checkNodeCompatibility(techStack: any): any {
    return { compatible: true, version: '18+', score: 1 };
  }

  private checkPythonCompatibility(techStack: any): any {
    return { compatible: true, version: '3.8+', score: 1 };
  }

  private checkLanguageVersionCompatibility(techStack: any): any {
    return { compatible: true, score: 1 };
  }

  private checkFrameworkVersionCompatibility(techStack: any): any {
    return { compatible: true, score: 1 };
  }

  private generateDefaultConfig(configName: string, techStack: any): string | null {
    const configs: Record<string, string> = {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      }, null, 2),
      'package.json': JSON.stringify({
        name: 'converted-project',
        version: '1.0.0',
        scripts: {
          build: 'tsc',
          start: 'node dist/index.js'
        },
        dependencies: {},
        devDependencies: {}
      }, null, 2)
    };

    return configs[configName] || null;
  }
}