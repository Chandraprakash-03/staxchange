'use client';

import React, { useState, useEffect } from 'react';
import { TechStack } from '@/types';
import { TechStackCategory, TechOption } from './TechStackCategory';
import { CompatibilityValidator, CompatibilityIssue } from './CompatibilityValidator';
import { ComplexityEstimator, ComplexityEstimate } from './ComplexityEstimator';

interface TechStackSelectorProps {
  currentStack: TechStack;
  onSelectionChange: (targetStack: Partial<TechStack>) => void;
  onValidationChange: (issues: CompatibilityIssue[]) => void;
  onComplexityChange: (estimate: ComplexityEstimate) => void;
  projectSize?: number;
}

// Tech stack options data
const TECH_OPTIONS = {
  language: [
    {
      id: 'javascript',
      name: 'JavaScript',
      description: 'Dynamic, versatile language for web development',
      icon: '🟨',
      popular: true,
      compatibility: ['typescript', 'react', 'vue', 'angular', 'node'],
      incompatible: []
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      description: 'JavaScript with static type definitions',
      icon: '🔷',
      popular: true,
      compatibility: ['javascript', 'react', 'vue', 'angular', 'node'],
      incompatible: []
    },
    {
      id: 'python',
      name: 'Python',
      description: 'High-level, interpreted programming language',
      icon: '🐍',
      popular: true,
      compatibility: ['django', 'flask', 'fastapi'],
      incompatible: ['react', 'vue', 'angular']
    },
    {
      id: 'java',
      name: 'Java',
      description: 'Object-oriented, platform-independent language',
      icon: '☕',
      compatibility: ['spring', 'springboot'],
      incompatible: ['react', 'vue', 'angular', 'node']
    },
    {
      id: 'go',
      name: 'Go',
      description: 'Fast, statically typed compiled language',
      icon: '🐹',
      compatibility: ['gin', 'fiber'],
      incompatible: ['react', 'vue', 'angular', 'node']
    },
    {
      id: 'php',
      name: 'PHP',
      description: 'Server-side scripting language',
      icon: '🐘',
      compatibility: ['laravel', 'symfony'],
      incompatible: ['react', 'vue', 'angular', 'node']
    },
    {
      id: 'csharp',
      name: 'C#',
      description: 'Modern, object-oriented programming language',
      icon: '🔷',
      compatibility: ['dotnet', 'aspnet'],
      incompatible: ['react', 'vue', 'angular', 'node']
    }
  ],
  framework: [
    {
      id: 'react',
      name: 'React',
      description: 'Component-based UI library',
      icon: '⚛️',
      popular: true,
      compatibility: ['javascript', 'typescript', 'nextjs'],
      incompatible: ['vue', 'angular', 'python', 'java', 'go', 'php']
    },
    {
      id: 'vue',
      name: 'Vue.js',
      description: 'Progressive JavaScript framework',
      icon: '💚',
      popular: true,
      compatibility: ['javascript', 'typescript', 'nuxt'],
      incompatible: ['react', 'angular', 'python', 'java', 'go', 'php']
    },
    {
      id: 'angular',
      name: 'Angular',
      description: 'Full-featured TypeScript framework',
      icon: '🅰️',
      compatibility: ['typescript'],
      incompatible: ['react', 'vue', 'javascript', 'python', 'java', 'go', 'php']
    },
    {
      id: 'nextjs',
      name: 'Next.js',
      description: 'React framework with SSR and SSG',
      icon: '▲',
      popular: true,
      compatibility: ['react', 'javascript', 'typescript'],
      incompatible: ['vue', 'angular']
    },
    {
      id: 'django',
      name: 'Django',
      description: 'High-level Python web framework',
      icon: '🎸',
      compatibility: ['python'],
      incompatible: ['javascript', 'typescript', 'react', 'vue', 'angular']
    },
    {
      id: 'flask',
      name: 'Flask',
      description: 'Lightweight Python web framework',
      icon: '🌶️',
      compatibility: ['python'],
      incompatible: ['javascript', 'typescript', 'react', 'vue', 'angular']
    },
    {
      id: 'spring',
      name: 'Spring Boot',
      description: 'Java framework for enterprise applications',
      icon: '🍃',
      compatibility: ['java'],
      incompatible: ['javascript', 'typescript', 'python', 'react', 'vue', 'angular']
    },
    {
      id: 'dotnet',
      name: '.NET',
      description: 'Microsoft development platform',
      icon: '🔷',
      compatibility: ['csharp'],
      incompatible: ['javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular']
    },
    {
      id: 'aspnet',
      name: 'ASP.NET Core',
      description: 'Cross-platform web framework',
      icon: '🌐',
      compatibility: ['csharp', 'dotnet'],
      incompatible: ['javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular']
    }
  ],
  database: [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      description: 'Advanced open-source relational database',
      icon: '🐘',
      popular: true,
      compatibility: [],
      incompatible: []
    },
    {
      id: 'mysql',
      name: 'MySQL',
      description: 'Popular open-source relational database',
      icon: '🐬',
      popular: true,
      compatibility: [],
      incompatible: []
    },
    {
      id: 'mongodb',
      name: 'MongoDB',
      description: 'NoSQL document database',
      icon: '🍃',
      compatibility: [],
      incompatible: []
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      description: 'Lightweight embedded database',
      icon: '🪶',
      compatibility: [],
      incompatible: []
    },
    {
      id: 'redis',
      name: 'Redis',
      description: 'In-memory data structure store',
      icon: '🔴',
      compatibility: [],
      incompatible: []
    }
  ],
  deployment: [
    {
      id: 'docker',
      name: 'Docker',
      description: 'Containerization platform',
      icon: '🐳',
      popular: true,
      compatibility: [],
      incompatible: []
    },
    {
      id: 'vercel',
      name: 'Vercel',
      description: 'Frontend deployment platform',
      icon: '▲',
      popular: true,
      compatibility: ['nextjs', 'react', 'vue'],
      incompatible: ['python', 'java', 'go', 'php']
    },
    {
      id: 'netlify',
      name: 'Netlify',
      description: 'JAMstack deployment platform',
      icon: '🌐',
      compatibility: ['react', 'vue', 'angular'],
      incompatible: ['python', 'java', 'go', 'php']
    },
    {
      id: 'aws',
      name: 'AWS',
      description: 'Amazon Web Services cloud platform',
      icon: '☁️',
      compatibility: [],
      incompatible: []
    },
    {
      id: 'heroku',
      name: 'Heroku',
      description: 'Cloud application platform',
      icon: '💜',
      compatibility: [],
      incompatible: []
    }
  ]
};

