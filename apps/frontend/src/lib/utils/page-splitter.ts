/**
 * Utility to split HTML content into pages for preview
 * Ensures Mermaid diagrams and large blocks aren't split across pages
 */

interface PageBlock {
  html: string;
  type: "content" | "mermaid";
  height?: number;
  id?: string;
}

interface PageContent {
  blocks: PageBlock[];
  pageNumber: number;
}

/**
 * Split HTML into individual block elements
 */
function parseHTMLBlocks(html: string): PageBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: PageBlock[] = [];

  // Get all top-level elements from body
  Array.from(doc.body.children).forEach((element) => {
    // Check if it's a Mermaid container
    if (element.id && element.id.startsWith("mermaid-container-")) {
      const id = element.id.replace("mermaid-container-", "");
      blocks.push({
        html: element.outerHTML,
        type: "mermaid",
        id,
      });
    } else {
      // Regular content block
      blocks.push({
        html: element.outerHTML,
        type: "content",
      });
    }
  });

  return blocks;
}

/**
 * Calculate approximate height of HTML block
 */
function estimateBlockHeight(
  html: string,
  type: "content" | "mermaid",
): number {
  // Create temporary element to measure height
  const temp = document.createElement("div");
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  temp.style.width = "718px"; // Content width (850 - 132px padding)
  temp.innerHTML = html;

  // Add appropriate classes for accurate measurement
  temp.className = type === "mermaid" ? "mermaid-block" : "content-block";

  document.body.appendChild(temp);
  const height = temp.offsetHeight;
  document.body.removeChild(temp);

  return height;
}

/**
 * Split blocks into pages based on available height
 */
export function splitContentIntoPages(
  html: string,
  pageHeight: number,
  padding: number = 128,
): PageContent[] {
  const availableHeight = pageHeight - padding;
  const blocks = parseHTMLBlocks(html);
  const pages: PageContent[] = [];

  let currentPage: PageContent = { blocks: [], pageNumber: 1 };
  let currentHeight = 0;

  blocks.forEach((block) => {
    const blockHeight = estimateBlockHeight(block.html, block.type);

    // If block is larger than one page
    if (blockHeight > availableHeight) {
      // If current page has content, finish it
      if (currentPage.blocks.length > 0) {
        pages.push(currentPage);
        currentPage = { blocks: [], pageNumber: pages.length + 1 };
        currentHeight = 0;
      }

      // Add large block to its own page (it will overflow but won't split)
      currentPage.blocks.push(block);
      pages.push(currentPage);
      currentPage = { blocks: [], pageNumber: pages.length + 1 };
      currentHeight = 0;
    }
    // If adding this block exceeds page height
    else if (currentHeight + blockHeight > availableHeight) {
      // Save current page
      pages.push(currentPage);
      // Start new page with this block
      currentPage = { blocks: [block], pageNumber: pages.length + 1 };
      currentHeight = blockHeight;
    }
    // Block fits in current page
    else {
      currentPage.blocks.push(block);
      currentHeight += blockHeight;
    }
  });

  // Add last page if it has content
  if (currentPage.blocks.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [{ blocks: [], pageNumber: 1 }];
}

/**
 * Render page blocks to HTML string
 */
export function renderPageBlocks(blocks: PageBlock[]): string {
  return blocks.map((block) => block.html).join("\n");
}
