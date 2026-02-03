import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

/**
 * Parse markdown to HTML with GFM, math, and code highlighting support
 */
export async function parseMarkdown(content: string): Promise<string> {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(content);

    return String(result);
  } catch (error) {
    console.error("Markdown parsing error:", error);
    return `<pre class="error">Error parsing markdown: ${error instanceof Error ? error.message : "Unknown error"}</pre>`;
  }
}

/**
 * Extract Mermaid diagram code blocks from markdown
 */
export function extractMermaidDiagrams(
  markdown: string,
): Array<{ id: string; code: string }> {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const diagrams: Array<{ id: string; code: string }> = [];
  let match;
  let index = 0;

  while ((match = mermaidRegex.exec(markdown)) !== null) {
    diagrams.push({
      id: `mermaid-${index++}`,
      code: match[1].trim(),
    });
  }

  return diagrams;
}

/**
 * Replace Mermaid code blocks with placeholder divs for rendering
 */
export function replaceMermaidWithPlaceholders(html: string): string {
  // This will be replaced by actual Mermaid rendering on the client
  return html.replace(
    /<code class="language-mermaid">([\s\S]*?)<\/code>/g,
    (_, code) =>
      `<div class="mermaid-diagram" data-diagram="${encodeURIComponent(code.trim())}"></div>`,
  );
}
