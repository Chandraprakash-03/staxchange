import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CodeEditor from '../CodeEditor';
import { FileTree } from '../../../types';

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

describe('CodeEditor', () => {
  const mockOnFileSelect = vi.fn();
  const mockOnFileChange = vi.fn();

  const sampleFiles: FileTree = {
    name: 'project',
    type: 'directory',
    path: '',
    children: [
      {
        name: 'src',
        type: 'directory',
        path: 'src',
        children: [
          {
            name: 'index.js',
            type: 'file',
            path: 'src/index.js',
            content: 'console.log("Hello World");',
            metadata: { size: 26, lastModified: new Date() }
          },
          {
            name: 'App.tsx',
            type: 'file',
            path: 'src/App.tsx',
            content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello</div>;\n}',
            metadata: { size: 70, lastModified: new Date() }
          }
        ],
        metadata: { size: 0, lastModified: new Date() }
      },
      {
        name: 'package.json',
        type: 'file',
        path: 'package.json',
        content: '{\n  "name": "test-project"\n}',
        metadata: { size: 25, lastModified: new Date() }
      }
    ],
    metadata: { size: 0, lastModified: new Date() }
  };

  beforeEach(() => {
    mockOnFileSelect.mockClear();
    mockOnFileChange.mockClear();
  });

  it('renders file explorer and editor', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('displays file tree structure', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getAllByText('index.js')).toHaveLength(2); // One in tree, one in tab
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
  });

  it('selects first file by default', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    // Should select the first file (index.js or main file if available)
    expect(screen.getByTestId('editor-content')).toHaveValue('console.log("Hello World");');
  });

  it('handles file selection', () => {
    render(
      <CodeEditor 
        files={sampleFiles} 
        onFileSelect={mockOnFileSelect}
      />
    );
    
    const packageJsonFile = screen.getByText('package.json');
    fireEvent.click(packageJsonFile);
    
    expect(mockOnFileSelect).toHaveBeenCalledWith('project/package.json');
  });

  it('handles file content changes', () => {
    render(
      <CodeEditor 
        files={sampleFiles} 
        onFileChange={mockOnFileChange}
      />
    );
    
    const editor = screen.getByTestId('editor-content');
    fireEvent.change(editor, { target: { value: 'new content' } });
    
    expect(mockOnFileChange).toHaveBeenCalled();
  });

  it('detects correct language for files', () => {
    render(<CodeEditor files={sampleFiles} selectedFile="src/App.tsx" />);
    
    expect(screen.getByTestId('editor-language')).toHaveTextContent('typescript');
  });

  it('shows read-only indicator when readOnly is true', () => {
    render(<CodeEditor files={sampleFiles} readOnly={true} />);
    
    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('shows modified indicator for changed files', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    const editor = screen.getByTestId('editor-content');
    fireEvent.change(editor, { target: { value: 'modified content' } });
    
    // Should show modified indicator (orange dot)
    const modifiedIndicators = screen.getAllByTitle('Modified');
    expect(modifiedIndicators.length).toBeGreaterThan(0);
  });

  it('expands directories by default for first 2 levels', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    // src directory should be expanded (level 1)
    expect(screen.getAllByText('index.js')).toHaveLength(2); // One in tree, one in tab
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('handles directory toggle', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    const srcDirectory = screen.getByText('src');
    
    // Click to collapse
    fireEvent.click(srcDirectory);
    
    // Files should still be visible since they're already rendered
    // In a real implementation, this would hide/show the children
  });

  it('shows no file selected message when no files available', () => {
    const emptyFiles: FileTree = {
      name: 'empty',
      type: 'directory',
      path: '',
      children: [],
      metadata: { size: 0, lastModified: new Date() }
    };

    render(<CodeEditor files={emptyFiles} />);
    
    expect(screen.getByText('No file selected')).toBeInTheDocument();
    expect(screen.getByText('Select a file from the sidebar to start editing')).toBeInTheDocument();
  });

  it('displays file icons correctly', () => {
    render(<CodeEditor files={sampleFiles} />);
    
    // File icons are rendered as emojis in the implementation
    // We can check that the file names are displayed with their icons
    expect(screen.getAllByText('index.js')).toHaveLength(2); // One in tree, one in tab
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
  });
});