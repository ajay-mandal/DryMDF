import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

/**
 * Parse markdown to HTML with GFM, math, and code highlighting support
 */
export async function parseMarkdown(content: string): Promise<string> {
  try {
    // Extract Mermaid diagrams and replace with placeholders
    const mermaidDiagrams: string[] = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const processedMarkdown = content.replace(mermaidRegex, (_, diagram) => {
      const index = mermaidDiagrams.length;
      mermaidDiagrams.push(diagram.trim());
      return `<!--MERMAID_${index}-->`;
    });

    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeKatex, {
        strict: false,
        trust: true,
        throwOnError: false,
      })
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(processedMarkdown);

    let html = String(result);

    // Replace Mermaid placeholders with data-attribute divs for client-side rendering
    mermaidDiagrams.forEach((diagram, index) => {
      const placeholder = `<!--MERMAID_${index}-->`;
      const mermaidDiv = `<div class="mermaid-diagram" data-chart="${encodeURIComponent(diagram)}" data-id="${index}"></div>`;
      html = html.replace(placeholder, mermaidDiv);
    });

    return html;
  } catch (error) {
    console.error("Markdown parsing error:", error);
    return `<pre class="error">Error parsing markdown: ${error instanceof Error ? error.message : "Unknown error"}</pre>`;
  }
}

/**
 * Extract Mermaid diagram data from parsed HTML
 */
export function extractMermaidFromHtml(
  html: string,
): Array<{ id: string; code: string }> {
  const diagrams: Array<{ id: string; code: string }> = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const mermaidElements = doc.querySelectorAll<HTMLElement>(".mermaid-diagram");

  mermaidElements.forEach((element) => {
    const chart = element.getAttribute("data-chart");
    const id = element.getAttribute("data-id");
    if (chart && id) {
      diagrams.push({
        id,
        code: decodeURIComponent(chart),
      });
    }
  });

  return diagrams;
}
