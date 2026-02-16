"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
  id: string;
}

export function MermaidRenderer({ chart, id }: MermaidRendererProps) {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "inherit",
    });

    const renderChart = async () => {
      const container = document.getElementById(`mermaid-container-${id}`);
      if (!container || !chart) return;

      // Clear the container first
      container.innerHTML = "";

      try {
        // Use a unique ID for each render to avoid caching issues
        const uniqueId = `mermaid-svg-${id}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, chart);

        // Check if container still exists before updating
        const currentContainer = document.getElementById(
          `mermaid-container-${id}`,
        );
        if (currentContainer) {
          currentContainer.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        const currentContainer = document.getElementById(
          `mermaid-container-${id}`,
        );
        if (currentContainer) {
          currentContainer.innerHTML = `<pre class="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded">Invalid Mermaid syntax:\n${errorMessage}</pre>`;
        }
      }
    };

    // Small delay to ensure container is in DOM
    const timer = setTimeout(renderChart, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [chart, id]);

  // This component doesn't render anything directly - it renders into existing containers
  return null;
}
