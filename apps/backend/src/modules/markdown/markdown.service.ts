import { Injectable } from "@nestjs/common";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

@Injectable()
export class MarkdownService {
  async parse(markdown: string): Promise<string> {
    // Extract Mermaid diagrams and replace with placeholders
    const mermaidDiagrams: string[] = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const processedMarkdown = markdown.replace(mermaidRegex, (_, diagram) => {
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

    // Replace Mermaid placeholders with actual Mermaid div elements
    mermaidDiagrams.forEach((diagram, index) => {
      const placeholder = `<!--MERMAID_${index}-->`;
      const mermaidDiv = `<div class="mermaid">\n${diagram}\n</div>`;
      html = html.replace(placeholder, mermaidDiv);
    });

    return html;
  }
}