export function TechStackSelector({
  currentStack,
  onSelectionChange,
  onValidationChange,
  onComplexityChange,
  projectSize
}: TechStackSelectorProps) {
  const [targetStack, setTargetStack] = useState<Partial<TechStack>>({});
  const [compatibilityIssues, setCompatibilityIssues] = useState<CompatibilityIssue[]>([]);
  const [complexityEstimate, setComplexityEstimate] = useState<ComplexityEstimate | null>(null);

  // Validate compatibility whenever target stack changes
  useEffect(() => {
    const issues = validateCompatibility(targetStack);
    setCompatibilityIssues(issues);
    onValidationChange(issues);
  }, [targetStack]); // Removed onValidationChange from dependencies

  // Calculate complexity estimate whenever target stack changes
  useEffect(() => {
    if (Object.keys(targetStack).length > 0) {
      const estimate = calculateComplexity(currentStack, targetStack, projectSize);
      setComplexityEstimate(estimate);
      onComplexityChange(estimate);
    }
  }, [currentStack, targetStack, projectSize]); // Removed onComplexityChange from dependencies

  const handleCategorySelection = (category: keyof TechStack, value: string) => {
    const newTargetStack = { ...targetStack, [category]: value };
    setTargetStack(newTargetStack);
    onSelectionChange(newTargetStack);
  };

  const validateCompatibility = (stack: Partial<TechStack>): CompatibilityIssue[] => {
    const issues: CompatibilityIssue[] = [];
    
    // Check language-framework compatibility
    if (stack.language && stack.framework) {
      const languageOption = TECH_OPTIONS.language.find(opt => opt.id === stack.language);
      const frameworkOption = TECH_OPTIONS.framework.find(opt => opt.id === stack.framework);
      
      if (languageOption && frameworkOption) {
        if (frameworkOption.incompatible?.includes(stack.language)) {
          issues.push({
            type: 'error',
            message: `${frameworkOption.name} is not compatible with ${languageOption.name}`,
            suggestion: `Consider using a ${languageOption.name}-compatible framework`,
            affectedTechnologies: [languageOption.name, frameworkOption.name]
          });
        }
      }
    }

    // Check deployment compatibility
    if (stack.deployment && (stack.language || stack.framework)) {
      const deploymentOption = TECH_OPTIONS.deployment.find(opt => opt.id === stack.deployment);
      
      if (deploymentOption && deploymentOption.incompatible) {
        const conflicts = deploymentOption.incompatible.filter(tech => 
          tech === stack.language || tech === stack.framework
        );
        
        if (conflicts.length > 0) {
          issues.push({
            type: 'warning',
            message: `${deploymentOption.name} may have limitations with ${conflicts.join(', ')}`,
            suggestion: 'Consider alternative deployment options or additional configuration',
            affectedTechnologies: [deploymentOption.name, ...conflicts]
          });
        }
      }
    }

    // Check for major language changes
    if (stack.language && stack.language !== currentStack.language) {
      const currentLang = currentStack.language;
      const targetLang = stack.language;
      
      const isComplexChange = (
        (currentLang === 'javascript' && ['python', 'java', 'go', 'php'].includes(targetLang)) ||
        (currentLang === 'python' && ['javascript', 'typescript', 'java', 'go', 'php'].includes(targetLang)) ||
        (currentLang === 'java' && ['javascript', 'typescript', 'python', 'go', 'php'].includes(targetLang))
      );
      
      if (isComplexChange) {
        issues.push({
          type: 'warning',
          message: `Converting from ${currentLang} to ${targetLang} is a major change`,
          suggestion: 'This will require significant code restructuring and may take longer',
          affectedTechnologies: [currentLang, targetLang]
        });
      }
    }

    return issues;
  };

  const calculateComplexity = (
    current: TechStack, 
    target: Partial<TechStack>, 
    size?: number
  ): ComplexityEstimate => {
    let baseTime = 2; // Base 2 hours
    const factors: any[] = [];
    
    // Language complexity
    if (target.language && target.language !== current.language) {
      const languageComplexity = getLanguageConversionComplexity(current.language, target.language);
      baseTime += languageComplexity.time;
      factors.push({
        category: 'Language Migration',
        impact: languageComplexity.impact,
        description: `Converting from ${current.language} to ${target.language}`,
        timeImpact: languageComplexity.time
      });
    }

    // Framework complexity
    if (target.framework && target.framework !== current.framework) {
      const frameworkTime = 4;
      baseTime += frameworkTime;
      factors.push({
        category: 'Framework Migration',
        impact: 'medium' as const,
        description: `Migrating to ${target.framework} framework`,
        timeImpact: frameworkTime
      });
    }

    // Database complexity
    if (target.database && target.database !== current.database) {
      const dbTime = 3;
      baseTime += dbTime;
      factors.push({
        category: 'Database Migration',
        impact: 'medium' as const,
        description: `Converting database to ${target.database}`,
        timeImpact: dbTime
      });
    }

    // Project size factor
    if (size) {
      const sizeMultiplier = Math.max(1, size / (100 * 1024)); // 100KB baseline
      baseTime *= sizeMultiplier;
      
      if (sizeMultiplier > 2) {
        factors.push({
          category: 'Project Size',
          impact: 'high' as const,
          description: 'Large project requires more conversion time',
          timeImpact: baseTime * (sizeMultiplier - 1)
        });
      }
    }

    // Determine overall complexity
    let overall: 'low' | 'medium' | 'high' = 'low';
    if (baseTime > 8) overall = 'high';
    else if (baseTime > 4) overall = 'medium';

    return {
      overall,
      estimatedDuration: baseTime,
      factors,
      breakdown: {
        codeConversion: baseTime * 0.4,
        dependencyMigration: baseTime * 0.2,
        configurationChanges: baseTime * 0.15,
        testing: baseTime * 0.15,
        integration: baseTime * 0.1
      }
    };
  };

  const getLanguageConversionComplexity = (from: string, to: string) => {
    const complexityMatrix: Record<string, Record<string, { time: number; impact: 'low' | 'medium' | 'high' }>> = {
      javascript: {
        typescript: { time: 1, impact: 'low' },
        python: { time: 8, impact: 'high' },
        java: { time: 12, impact: 'high' },
        go: { time: 10, impact: 'high' },
        php: { time: 6, impact: 'medium' },
        csharp: { time: 10, impact: 'high' }
      },
      typescript: {
        javascript: { time: 0.5, impact: 'low' },
        python: { time: 8, impact: 'high' },
        java: { time: 10, impact: 'high' },
        go: { time: 10, impact: 'high' },
        php: { time: 6, impact: 'medium' },
        csharp: { time: 10, impact: 'high' }
      },
      python: {
        javascript: { time: 6, impact: 'medium' },
        typescript: { time: 6, impact: 'medium' },
        java: { time: 8, impact: 'high' },
        go: { time: 8, impact: 'high' },
        php: { time: 4, impact: 'medium' },
        csharp: { time: 8, impact: 'high' }
      },
      java: {
        javascript: { time: 10, impact: 'high' },
        typescript: { time: 10, impact: 'high' },
        python: { time: 8, impact: 'high' },
        go: { time: 6, impact: 'medium' },
        php: { time: 8, impact: 'high' },
        csharp: { time: 4, impact: 'medium' }
      },
      csharp: {
        javascript: { time: 10, impact: 'high' },
        typescript: { time: 10, impact: 'high' },
        python: { time: 8, impact: 'high' },
        java: { time: 4, impact: 'medium' },
        go: { time: 6, impact: 'medium' },
        php: { time: 8, impact: 'high' }
      }
    };

    return complexityMatrix[from]?.[to] || { time: 8, impact: 'high' as const };
  };

  return (
    <div className="space-y-8">
      {/* Current Stack Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Current Technology Stack</h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {currentStack.language}
          </span>
          {currentStack.framework && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {currentStack.framework}
            </span>
          )}
          {currentStack.database && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {currentStack.database}
            </span>
          )}
          {currentStack.deployment && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {currentStack.deployment}
            </span>
          )}
        </div>
      </div>

      {/* Tech Stack Selection */}
      <TechStackCategory
        title="Programming Language"
        description="Select the target programming language for your project"
        options={TECH_OPTIONS.language}
        selectedValue={targetStack.language}
        onSelect={(value) => handleCategorySelection('language', value)}
        required
      />

      <TechStackCategory
        title="Framework"
        description="Choose a framework or library for your application"
        options={TECH_OPTIONS.framework}
        selectedValue={targetStack.framework}
        onSelect={(value) => handleCategorySelection('framework', value)}
      />

      <TechStackCategory
        title="Database"
        description="Select a database system for data storage"
        options={TECH_OPTIONS.database}
        selectedValue={targetStack.database}
        onSelect={(value) => handleCategorySelection('database', value)}
      />

      <TechStackCategory
        title="Deployment"
        description="Choose a deployment platform for your application"
        options={TECH_OPTIONS.deployment}
        selectedValue={targetStack.deployment}
        onSelect={(value) => handleCategorySelection('deployment', value)}
      />

      {/* Compatibility Validation */}
      {Object.keys(targetStack).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Validation Results</h3>
          <CompatibilityValidator
            currentStack={currentStack}
            targetStack={targetStack}
            issues={compatibilityIssues}
          />
        </div>
      )}

      {/* Complexity Estimation */}
      {complexityEstimate && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Conversion Analysis</h3>
          <ComplexityEstimator
            currentStack={currentStack}
            targetStack={targetStack}
            estimate={complexityEstimate}
            projectSize={projectSize}
          />
        </div>
      )}
    </div>
  );
}