export function getDefaultFooter(
  alignment: "left" | "center" | "right" = "center",
  showTotalPages: boolean = true,
): string {
  const justifyContent =
    alignment === "left"
      ? "flex-start"
      : alignment === "right"
        ? "flex-end"
        : "center";

  return `
      <div style="font-size: 10px; width: 100%; padding: 0 20px; display: flex; justify-content: ${justifyContent}; color: #64748b;">
        <span>
          <span class="pageNumber"></span>${showTotalPages ? ' / <span class="totalPages"></span>' : ""}
        </span>
      </div>
    `;
}

export function getBaseStyles(
  pageColor: string = "#ffffff",
  autoTextContrast: boolean = true,
  margins?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  },
): string {
  const normalizedPageColor = normalizeHexColor(pageColor);
  const resolvedMargins = {
    top: margins?.top || "20mm",
    right: margins?.right || "20mm",
    bottom: margins?.bottom || "20mm",
    left: margins?.left || "20mm",
  };
  const textColor = autoTextContrast
    ? getContrastTextColor(normalizedPageColor)
    : "#24292f";
  const mutedTextColor = autoTextContrast
    ? getMutedTextColor(normalizedPageColor)
    : "#57606a";

  return `
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: ${normalizedPageColor};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      @page {
        background: ${normalizedPageColor};
        margin: ${resolvedMargins.top} ${resolvedMargins.right} ${resolvedMargins.bottom} ${resolvedMargins.left};
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background: ${normalizedPageColor};
        z-index: 0;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${textColor};
        padding: 0;
        max-width: 100%;
        background: transparent;
        position: relative;
      }

      .pdf-page-content {
        background: transparent;
        padding: 0;
        position: relative;
        z-index: 1;
        min-height: 100%;
      }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }

      h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      h5 { font-size: 0.875em; }
      h6 { font-size: 0.85em; color: ${mutedTextColor}; }

      p {
        margin-top: 0;
        margin-bottom: 16px;
      }

      pre {
        background: #f6f8fa;
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        border: 1px solid #d0d7de;
        margin-bottom: 16px;
        font-size: 85%;
        line-height: 1.45;
      }

      code {
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace;
        font-size: 85%;
        background: rgba(175, 184, 193, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 6px;
      }

      pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
        display: block;
        overflow-x: auto;
      }

      /* Highlight.js Syntax Highlighting */
      .hljs {
        display: block;
        overflow-x: auto;
        padding: 0.5em;
        color: #24292f;
        background: #f6f8fa;
      }

      .hljs-doctag,
      .hljs-keyword,
      .hljs-meta .hljs-keyword,
      .hljs-template-tag,
      .hljs-template-variable,
      .hljs-type,
      .hljs-variable.language_ {
        color: #d73a49;
      }

      .hljs-title,
      .hljs-title.class_,
      .hljs-title.class_.inherited__,
      .hljs-title.function_ {
        color: #6f42c1;
      }

      .hljs-attr,
      .hljs-attribute,
      .hljs-literal,
      .hljs-meta,
      .hljs-number,
      .hljs-operator,
      .hljs-selector-attr,
      .hljs-selector-class,
      .hljs-selector-id,
      .hljs-variable {
        color: #005cc5;
      }

      .hljs-meta .hljs-string,
      .hljs-regexp,
      .hljs-string {
        color: #032f62;
      }

      .hljs-built_in,
      .hljs-symbol {
        color: #e36209;
      }

      .hljs-code,
      .hljs-comment,
      .hljs-formula {
        color: ${mutedTextColor};
      }

      .hljs-name,
      .hljs-quote,
      .hljs-selector-pseudo,
      .hljs-selector-tag {
        color: #22863a;
      }

      .hljs-subst {
        color: #24292f;
      }

      .hljs-section {
        color: #005cc5;
        font-weight: bold;
      }

      .hljs-bullet {
        color: #735c0f;
      }

      .hljs-emphasis {
        color: #24292f;
        font-style: italic;
      }

      .hljs-strong {
        color: #24292f;
        font-weight: bold;
      }

      .hljs-addition {
        color: #22863a;
        background-color: #f0fff4;
      }

      .hljs-deletion {
        color: #b31d28;
        background-color: #ffeef0;
      }

      blockquote {
        border-left: 4px solid #d0d7de;
        padding-left: 1em;
        margin-left: 0;
        margin-right: 0;
        color: ${mutedTextColor};
      }

      table {
        border-collapse: collapse;
        border-spacing: 0;
        width: 100%;
        margin-top: 0;
        margin-bottom: 16px;
        overflow: auto;
      }

      table th,
      table td {
        border: 1px solid #d0d7de;
        padding: 6px 13px;
      }

      table th {
        background: #f6f8fa;
        font-weight: 600;
      }

      table tr {
        background-color: transparent;
        border-top: 1px solid #d0d7de;
      }

      table tr:nth-child(2n) {
        background-color: #f6f8fa;
      }

      ul, ol {
        padding-left: 2em;
        margin-top: 0;
        margin-bottom: 16px;
      }

      li {
        margin: 0.25em 0;
      }

      li + li {
        margin-top: 0.25em;
      }

      a {
        color: #0969da;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      img {
        max-width: 100%;
        height: auto;
        box-sizing: content-box;
        background-color: transparent;
      }

      hr {
        border: none;
        border-top: 1px solid #d0d7de;
        margin: 24px 0;
        height: 0.25em;
        padding: 0;
        background-color: #d0d7de;
      }

      .mermaid {
        text-align: center;
        margin: 2em 0;
        page-break-inside: avoid;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
      }

      /* KaTeX Math */
      .katex-display {
        margin: 1em 0;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .katex {
        font-size: 1.1em;
      }
    `;
}

function getContrastTextColor(pageColor: string): string {
  const normalized = pageColor.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "#24292f";
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance < 0.5 ? "#e2e8f0" : "#24292f";
}

function getMutedTextColor(pageColor: string): string {
  const normalized = pageColor.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "#57606a";
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance < 0.5 ? "#94a3b8" : "#57606a";
}

function normalizeHexColor(color: string): string {
  const normalized = color.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "#ffffff";
  }

  return `#${normalized.toLowerCase()}`;
}
