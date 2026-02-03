import { Injectable } from "@nestjs/common";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

@Injectable()
export class MarkdownService {
  async parse(markdown: string): Promise<string> {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(markdown);

    return String(result);
  }
}
