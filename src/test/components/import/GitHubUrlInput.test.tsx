import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitHubUrlInput } from '@/components/import/GitHubUrlInput';

// Mock fetch
global.fetch = vi.fn();

describe('GitHubUrlInput', () => {
  const mockOnImportStart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input form correctly', () => {
    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/github.com\/username\/repository/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import repository/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid URL format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          isValid: false,
          errors: [{ field: 'url', message: 'Invalid GitHub URL format', code: 'INVALID_FORMAT' }],
          warnings: []
        }
      })
    } as Response);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'invalid-url' } });

    await waitFor(() => {
      expect(screen.getByText(/invalid github url format/i)).toBeInTheDocument();
    });
  });

  it('shows validation success for valid URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          isValid: true,
          errors: [],
          warnings: []
        }
      })
    } as Response);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'https://github.com/user/repo' } });

    await waitFor(() => {
      expect(screen.getByText(/repository is valid and accessible/i)).toBeInTheDocument();
    });
  });

  it('shows access token input when authentication is required', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          isValid: false,
          errors: [{ field: 'authentication', message: 'Repository requires authentication', code: 'AUTH_REQUIRED' }],
          warnings: []
        }
      })
    } as Response);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'https://github.com/user/private-repo' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/github access token/i)).toBeInTheDocument();
    });
  });

  it('calls onImportStart when form is submitted with valid URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          isValid: true,
          errors: [],
          warnings: []
        }
      })
    } as Response);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'https://github.com/user/repo' } });

    await waitFor(() => {
      expect(screen.getByText(/repository is valid and accessible/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /import repository/i });
    fireEvent.click(submitButton);

    expect(mockOnImportStart).toHaveBeenCalledWith('https://github.com/user/repo', undefined);
  });

  it('displays error message when provided', () => {
    const errorMessage = 'Import failed due to network error';
    render(<GitHubUrlInput onImportStart={mockOnImportStart} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(/import failed/i)).toBeInTheDocument();
  });

  it('disables submit button when URL is invalid', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          isValid: false,
          errors: [{ field: 'url', message: 'Invalid URL', code: 'INVALID_FORMAT' }],
          warnings: []
        }
      })
    } as Response);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'invalid-url' } });

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /import repository/i });
      expect(submitButton).toBeDisabled();
    });
  });

  it('shows loading state during validation', async () => {
    const mockFetch = vi.mocked(fetch);
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(promise as Promise<Response>);

    render(<GitHubUrlInput onImportStart={mockOnImportStart} />);
    
    const input = screen.getByLabelText(/repository url/i);
    fireEvent.change(input, { target: { value: 'https://github.com/user/repo' } });

    // Should show loading state
    expect(screen.getByText(/validating repository/i)).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        data: {
          isValid: true,
          errors: [],
          warnings: []
        }
      })
    });

    await waitFor(() => {
      expect(screen.queryByText(/validating repository/i)).not.toBeInTheDocument();
    });
  });
});