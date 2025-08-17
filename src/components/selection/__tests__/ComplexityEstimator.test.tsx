import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplexityEstimator, ComplexityEstimate } from '../ComplexityEstimator';
import { TechStack } from '@/types';

const mockCurrentStack: TechStack = {
  language: 'javascript',
  framework: 'react',
  database: 'postgresql',
  runtime: 'node',
  buildTool: 'webpack',
  packageManager: 'npm',
  deployment: 'vercel',
  additional: {}
};

const mockTargetStack: Partial<TechStack> = {
  language: 'python',
  framework: 'django',
  database: 'postgresql'
};

const mockEstimate: ComplexityEstimate = {
  overall: 'medium',
  estimatedDuration: 8.5,
  factors: [
    {
      category: 'Language Migration',
      impact: 'high',
      description: 'Converting from JavaScript to Python',
      timeImpact: 6
    },
    {
      category: 'Framework Migration',
      impact: 'medium',
      description: 'Migrating to Django framework',
      timeImpact: 4
    }
  ],
  breakdown: {
    codeConversion: 3.4,
    dependencyMigration: 1.7,
    configurationChanges: 1.275,
    testing: 1.275,
    integration: 0.85
  }
};

describe('ComplexityEstimator', () => {
  const defaultProps = {
    currentStack: mockCurrentStack,
    targetStack: mockTargetStack,
    estimate: mockEstimate,
    projectSize: 150 * 1024 // 150KB
  };

  it('renders overall complexity badge', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('displays estimated duration', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('8.5 hours')).toBeInTheDocument();
  });

  it('shows project size when provided', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('Based on project size: 150.0 KB')).toBeInTheDocument();
  });

  it('displays conversion path', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('javascript + react')).toBeInTheDocument();
    expect(screen.getByText('python + django')).toBeInTheDocument();
  });

  it('renders all complexity factors', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('Language Migration')).toBeInTheDocument();
    expect(screen.getByText('Framework Migration')).toBeInTheDocument();
    expect(screen.getByText('Converting from JavaScript to Python')).toBeInTheDocument();
    expect(screen.getByText('Migrating to Django framework')).toBeInTheDocument();
  });

  it('shows time impact for each factor', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('+6 hours')).toBeInTheDocument();
    expect(screen.getByText('+4 hours')).toBeInTheDocument();
  });

  it('displays time breakdown categories', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('Code Conversion')).toBeInTheDocument();
    expect(screen.getByText('Dependency Migration')).toBeInTheDocument();
    expect(screen.getByText('Configuration Changes')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('Integration')).toBeInTheDocument();
  });

  it('shows breakdown time values', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText('3.4 hours')).toBeInTheDocument();
    expect(screen.getByText('1.7 hours')).toBeInTheDocument();
  });

  it('calculates and displays percentages', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    // Code conversion should be 40% (3.4/8.5)
    expect(screen.getByText('40.0% of total time')).toBeInTheDocument();
    // Dependency migration should be 20% (1.7/8.5)
    expect(screen.getByText('20.0% of total time')).toBeInTheDocument();
  });

  it('shows appropriate recommendation for medium complexity', () => {
    render(<ComplexityEstimator {...defaultProps} />);
    
    expect(screen.getByText(/This conversion has moderate complexity/)).toBeInTheDocument();
  });

  it('shows appropriate recommendation for high complexity', () => {
    const highComplexityEstimate = { ...mockEstimate, overall: 'high' as const };
    render(<ComplexityEstimator {...defaultProps} estimate={highComplexityEstimate} />);
    
    expect(screen.getByText(/This is a complex conversion/)).toBeInTheDocument();
  });

  it('shows appropriate recommendation for low complexity', () => {
    const lowComplexityEstimate = { ...mockEstimate, overall: 'low' as const };
    render(<ComplexityEstimator {...defaultProps} estimate={lowComplexityEstimate} />);
    
    expect(screen.getByText(/This conversion should be straightforward/)).toBeInTheDocument();
  });

  it('formats duration correctly for minutes', () => {
    const shortEstimate = { ...mockEstimate, estimatedDuration: 0.5 };
    render(<ComplexityEstimator {...defaultProps} estimate={shortEstimate} />);
    
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
  });

  it('formats duration correctly for days', () => {
    const longEstimate = { ...mockEstimate, estimatedDuration: 30 };
    render(<ComplexityEstimator {...defaultProps} estimate={longEstimate} />);
    
    expect(screen.getByText('1 day 6 hours')).toBeInTheDocument();
  });

  it('applies correct color for low complexity', () => {
    const lowComplexityEstimate = { ...mockEstimate, overall: 'low' as const };
    render(<ComplexityEstimator {...defaultProps} estimate={lowComplexityEstimate} />);
    
    const badge = screen.getByText('Low').closest('div');
    expect(badge).toHaveClass('text-green-600', 'bg-green-100');
  });

  it('applies correct color for high complexity', () => {
    const highComplexityEstimate = { ...mockEstimate, overall: 'high' as const };
    render(<ComplexityEstimator {...defaultProps} estimate={highComplexityEstimate} />);
    
    const badge = screen.getByText('High').closest('div');
    expect(badge).toHaveClass('text-red-600', 'bg-red-100');
  });
});