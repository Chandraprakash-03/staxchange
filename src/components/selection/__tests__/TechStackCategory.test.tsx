import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechStackCategory, TechOption } from '../TechStackCategory';

const mockOptions: TechOption[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    description: 'Dynamic programming language',
    icon: '🟨',
    popular: true,
    compatibility: ['react', 'vue'],
    incompatible: []
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'JavaScript with types',
    icon: '🔷',
    compatibility: ['react', 'angular'],
    incompatible: []
  },
  {
    id: 'python',
    name: 'Python',
    description: 'High-level language',
    icon: '🐍',
    compatibility: ['django'],
    incompatible: ['react']
  }
];

describe('TechStackCategory', () => {
  const defaultProps = {
    title: 'Programming Language',
    description: 'Select a programming language',
    options: mockOptions,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and description', () => {
    render(<TechStackCategory {...defaultProps} />);
    
    expect(screen.getByText('Programming Language')).toBeInTheDocument();
    expect(screen.getByText('Select a programming language')).toBeInTheDocument();
  });

  it('renders required indicator when required is true', () => {
    render(<TechStackCategory {...defaultProps} required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<TechStackCategory {...defaultProps} />);
    
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('shows popular badge for popular options', () => {
    render(<TechStackCategory {...defaultProps} />);
    
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = vi.fn();
    render(<TechStackCategory {...defaultProps} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('JavaScript'));
    
    expect(onSelect).toHaveBeenCalledWith('javascript');
  });

  it('highlights selected option', () => {
    render(<TechStackCategory {...defaultProps} selectedValue="typescript" />);
    
    const typescriptButton = screen.getByText('TypeScript').closest('button');
    expect(typescriptButton).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('disables all options when disabled is true', () => {
    render(<TechStackCategory {...defaultProps} disabled />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows checkmark icon for selected option', () => {
    render(<TechStackCategory {...defaultProps} selectedValue="javascript" />);
    
    const javascriptButton = screen.getByText('JavaScript').closest('button');
    const checkmark = javascriptButton?.querySelector('svg');
    expect(checkmark).toBeInTheDocument();
  });

  it('renders option descriptions', () => {
    render(<TechStackCategory {...defaultProps} />);
    
    expect(screen.getByText('Dynamic programming language')).toBeInTheDocument();
    expect(screen.getByText('JavaScript with types')).toBeInTheDocument();
    expect(screen.getByText('High-level language')).toBeInTheDocument();
  });

  it('renders option icons', () => {
    render(<TechStackCategory {...defaultProps} />);
    
    expect(screen.getByText('🟨')).toBeInTheDocument();
    expect(screen.getByText('🔷')).toBeInTheDocument();
    expect(screen.getByText('🐍')).toBeInTheDocument();
  });
});