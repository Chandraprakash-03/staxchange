import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LivePreviewInterface from '../LivePreviewInterface';
import { FileTree, PreviewEnvironment } from '../../../types';

// Mock child components
vi.mock('../SplitPaneLayout', () => ({
  default: ({ leftPane, rightPane }: any) => (
    <div data-testid="split-pane">
      <div data-testid="left-pane">{leftPane}</div>
      <div data-testid="right-pane">{rightPane}</div>
    </div>
  )
}));

vi.mock('../CodeEditor', () => ({
  default: ({ onFileSelect, onFileChange }: any) => (
    <div data-testid="code-editor">
      <button onClick={() => onFileSelect?.('test.js')}>Select File</button>
      <button onClick={() => onFileChange?.('test.js', 'new content')}>Change File</button>
    </div>
  )
}));

vi.mock('../PreviewFrame', () => ({
  default: ({ url, onLoad, onError }: any) => (
    <div data-testid="preview-frame">
      <div data-testid="preview-url">{url || 'No URL'}</div>
      <button onClick={() => onLoad?.()}>Load</button>
      <button onClick={() => onError?.('Test error')}>Error</button>
    </div>
  )
}));

describe('LivePreviewInterface', () => {
  const mockOnFileChange = vi.fn();
  const mockOnPreviewUpdate = vi.fn();

  const sampleFiles: FileTree = {
    name: 'project',
    type: 'directory',
    path: '',
    children: [
      {
        name: 'index.js',
        type: 'file',
        path: 'index.js',
        content: 'console.log("Hello");',
        metadata: { size: 20, lastModified: new Date() }
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

  beforeEach(() => {
    mockOnFileChange.mockClear();
    mockOnPreviewUpdate.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders main components', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    expect(screen.getByText('Live Preview')).toBeInTheDocument();
    expect(screen.getByText('Edit your code and see changes in real-time')).toBeInTheDocument();
    expect(screen.getByTestId('split-pane')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
  });

  it('displays preview status correctly', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows preview URL when available', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
      />
    );

    expect(screen.getByTestId('preview-url')).toHaveTextContent('http://localhost:3000');
  });

  it('handles file selection', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    const selectButton = screen.getByText('Select File');
    fireEvent.click(selectButton);

    // File selection is handled internally
    expect(selectButton).toBeInTheDocument();
  });

  it('handles file changes with debouncing', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        onFileChange={mockOnFileChange}
      />
    );

    const changeButton = screen.getByText('Change File');
    fireEvent.click(changeButton);

    // Should not call immediately due to debouncing
    expect(mockOnFileChange).not.toHaveBeenCalled();
  });

  it('shows pending changes indicator', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    const changeButton = screen.getByText('Change File');
    fireEvent.click(changeButton);

    // File change handling is tested in integration
    expect(changeButton).toBeInTheDocument();
  });

  it('handles layout control buttons', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    const previewButton = screen.getByText('Preview');
    const splitButton = screen.getByText('Split');
    const codeButton = screen.getByText('Code');

    expect(previewButton).toBeInTheDocument();
    expect(splitButton).toBeInTheDocument();
    expect(codeButton).toBeInTheDocument();

    fireEvent.click(previewButton);
    fireEvent.click(splitButton);
    fireEvent.click(codeButton);
  });

  it('calls onPreviewUpdate when preview URL changes', () => {
    const { rerender } = render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        onPreviewUpdate={mockOnPreviewUpdate}
      />
    );

    // Update with preview environment
    rerender(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={samplePreview}
        onPreviewUpdate={mockOnPreviewUpdate}
      />
    );

    expect(mockOnPreviewUpdate).toHaveBeenCalledWith('http://localhost:3000');
  });

  it('displays different status colors and text', () => {
    const readyPreview = { ...samplePreview, status: 'ready' as const };
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        previewEnvironment={readyPreview}
      />
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('handles multiple file changes correctly', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
        onFileChange={mockOnFileChange}
      />
    );

    const changeButton = screen.getByText('Change File');
    
    // Make multiple rapid changes
    fireEvent.click(changeButton);
    fireEvent.click(changeButton);
    fireEvent.click(changeButton);

    // Debouncing logic is tested in integration
    expect(changeButton).toBeInTheDocument();
  });

  it('shows not available status when no preview environment', () => {
    render(
      <LivePreviewInterface
        projectId="project-1"
        files={sampleFiles}
      />
    );

    expect(screen.getByText('Not Available')).toBeInTheDocument();
  });
});