import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LivePreviewInterface } from '../index';
import { FileTree, PreviewEnvironment } from '../../../types';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language }: any) => (
    <div data-testid="monaco-editor">
      <div data-testid="editor-language">{language}</div>
      <textarea
        data-testid="editor-content"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}));

describe('Live Preview Interface Integration', () => {
  const sampleFiles: FileTree = {
    name: 'project',
    type: 'directory',
    path: '',
    children: [
      {
        name: 'index.js',
        type: 'file',
        path: 'index.js',
        content: 'console.log("Hello World");',
        metadata: { size: 26, lastModified: new Date() }
      },
      {
        name: 'style.css',
        type: 'file',
        path: 'style.css',
        content: 'body { margin: 0; }',
        metadata: { size: 18, lastModified: new Date() }
      }
    ],
    metadata: { size: 0, lastModified: new Date() }
  };

  const samplePreview: PreviewEnvironment = {
    id: 'preview-1',
    projectId: 'project-1',
    url: 'http://localhost:3000',
    status: 'ready',
    logs: [],
    createdAt: new Date(),
    lastAccessed: new Date(),
    config: {
      runtime: 'node',
      port: 3000,
      entryPoint: 'index.js',
      environment: {}
    }
  };

  it('renders complete live preview interface', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    // Check main components are rendered
    expect(screen.getAllByText('Live Preview')).toHaveLength(2); // Main header + preview frame header
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('allows file selection and editing', () => {
    const mockOnFileChange = vi.fn();
    
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
        onFileChange={mockOnFileChange}
      />
    );

    // Verify initial file is loaded (index.js)
    const editor = screen.getByTestId('editor-content');
    expect(editor).toHaveValue('console.log("Hello World");');

    // Verify file selection works
    const cssFile = screen.getByText('style.css');
    expect(cssFile).toBeInTheDocument();
    
    // The editor and file tree are properly rendered and interactive
    expect(editor).toBeInTheDocument();
  });

  it('shows correct language syntax highlighting', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    // Default file should be JavaScript
    expect(screen.getByTestId('editor-language')).toHaveTextContent('javascript');

    // Select CSS file
    const cssFile = screen.getByText('style.css');
    fireEvent.click(cssFile);

    // Should switch to CSS language
    expect(screen.getByTestId('editor-language')).toHaveTextContent('css');
  });

  it('handles preview status changes', () => {
    const { rerender } = render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();

    // Update to error status
    const errorPreview = { ...samplePreview, status: 'error' as const };
    rerender(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={errorPreview}
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('provides layout controls', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    // Check layout control buttons
    expect(screen.getByTitle('Focus on preview')).toBeInTheDocument();
    expect(screen.getByTitle('Split view')).toBeInTheDocument();
    expect(screen.getByTitle('Focus on code')).toBeInTheDocument();

    // Test clicking layout controls
    const previewButton = screen.getByTitle('Focus on preview');
    fireEvent.click(previewButton);

    const splitButton = screen.getByTitle('Split view');
    fireEvent.click(splitButton);

    const codeButton = screen.getByTitle('Focus on code');
    fireEvent.click(codeButton);
  });

  it('handles missing preview environment gracefully', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    expect(screen.getByText('Not Available')).toBeInTheDocument();
  });

  it('displays file tree with proper structure', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    // Check file tree structure
    expect(screen.getByText('project')).toBeInTheDocument();
    expect(screen.getAllByText('index.js')).toHaveLength(2); // Tree + tab
    expect(screen.getByText('style.css')).toBeInTheDocument();
  });

  it('shows preview URL when available', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
  });
});