'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SplitPaneLayoutProps } from './types';

const SplitPaneLayout: React.FC<SplitPaneLayoutProps> = ({
  leftPane,
  rightPane,
  defaultSplit = 50,
  minSize = 20,
  maxSize = 80,
  split = 'vertical',
  onSplitChange
}) => {
  const [splitPosition, setSplitPosition] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    let newPosition: number;
    
    if (split === 'vertical') {
      const x = e.clientX - rect.left;
      newPosition = (x / rect.width) * 100;
    } else {
      const y = e.clientY - rect.top;
      newPosition = (y / rect.height) * 100;
    }

    // Clamp the position within min/max bounds
    newPosition = Math.max(minSize, Math.min(maxSize, newPosition));
    
    setSplitPosition(newPosition);
    onSplitChange?.(newPosition);
  }, [isDragging, split, minSize, maxSize, onSplitChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = split === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, split]);

  const containerClasses = `
    flex h-full w-full relative
    ${split === 'vertical' ? 'flex-row' : 'flex-col'}
  `;

  const leftPaneClasses = `
    ${split === 'vertical' ? 'h-full' : 'w-full'}
    overflow-hidden
  `;

  const rightPaneClasses = `
    ${split === 'vertical' ? 'h-full' : 'w-full'}
    overflow-hidden
  `;

  const resizerClasses = `
    ${split === 'vertical' 
      ? 'w-1 h-full cursor-col-resize hover:bg-blue-500' 
      : 'h-1 w-full cursor-row-resize hover:bg-blue-500'
    }
    bg-gray-300 flex-shrink-0 transition-colors duration-200
    ${isDragging ? 'bg-blue-500' : ''}
  `;

  const leftPaneStyle = split === 'vertical' 
    ? { width: `${splitPosition}%` }
    : { height: `${splitPosition}%` };

  const rightPaneStyle = split === 'vertical'
    ? { width: `${100 - splitPosition}%` }
    : { height: `${100 - splitPosition}%` };

  return (
    <div ref={containerRef} className={containerClasses}>
      <div className={leftPaneClasses} style={leftPaneStyle}>
        {leftPane}
      </div>
      
      <div
        className={resizerClasses}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation={split === 'vertical' ? 'vertical' : 'horizontal'}
        aria-valuenow={splitPosition}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
      />
      
      <div className={rightPaneClasses} style={rightPaneStyle}>
        {rightPane}
      </div>
    </div>
  );
};

export default SplitPaneLayout;