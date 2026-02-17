"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
  id: string;
  forceDarkMode?: boolean;
}

export function MermaidRenderer({
  chart,
  id,
  forceDarkMode,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Detect initial dark mode and listen for changes
  useEffect(() => {
    const updateTheme = () => {
      if (typeof forceDarkMode === "boolean") {
        setIsDarkMode(forceDarkMode);
        return;
      }
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    // Set initial theme
    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [forceDarkMode]);

  useEffect(() => {
    let cancelled = false;

    const renderChart = async () => {
      if (!chart || !containerRef.current) return;

      try {
        // Initialize mermaid with current theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "inherit",
        });

        // Generate unique ID for this render
        const uniqueId = `mermaid-${id}-${Date.now()}`;

        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);

        // Only update if component hasn't been unmounted
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          setError(errorMessage);
          setSvg("");
        }
      }
    };

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, id, isDarkMode]);

  if (error) {
    return (
      <div className="my-6 flex justify-center" id={`mermaid-container-${id}`}>
        <pre className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          Invalid Mermaid syntax:\n{error}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={`mermaid-container-${id}`}
      className="my-6 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
