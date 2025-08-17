import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ImportProgress } from '@/components/import/ImportProgress';

describe('ImportProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the progress component correctly', () => {
    render(<ImportProgress />);
    
    expect(screen.getByText(/importing your repository/i)).toBeInTheDocument();
    expect(screen.getByText(/please wait while we analyze your project/i)).toBeInTheDocument();
  });

  it('shows all progress steps', () => {
    render(<ImportProgress />);
    
    expect(screen.getByText(/validating repository/i)).toBeInTheDocument();
    expect(screen.getByText(/downloading files/i)).toBeInTheDocument();
    expect(screen.getByText(/analyzing structure/i)).toBeInTheDocument();
    expect(screen.getByText(/detecting tech stack/i)).toBeInTheDocument();
    expect(screen.getByText(/import complete/i)).toBeInTheDocument();
  });

  it('starts with first step as active', () => {
    render(<ImportProgress />);
    
    // First step should be active (has "In Progress" text)
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    
    // First step should have active styling (spinning icon)
    const firstStep = screen.getByText(/validating repository/i).closest('div');
    expect(firstStep).toBeInTheDocument();
  });

  it('progresses through steps over time', async () => {
    render(<ImportProgress />);
    
    // Initially, first step is active
    expect(screen.getByText(/validating repository/i)).toBeInTheDocument();
    
    // Advance time by 2 seconds (one step)
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      // First step should be completed, second should be active
      const completeTexts = screen.getAllByText(/complete/i);
      expect(completeTexts.length).toBeGreaterThan(0);
    });
    
    // Advance time by another 2 seconds
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      // More steps should be completed
      const completeTexts = screen.getAllByText(/complete/i);
      expect(completeTexts.length).toBeGreaterThan(1);
    });
  });

  it('shows progress bar that increases over time', async () => {
    render(<ImportProgress />);
    
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    
    // Initially should have some width
    expect(progressBar).toHaveStyle({ width: '0%' });
    
    // Advance time and check progress increases
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(progressBar).toHaveStyle({ width: '20%' });
    });
  });

  it('displays helpful information about the process', () => {
    render(<ImportProgress />);
    
    expect(screen.getByText(/what's happening\?/i)).toBeInTheDocument();
    expect(screen.getByText(/we're securely downloading your repository files/i)).toBeInTheDocument();
    expect(screen.getByText(/our ai is analyzing your project structure/i)).toBeInTheDocument();
    expect(screen.getByText(/this process typically takes 30-60 seconds/i)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(<ImportProgress />);
    
    const cancelButton = screen.getByText(/cancel import/i);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton.tagName).toBe('BUTTON');
  });

  it('shows step descriptions', () => {
    render(<ImportProgress />);
    
    expect(screen.getByText(/checking repository accessibility and permissions/i)).toBeInTheDocument();
    expect(screen.getByText(/cloning repository contents/i)).toBeInTheDocument();
    expect(screen.getByText(/examining project files and dependencies/i)).toBeInTheDocument();
    expect(screen.getByText(/identifying frameworks, languages, and tools/i)).toBeInTheDocument();
    expect(screen.getByText(/preparing results for display/i)).toBeInTheDocument();
  });

  it('completes all steps after sufficient time', async () => {
    render(<ImportProgress />);
    
    // Advance time to complete all steps (5 steps * 2 seconds each)
    vi.advanceTimersByTime(10000);
    
    await waitFor(() => {
      const completeTexts = screen.getAllByText(/complete/i);
      // Should have 5 "Complete" texts (one for each step)
      expect(completeTexts.length).toBe(5);
    });
  });
});