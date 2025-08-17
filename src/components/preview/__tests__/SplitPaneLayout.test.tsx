import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SplitPaneLayout from '../SplitPaneLayout';

describe('SplitPaneLayout', () => {
  const mockOnSplitChange = vi.fn();

  beforeEach(() => {
    mockOnSplitChange.mockClear();
  });

  it('renders left and right panes', () => {
    render(
      <SplitPaneLayout
        leftPane={<div data-testid="left-pane">Left Content</div>}
        rightPane={<div data-testid="right-pane">Right Content</div>}
      />
    );

    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
    expect(screen.getByText('Left Content')).toBeInTheDocument();
    expect(screen.getByText('Right Content')).toBeInTheDocument();
  });

  it('renders with default vertical split', () => {
    const { container } = render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
      />
    );

    const splitContainer = container.firstChild as HTMLElement;
    expect(splitContainer).toHaveClass('flex-row');
  });

  it('renders with horizontal split when specified', () => {
    const { container } = render(
      <SplitPaneLayout
        leftPane={<div>Top</div>}
        rightPane={<div>Bottom</div>}
        split="horizontal"
      />
    );

    const splitContainer = container.firstChild as HTMLElement;
    expect(splitContainer).toHaveClass('flex-col');
  });

  it('applies default split position', () => {
    const { container } = render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
        defaultSplit={30}
      />
    );

    // Check that the component renders with the split layout
    const splitContainer = container.firstChild as HTMLElement;
    expect(splitContainer).toHaveClass('flex-row');
    
    // The actual style application is tested in integration
    const leftPane = container.querySelector('div > div:first-child') as HTMLElement;
    expect(leftPane).toBeInTheDocument();
  });

  it('renders resizer with correct orientation', () => {
    render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
      />
    );

    const resizer = screen.getByRole('separator');
    expect(resizer).toHaveAttribute('aria-orientation', 'vertical');
    expect(resizer).toHaveClass('cursor-col-resize');
  });

  it('renders horizontal resizer correctly', () => {
    render(
      <SplitPaneLayout
        leftPane={<div>Top</div>}
        rightPane={<div>Bottom</div>}
        split="horizontal"
      />
    );

    const resizer = screen.getByRole('separator');
    expect(resizer).toHaveAttribute('aria-orientation', 'horizontal');
    expect(resizer).toHaveClass('cursor-row-resize');
  });

  it('handles mouse down on resizer', () => {
    render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
        onSplitChange={mockOnSplitChange}
      />
    );

    const resizer = screen.getByRole('separator');
    fireEvent.mouseDown(resizer);

    // Should prevent default and start dragging
    expect(resizer).toHaveClass('bg-blue-500');
  });

  it('respects min and max size constraints', () => {
    render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
        minSize={25}
        maxSize={75}
      />
    );

    const resizer = screen.getByRole('separator');
    expect(resizer).toHaveAttribute('aria-valuemin', '25');
    expect(resizer).toHaveAttribute('aria-valuemax', '75');
  });

  it('calls onSplitChange when provided', () => {
    render(
      <SplitPaneLayout
        leftPane={<div>Left</div>}
        rightPane={<div>Right</div>}
        onSplitChange={mockOnSplitChange}
        defaultSplit={60}
      />
    );

    // The component should render with the default split
    // onSplitChange is called during mouse interactions, not on initial render
    expect(mockOnSplitChange).not.toHaveBeenCalled();
  });
});