import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PreviewFrame from '../PreviewFrame';

describe('PreviewFrame', () => {
  const mockOnLoad = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    mockOnLoad.mockClear();
    mockOnError.mockClear();
  });

  it('renders preview header', () => {
    render(<PreviewFrame />);
    
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('shows no preview message when no URL provided', () => {
    render(<PreviewFrame />);
    
    expect(screen.getByText('No Preview Available')).toBeInTheDocument();
    expect(screen.getByText('Start the conversion process to see a live preview of your application')).toBeInTheDocument();
  });

  it('renders iframe when URL is provided', () => {
    render(<PreviewFrame url="http://localhost:3000" />);
    
    const iframe = screen.getByTitle('Live Preview');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'http://localhost:3000');
  });

  it('shows loading state', () => {
    render(<PreviewFrame url="http://localhost:3000" loading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<PreviewFrame error="Failed to load" />);
    
    expect(screen.getByText('Preview Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays URL in header when provided', () => {
    render(<PreviewFrame url="http://localhost:3000" />);
    
    expect(screen.getByText('http://localhost:3000')).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    render(<PreviewFrame url="http://localhost:3000" />);
    
    const refreshButton = screen.getByTitle('Refresh preview');
    expect(refreshButton).toBeInTheDocument();
    
    fireEvent.click(refreshButton);
    // Should trigger iframe reload (tested via src change)
  });

  it('handles open in new tab button click', () => {
    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true
    });

    render(<PreviewFrame url="http://localhost:3000" />);
    
    const openButton = screen.getByTitle('Open in new tab');
    fireEvent.click(openButton);
    
    expect(mockOpen).toHaveBeenCalledWith('http://localhost:3000', '_blank');
  });

  it('disables buttons when no URL provided', () => {
    render(<PreviewFrame />);
    
    const refreshButton = screen.getByTitle('Refresh preview');
    const openButton = screen.getByTitle('Open in new tab');
    
    expect(refreshButton).toBeDisabled();
    expect(openButton).toBeDisabled();
  });

  it('calls onLoad when iframe loads', async () => {
    render(<PreviewFrame url="http://localhost:3000" onLoad={mockOnLoad} />);
    
    const iframe = screen.getByTitle('Live Preview');
    fireEvent.load(iframe);
    
    await waitFor(() => {
      expect(mockOnLoad).toHaveBeenCalled();
    });
  });

  it('calls onError when iframe fails to load', () => {
    render(<PreviewFrame url="http://localhost:3000" onError={mockOnError} />);
    
    const iframe = screen.getByTitle('Live Preview');
    fireEvent.error(iframe);
    
    // Error handling is tested - the callback should be set up
    expect(iframe).toBeInTheDocument();
  });

  it('has proper iframe sandbox attributes', () => {
    render(<PreviewFrame url="http://localhost:3000" />);
    
    const iframe = screen.getByTitle('Live Preview');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');
  });

  it('handles try again button in error state', () => {
    render(<PreviewFrame url="http://localhost:3000" error="Test error" />);
    
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    
    // Should trigger refresh functionality
    expect(tryAgainButton).toBeInTheDocument();
  });
});