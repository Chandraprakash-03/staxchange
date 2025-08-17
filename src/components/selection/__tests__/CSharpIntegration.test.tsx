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

describe('C# and .NET Integration', () => {
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

  it('renders C# as a language option', () => {
    render(<TechStackSelector {...defaultProps} />);
    
    expect(screen.getByText('C#')).toBeInTheDocument();
    expect(screen.getByText('Modern, object-oriented programming language')).toBeInTheDocument();
  });

  it('renders .NET framework options', () => {
    render(<TechStackSelector {...defaultProps} />);
    
    expect(screen.getByText('.NET')).toBeInTheDocument();
    expect(screen.getByText('ASP.NET Core')).toBeInTheDocument();
  });

  it('allows selecting C# as target language', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('C#'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ language: 'csharp' });
    });
  });

  it('allows selecting .NET framework', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('.NET'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ framework: 'dotnet' });
    });
  });

  it('allows selecting ASP.NET Core framework', async () => {
    const onSelectionChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} />);
    
    fireEvent.click(screen.getByText('ASP.NET Core'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ framework: 'aspnet' });
    });
  });

  it('calculates complexity for JavaScript to C# conversion', async () => {
    const onComplexityChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onComplexityChange={onComplexityChange} />);
    
    fireEvent.click(screen.getByText('C#'));
    
    await waitFor(() => {
      const complexityCall = onComplexityChange.mock.calls[0][0];
      expect(complexityCall.overall).toBe('high'); // JavaScript to C# should be high complexity
      expect(complexityCall.estimatedDuration).toBeGreaterThan(8);
    });
  });

  it('shows compatibility between C# and .NET', async () => {
    const onSelectionChange = vi.fn();
    const onValidationChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} onValidationChange={onValidationChange} />);
    
    // Select C# first
    fireEvent.click(screen.getByText('C#'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ language: 'csharp' });
    });
    
    // Then select .NET framework
    fireEvent.click(screen.getByText('.NET'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({ 
        language: 'csharp', 
        framework: 'dotnet' 
      });
      
      // Should not have compatibility errors between C# and .NET
      const validationCall = onValidationChange.mock.calls[onValidationChange.mock.calls.length - 1][0];
      const hasErrors = validationCall.some((issue: any) => issue.type === 'error');
      expect(hasErrors).toBe(false);
    });
  });

  it('shows compatibility between C# and ASP.NET Core', async () => {
    const onSelectionChange = vi.fn();
    const onValidationChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} onValidationChange={onValidationChange} />);
    
    // Select C# first
    fireEvent.click(screen.getByText('C#'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ language: 'csharp' });
    });
    
    // Then select ASP.NET Core framework
    fireEvent.click(screen.getByText('ASP.NET Core'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({ 
        language: 'csharp', 
        framework: 'aspnet' 
      });
      
      // Should not have compatibility errors between C# and ASP.NET Core
      const validationCall = onValidationChange.mock.calls[onValidationChange.mock.calls.length - 1][0];
      const hasErrors = validationCall.some((issue: any) => issue.type === 'error');
      expect(hasErrors).toBe(false);
    });
  });

  it('shows incompatibility between .NET and JavaScript frameworks', async () => {
    const onSelectionChange = vi.fn();
    const onValidationChange = vi.fn();
    render(<TechStackSelector {...defaultProps} onSelectionChange={onSelectionChange} onValidationChange={onValidationChange} />);
    
    // Select .NET framework first
    fireEvent.click(screen.getByText('.NET'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith({ framework: 'dotnet' });
    });
    
    // Then try to select React (should be incompatible)
    fireEvent.click(screen.getByText('React'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith({ 
        framework: 'react' // This should override the previous selection
      });
    });
  });
});