import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechStackSelector } from '../TechStackSelector';
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

describe('TechStackSelector', () => {
  const defaultProps = {
    currentStack: mockCurrentStack,
    onSelectionChange: vi.fn(),
    onValidationChange: vi.fn(),
    onComplexityChange: vi.fn(),
    projectSize: 100 * 1024 // 100KB
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays current tech stack', () => {
    render(<TechStackSelector {...defaultProps} />);
    
    expect(screen.getByText('Current Technology Stack')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('postgresql')).toBeInTheDocument();
  });

  it('renders all tech stack categories', () => {
    render(<TechStackSelector {...defaultProps} />);
    
    expect(screen.getByText('Programming Language')).toBeInTheDocument();
    expect(screen.getByText('Framework')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Deployment')).toBeInTheDocument();
  });

  it('calls onSelectionChange when language is selected', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ language: 'python' });
    });
  });

  it('calls onValidationChange when compatibility issues are detected', async () => {
    const onValidationChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onValidationChange={onValidationChange} />);
    
    // Select incompatible combination
    fireEvent.click(screen.getByText('Angular'));
    
    await waitFor(() => {
      expect(onValidationChange).toHaveBeenCalled();
    });
  });

  it('calls onComplexityChange when target stack changes', async () => {
    const onComplexityChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onComplexityChange={onComplexityChange} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      expect(onComplexityChange).toHaveBeenCalled();
    });
  });

  it('shows validation results when target stack is selected', async () => {
    render(<TechStackSelector {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('shows complexity analysis when target stack is selected', async () => {
    render(<TechStackSelector {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      expect(screen.getByText('Conversion Analysis')).toBeInTheDocument();
    });
  });

  it('detects compatibility issues for incompatible combinations', async () => {
    render(<TechStackSelector {...defaultProps} />);
    
    // Select Angular (TypeScript only) without selecting TypeScript
    fireEvent.click(screen.getByText('Angular'));
    
    await waitFor(() => {
      // Should show compatibility warning or error
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('allows selecting multiple categories', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('TypeScript'));
    fireEvent.click(screen.getByText('Vue.js'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        language: 'typescript',
        framework: 'vue'
      });
    });
  });

  it('calculates complexity based on language change', async () => {
    const onComplexityChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onComplexityChange={onComplexityChange} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      const complexityCall = onComplexityChange.mock.calls[0][0];
      expect(complexityCall.overall).toBeDefined();
      expect(complexityCall.estimatedDuration).toBeGreaterThan(0);
    });
  });

  it('shows higher complexity for major language changes', async () => {
    const onComplexityChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onComplexityChange={onComplexityChange} />);
    
    // JavaScript to Python is a major change
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      const complexityCall = onComplexityChange.mock.calls[0][0];
      expect(complexityCall.overall).toBe('high');
    });
  });

  it('shows lower complexity for minor language changes', async () => {
    const onComplexityChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onComplexityChange={onComplexityChange} />);
    
    // JavaScript to TypeScript is a minor change
    fireEvent.click(screen.getByText('TypeScript'));
    
    await waitFor(() => {
      const complexityCall = onComplexityChange.mock.calls[0][0];
      expect(complexityCall.overall).toBe('low');
    });
  });

  it('includes project size in complexity calculation', async () => {
    const onComplexityChange = vi.fn();
    const largeProjectSize = 500 * 1024; // 500KB
    render(<TechStackSelector {...defaultProps} projectSize={largeProjectSize} onComplexityChange={onComplexityChange} />);
    
    fireEvent.click(screen.getByText('Python'));
    
    await waitFor(() => {
      const complexityCall = onComplexityChange.mock.calls[0][0];
      expect(complexityCall.estimatedDuration).toBeGreaterThan(8); // Should be higher due to large project
    });
  });

  it('handles framework selection correctly', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('Django'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ framework: 'django' });
    });
  });

  it('handles database selection correctly', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('MongoDB'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ database: 'mongodb' });
    });
  });

  it('handles deployment selection correctly', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('AWS'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ deployment: 'aws' });
    });
  });
});