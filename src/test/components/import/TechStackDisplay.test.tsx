import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechStackDisplay } from '@/components/import/TechStackDisplay';
import { ImportResult } from '@/types';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: ''
  },
  writable: true
});

describe('TechStackDisplay', () => {
  const mockOnStartOver = vi.fn();

  const mockImportResult: ImportResult = {
    projectId: 'test-project-123',
    structure: {
      name: 'test-repo',
      type: 'directory',
      path: '',
      children: [
        {
          name: 'package.json',
          type: 'file',
          path: 'package.json',
          content: '{"name": "test"}',
          metadata: {
            size: 1024,
            lastModified: new Date(),
            mimeType: 'application/json'
          }
        },
        {
          name: 'src',
          type: 'directory',
          path: 'src',
          children: [
            {
              name: 'index.js',
              type: 'file',
              path: 'src/index.js',
              metadata: {
                size: 512,
                lastModified: new Date(),
                mimeType: 'application/javascript'
              }
            }
          ],
          metadata: {
            size: 0,
            lastModified: new Date()
          }
        }
      ],
      metadata: {
        size: 0,
        lastModified: new Date()
      }
    },
    detectedTechnologies: {
      language: 'javascript',
      framework: 'react',
      runtime: 'node',
      database: 'postgresql',
      buildTool: 'webpack',
      packageManager: 'npm',
      deployment: 'vercel',
      additional: {
        testing: 'jest',
        styling: 'tailwindcss'
      }
    },
    size: 2048,
    status: 'success'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders success message and project information', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    expect(screen.getByText(/import successful!/i)).toBeInTheDocument();
    expect(screen.getByText(/we've analyzed your repository/i)).toBeInTheDocument();
    expect(screen.getByText(mockImportResult.projectId)).toBeInTheDocument();
    expect(screen.getByText(/2.0 kb/i)).toBeInTheDocument();
  });

  it('displays all detected technologies correctly', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    expect(screen.getByText(/javascript/i)).toBeInTheDocument();
    expect(screen.getByText(/react/i)).toBeInTheDocument();
    expect(screen.getByText(/node/i)).toBeInTheDocument();
    expect(screen.getByText(/postgresql/i)).toBeInTheDocument();
    expect(screen.getByText(/webpack/i)).toBeInTheDocument();
    expect(screen.getByText(/npm/i)).toBeInTheDocument();
    expect(screen.getByText(/vercel/i)).toBeInTheDocument();
  });

  it('displays additional technologies as tags', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    expect(screen.getByText(/testing: jest/i)).toBeInTheDocument();
    expect(screen.getByText(/styling: tailwindcss/i)).toBeInTheDocument();
  });

  it('shows "Not detected" for missing technology values', () => {
    const resultWithMissingTech: ImportResult = {
      ...mockImportResult,
      detectedTechnologies: {
        language: 'javascript',
        additional: {}
      }
    };

    render(<TechStackDisplay importResult={resultWithMissingTech} onStartOver={mockOnStartOver} />);
    
    const notDetectedElements = screen.getAllByText(/not detected/i);
    expect(notDetectedElements.length).toBeGreaterThan(0);
  });

  it('toggles file structure display', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    const toggleButton = screen.getByText(/show files/i);
    expect(toggleButton).toBeInTheDocument();
    
    // Initially, file structure should not be visible
    expect(screen.queryByText(/package.json/)).not.toBeInTheDocument();
    
    // Click to show files
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/package.json/)).toBeInTheDocument();
    expect(screen.getByText(/src/)).toBeInTheDocument();
    expect(screen.getByText(/index.js/)).toBeInTheDocument();
    
    // Button text should change
    expect(screen.getByText(/hide files/i)).toBeInTheDocument();
  });

  it('displays file sizes in the file structure', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    // Show file structure
    const toggleButton = screen.getByText(/show files/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/\(1.0 kb\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\(0.5 kb\)/i)).toBeInTheDocument();
  });

  it('limits file display and shows count for large directories', () => {
    const resultWithManyFiles: ImportResult = {
      ...mockImportResult,
      structure: {
        ...mockImportResult.structure,
        children: Array.from({ length: 15 }, (_, i) => ({
          name: `file${i}.js`,
          type: 'file' as const,
          path: `file${i}.js`,
          metadata: {
            size: 100,
            lastModified: new Date()
          }
        }))
      }
    };

    render(<TechStackDisplay importResult={resultWithManyFiles} onStartOver={mockOnStartOver} />);
    
    // Show file structure
    const toggleButton = screen.getByText(/show files/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/... and 5 more files/i)).toBeInTheDocument();
  });

  it('calls onStartOver when "Import Another Project" is clicked', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    const startOverButton = screen.getByText(/import another project/i);
    fireEvent.click(startOverButton);
    
    expect(mockOnStartOver).toHaveBeenCalledTimes(1);
  });

  it('navigates to conversion page when "Continue" is clicked', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    const continueButton = screen.getByText(/continue to tech stack selection/i);
    fireEvent.click(continueButton);
    
    expect(window.location.href).toBe(`/projects/${mockImportResult.projectId}/convert`);
  });

  it('displays helpful next steps information', () => {
    render(<TechStackDisplay importResult={mockImportResult} onStartOver={mockOnStartOver} />);
    
    expect(screen.getByText(/next steps/i)).toBeInTheDocument();
    expect(screen.getByText(/select your target technology stack/i)).toBeInTheDocument();
    expect(screen.getByText(/review the conversion plan/i)).toBeInTheDocument();
    expect(screen.getByText(/start the ai-powered conversion process/i)).toBeInTheDocument();
    expect(screen.getByText(/preview your converted project live/i)).toBeInTheDocument();
  });

  it('handles empty additional technologies gracefully', () => {
    const resultWithoutAdditional: ImportResult = {
      ...mockImportResult,
      detectedTechnologies: {
        ...mockImportResult.detectedTechnologies,
        additional: {}
      }
    };

    render(<TechStackDisplay importResult={resultWithoutAdditional} onStartOver={mockOnStartOver} />);
    
    // Should not show additional technologies section
    expect(screen.queryByText(/additional technologies/i)).not.toBeInTheDocument();
  });
});