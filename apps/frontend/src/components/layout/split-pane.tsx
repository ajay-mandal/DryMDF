"use client";

import { useState } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

    // Constrain between 20% and 80%
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  return (
    <div
      className="flex h-full w-full relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Pane */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className="w-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 dark:hover:bg-blue-600 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* Right Pane */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {right}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 cursor-col-resize z-50" />
      )}
    </div>
  );
}
