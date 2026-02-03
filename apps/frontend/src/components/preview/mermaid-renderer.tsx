"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
  id: string;
}

export function MermaidRenderer({ chart, id }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "inherit",
    });

    const renderChart = async () => {
      if (containerRef.current && chart) {
        try {
          const { svg } = await mermaid.render(`mermaid-${id}`, chart);
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error("Mermaid render error:", error);
          containerRef.current.innerHTML = `<pre class="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded">Invalid Mermaid syntax:\n${error instanceof Error ? error.message : "Unknown error"}</pre>`;
        }
      }
    };

    renderChart();
  }, [chart, id]);

  return <div ref={containerRef} className="mermaid-container my-4" />;
}
