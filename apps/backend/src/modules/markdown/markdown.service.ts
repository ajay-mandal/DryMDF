import { Injectable } from "@nestjs/common";

@Injectable()
export class MarkdownService {
  /**
   * Lazy-load ESM-only unified plugins using dynamic imports.
   * This is required because unified v11+ is ESM-only while NestJS compiles to CommonJS.
   */
  private async loadUnifiedProcessor() {
    const [
      { unified },
      { default: remarkParse },
      { default: remarkGfm },
      { default: remarkMath },
      { default: remarkRehype },
      { default: rehypeKatex },
      { default: rehypeHighlight },
      { default: rehypeStringify },
    ] = await Promise.all([
      import("unified"),
      import("remark-parse"),
      import("remark-gfm"),
      import("remark-math"),
      import("remark-rehype"),
      import("rehype-katex"),
      import("rehype-highlight"),
      import("rehype-stringify"),
    ]);

    return {
      unified,
      remarkParse,
      remarkGfm,
      remarkMath,
      remarkRehype,
      rehypeKatex,
      rehypeHighlight,
      rehypeStringify,
    };
  }

  async parse(markdown: string): Promise<string> {
    // Extract Mermaid diagrams and replace with placeholders
    const mermaidDiagrams: string[] = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const processedMarkdown = markdown.replace(mermaidRegex, (_, diagram) => {
      const index = mermaidDiagrams.length;
      mermaidDiagrams.push(diagram.trim());
      return `<!--MERMAID_${index}-->`;
    });

    // Load ESM plugins dynamically
    const {
      unified,
      remarkParse,
      remarkGfm,
      remarkMath,
      remarkRehype,
      rehypeKatex,
      rehypeHighlight,
      rehypeStringify,
    } = await this.loadUnifiedProcessor();

    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(processedMarkdown);

    let html = String(result);

    // Replace Mermaid placeholders with actual Mermaid div elements
    mermaidDiagrams.forEach((diagram, index) => {
      const placeholder = `<!--MERMAID_${index}-->`;
      const mermaidDiv = `<div class="mermaid">\n${diagram}\n</div>`;
      html = html.replace(placeholder, mermaidDiv);
    });

    return html;
  }
}
