import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectImportContainer } from '@/components/import/ProjectImportContainer';

// Mock the child components
vi.mock('@/components/import/GitHubUrlInput', () => ({
  GitHubUrlInput: ({ onImportStart, error }: any) => (
    <div data-testid="github-url-input">
      <button onClick={() => onImportStart('https://github.com/test/repo')}>
        Start Import
      </button>
      {error && <div data-testid="error">{error}</div>}
    </div>
  )
}));

vi.mock('@/components/import/ImportProgress', () => ({
  ImportProgress: () => <div data-testid="import-progress">Importing...</div>
}));

vi.mock('@/components/import/TechStackDisplay', () => ({
  TechStackDisplay: ({ onStartOver }: any) => (
    <div data-testid="tech-stack-display">
      <button onClick={onStartOver}>Start Over</button>
    </div>
  )
}));

// Mock fetch
global.fetch = vi.fn();

describe('ProjectImportContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders GitHubUrlInput component initially', () => {
    render(<ProjectImportContainer />);
    
    expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
    expect(screen.queryByTestId('import-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tech-stack-display')).not.toBeInTheDocument();
  });

  it('shows ImportProgress when import starts', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          projectId: 'test-123',
          structure: {},
          detectedTechnologies: { language: 'javascript', additional: {} },
          size: 1024,
          status: 'success'
        }
      })
    } as Response);

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);
    
    expect(screen.getByTestId('import-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('github-url-input')).not.toBeInTheDocument();
  });

  it('shows TechStackDisplay when import completes successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          projectId: 'test-123',
          structure: {},
          detectedTechnologies: { language: 'javascript', additional: {} },
          size: 1024,
          status: 'success'
        }
      })
    } as Response);

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('tech-stack-display')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('import-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-url-input')).not.toBeInTheDocument();
  });

  it('shows error and returns to input when import fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Repository not found'
      })
    } as Response);

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Repository not found')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('import-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tech-stack-display')).not.toBeInTheDocument();
  });

  it('handles network errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('resets state when starting over', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          projectId: 'test-123',
          structure: {},
          detectedTechnologies: { language: 'javascript', additional: {} },
          size: 1024,
          status: 'success'
        }
      })
    } as Response);

    render(<ProjectImportContainer />);
    
    // Start import
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByTestId('tech-stack-display')).toBeInTheDocument();
    });

    // Click start over
    const startOverButton = screen.getByText('Start Over');
    fireEvent.click(startOverButton);

    // Should be back to input
    expect(screen.getByTestId('github-url-input')).toBeInTheDocument();
    expect(screen.queryByTestId('tech-stack-display')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error')).not.toBeInTheDocument();
  });

  it('sends correct data to import API', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          projectId: 'test-123',
          structure: {},
          detectedTechnologies: { language: 'javascript', additional: {} },
          size: 1024,
          status: 'success'
        }
      })
    } as Response);

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: 'https://github.com/test/repo', 
        accessToken: undefined 
      }),
    });
  });

  it('handles unknown errors with generic message', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce('Unknown error');

    render(<ProjectImportContainer />);
    
    const startButton = screen.getByText('Start Import');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
    });
  });
});