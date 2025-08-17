import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompatibilityValidator, CompatibilityIssue } from '../CompatibilityValidator';
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

const mockIssues: CompatibilityIssue[] = [
  {
    type: 'error',
    message: 'Django is not compatible with JavaScript',
    suggestion: 'Consider using a JavaScript-compatible framework',
    affectedTechnologies: ['JavaScript', 'Django']
  },
  {
    type: 'warning',
    message: 'Converting from JavaScript to Python is a major change',
    suggestion: 'This will require significant code restructuring',
    affectedTechnologies: ['JavaScript', 'Python']
  },
  {
    type: 'info',
    message: 'PostgreSQL is compatible with both stacks',
    affectedTechnologies: ['PostgreSQL']
  }
];

describe('CompatibilityValidator', () => {
  const defaultProps = {
    currentStack: mockCurrentStack,
    targetStack: mockTargetStack,
    issues: mockIssues,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all compatibility issues', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    expect(screen.getByText('Django is not compatible with JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Converting from JavaScript to Python is a major change')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL is compatible with both stacks')).toBeInTheDocument();
  });

  it('shows correct issue count in header', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    expect(screen.getByText('Compatibility Analysis (3 issues)')).toBeInTheDocument();
  });

  it('displays suggestions when provided', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    expect(screen.getByText('Consider using a JavaScript-compatible framework')).toBeInTheDocument();
    expect(screen.getByText('This will require significant code restructuring')).toBeInTheDocument();
  });

  it('shows affected technologies', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    expect(screen.getAllByText('JavaScript')).toHaveLength(2); // Appears in two issues
    expect(screen.getByText('Django')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });

  it('applies correct styling for error issues', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    const errorIssue = screen.getByText('Django is not compatible with JavaScript').closest('.border');
    expect(errorIssue).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
  });

  it('applies correct styling for warning issues', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    const warningIssue = screen.getByText('Converting from JavaScript to Python is a major change').closest('.border');
    expect(warningIssue).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
  });

  it('applies correct styling for info issues', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    const infoIssue = screen.getByText('PostgreSQL is compatible with both stacks').closest('.border');
    expect(infoIssue).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });

  it('shows success message when no issues', () => {
    render(<CompatibilityValidator {...defaultProps} issues={[]} />);
    
    expect(screen.getByText('No compatibility issues detected')).toBeInTheDocument();
  });

  it('calls onDismissIssue when dismiss button is clicked', () => {
    const onDismissIssue = vi.fn();
    render(<CompatibilityValidator {...defaultProps} onDismissIssue={onDismissIssue} />);
    
    const dismissButtons = screen.getAllByRole('button');
    fireEvent.click(dismissButtons[0]);
    
    expect(onDismissIssue).toHaveBeenCalledWith(0);
  });

  it('renders dismiss buttons when onDismissIssue is provided', () => {
    const onDismissIssue = vi.fn();
    render(<CompatibilityValidator {...defaultProps} onDismissIssue={onDismissIssue} />);
    
    const dismissButtons = screen.getAllByRole('button');
    expect(dismissButtons).toHaveLength(3); // One for each issue
  });

  it('does not render dismiss buttons when onDismissIssue is not provided', () => {
    render(<CompatibilityValidator {...defaultProps} />);
    
    const dismissButtons = screen.queryAllByRole('button');
    expect(dismissButtons).toHaveLength(0);
  });

  it('handles singular issue count correctly', () => {
    const singleIssue = [mockIssues[0]];
    render(<CompatibilityValidator {...defaultProps} issues={singleIssue} />);
    
    expect(screen.getByText('Compatibility Analysis (1 issue)')).toBeInTheDocument();
  });
});