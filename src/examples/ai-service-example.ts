/**
 * Example usage of the AI Service for code conversion
 * This file demonstrates how to use the OpenRouter AI client integration
 */

import { AIService } from '../services/ai';
import { TechStack } from '../types';

// Example configuration
const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here',
  defaultOptions: {
    includeComments: true,
    preserveFormatting: true,
    includeTests: false,
    optimizeForPerformance: true,
    followBestPractices: true,
  },
});

// Example tech stacks
const reactTechStack: TechStack = {
  language: 'JavaScript',
  framework: 'React',
  database: 'PostgreSQL',
  runtime: 'Node.js',
  buildTool: 'Webpack',
  packageManager: 'npm',
  deployment: 'Docker',
  additional: {},
};

const vueTechStack: TechStack = {
  language: 'TypeScript',
  framework: 'Vue',
  database: 'MongoDB',
  runtime: 'Node.js',
  buildTool: 'Vite',
  packageManager: 'pnpm',
  deployment: 'Docker',
  additional: {},
};

// Example React component to convert
const reactComponent = `
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get<User[]>('/api/users');
        setUsers(response.data);
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="user-list">
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <strong>{user.name}</strong> - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
`;

async function demonstrateAIService() {
  console.log('🤖 AI Service Integration Demo');
  console.log('================================');

  try {
    // 1. Health Check
    console.log('\n1. Checking AI service health...');
    const isHealthy = await aiService.healthCheck();
    console.log(`   Health status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    if (!isHealthy) {
      console.log('   ⚠️  AI service is not available. Please check your API key and connection.');
      return;
    }

    // 2. Code Analysis
    console.log('\n2. Analyzing React component...');
    const analysisResult = await aiService.analyzeCode({
      sourceCode: reactComponent,
      fileName: 'UserList.tsx',
      techStack: reactTechStack,
    });

    console.log('   Analysis Results:');
    console.log(`   - Components: ${analysisResult.components.join(', ')}`);
    console.log(`   - Functions: ${analysisResult.functions.join(', ')}`);
    console.log(`   - Dependencies: ${analysisResult.dependencies.join(', ')}`);
    console.log(`   - Patterns: ${analysisResult.patterns.join(', ')}`);

    // 3. Code Conversion
    console.log('\n3. Converting React to Vue...');
    const conversionResult = await aiService.convertCode({
      sourceCode: reactComponent,
      fileName: 'UserList.tsx',
      sourceTechStack: reactTechStack,
      targetTechStack: vueTechStack,
      dependencies: ['react', 'axios'],
    });

    console.log('   Conversion Results:');
    console.log(`   - Confidence: ${(conversionResult.confidence * 100).toFixed(1)}%`);
    console.log(`   - Warnings: ${conversionResult.warnings.length}`);
    console.log(`   - Suggestions: ${conversionResult.suggestions.length}`);
    
    if (conversionResult.warnings.length > 0) {
      console.log('   Warnings:');
      conversionResult.warnings.forEach(warning => console.log(`     - ${warning}`));
    }

    if (conversionResult.suggestions.length > 0) {
      console.log('   Suggestions:');
      conversionResult.suggestions.forEach(suggestion => console.log(`     - ${suggestion}`));
    }

    console.log('\n   Converted Code:');
    console.log('   ' + '='.repeat(50));
    console.log(conversionResult.convertedCode);
    console.log('   ' + '='.repeat(50));

    // 4. Code Validation
    console.log('\n4. Validating conversion...');
    const validationResult = await aiService.validateConversion({
      originalCode: reactComponent,
      convertedCode: conversionResult.convertedCode,
      context: {
        sourceCode: reactComponent,
        fileName: 'UserList.tsx',
        sourceTechStack: reactTechStack,
        targetTechStack: vueTechStack,
      },
    });

    console.log('   Validation Results:');
    console.log(`   - Valid: ${validationResult.isValid ? '✅' : '❌'}`);
    console.log(`   - Functional Equivalence: ${validationResult.functionalEquivalence ? '✅' : '❌'}`);
    console.log(`   - Syntax Correct: ${validationResult.syntaxCorrect ? '✅' : '❌'}`);
    console.log(`   - Best Practices: ${validationResult.followsBestPractices ? '✅' : '❌'}`);
    console.log(`   - Overall Score: ${(validationResult.overallScore * 100).toFixed(1)}%`);

    if (validationResult.issues.length > 0) {
      console.log('   Issues:');
      validationResult.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '💡';
        console.log(`     ${icon} ${issue.message}`);
      });
    }

    // 5. Test Generation (optional)
    console.log('\n5. Generating tests for converted code...');
    const testCode = await aiService.generateTests(
      reactComponent,
      conversionResult.convertedCode,
      {
        sourceCode: reactComponent,
        fileName: 'UserList.tsx',
        sourceTechStack: reactTechStack,
        targetTechStack: vueTechStack,
      }
    );

    console.log('   Generated Test Code:');
    console.log('   ' + '='.repeat(50));
    console.log(testCode);
    console.log('   ' + '='.repeat(50));

    console.log('\n✅ AI Service demo completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during AI service demo:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\n💡 Tip: Make sure to set your OPENROUTER_API_KEY environment variable');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.log('\n💡 Tip: Check your internet connection and API endpoint');
      }
    }
  }
}

// Export for use in other files
export {
  aiService,
  reactTechStack,
  vueTechStack,
  reactComponent,
  demonstrateAIService,
};

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateAIService();
}