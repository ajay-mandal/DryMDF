"use client";

import { useState, useRef, useEffect } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isMobileLayout || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // Constrain between 25% and 75%
      if (newLeftWidth >= 25 && newLeftWidth <= 75) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging && !isMobileLayout) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, isMobileLayout]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full min-h-0 w-full ${isMobileLayout ? "flex flex-col" : "flex"}`}
    >
      {/* Left Pane */}
      <div
        className="h-full min-h-0 overflow-hidden"
        style={
          isMobileLayout
            ? { height: "50%", width: "100%" }
            : { width: `calc(${leftWidth}% - 4px)` }
        }
      >
        {left}
      </div>

      {/* Divider with gap */}
      {!isMobileLayout && (
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: "8px" }}
        >
          <div
            className="w-1 h-full bg-slate-300 dark:bg-slate-600 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize transition-colors active:bg-blue-600 dark:active:bg-blue-500"
            onMouseDown={handleMouseDown}
          />
        </div>
      )}

      {/* Right Pane */}
      <div
        className="h-full min-h-0 overflow-hidden"
        style={
          isMobileLayout
            ? { height: "50%", width: "100%" }
            : { width: `calc(${100 - leftWidth}% - 4px)` }
        }
      >
        {right}
      </div>

      {/* Drag overlay */}
      {isDragging && !isMobileLayout && (
        <div className="fixed inset-0 cursor-col-resize z-50" />
      )}
    </div>
  );
}
