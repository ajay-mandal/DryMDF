import type { PdfOptions } from "@/types/pdf";

export interface RecentDocument {
  id: string;
  name: string;
  folder: string;
}

export interface DesktopDocument {
  id: string;
  content: string;
  name: string;
  folder: string;
  revision: string;
}

export type DiskDocument =
  | { status: "missing" }
  | { status: "available"; document: DesktopDocument };

declare global {
  interface Window {
    drymdfDesktop?: {
      printPdf: (html: string, options: PdfOptions) => Promise<ArrayBuffer>;
      openMarkdown: (file: File) => Promise<DesktopDocument>;
      chooseMarkdown: () => Promise<DesktopDocument | null>;
      chooseWorkspaceFiles: (
        multiple: boolean,
        legacy?: { id: string; filename: string },
      ) => Promise<DesktopDocument[]>;
      checkWorkspaceFile: (id: string) => Promise<DiskDocument>;
      locateWorkspaceFile: (id: string) => Promise<DesktopDocument | null>;
      saveWorkspaceFile: (
        id: string,
        revision: string,
        content: string,
      ) => Promise<DiskDocument | { status: "saved"; revision: string }>;
      openNotificationSettings: () => Promise<void>;
      listRecents: () => Promise<RecentDocument[]>;
      reopenMarkdown: (id: string) => Promise<DesktopDocument>;
      readImage: (id: string, source: string) => Promise<string | null>;
      saveDocument: (
        filename: string,
        extension: ".pdf" | ".html" | ".md",
        data: string | ArrayBuffer,
      ) => Promise<boolean>;
      notify: (type: "test" | "export") => Promise<boolean>;
    };
  }
}

const exportNotificationsKey = "drymdf-export-notifications";
const restoreSessionKey = "drymdf-restore-session";

export function restoreDesktopSession() {
  return localStorage.getItem(restoreSessionKey) !== "off";
}

export function setRestoreDesktopSession(restore: boolean) {
  localStorage.setItem(restoreSessionKey, restore ? "on" : "off");
}

export function hasExportNotificationPreference() {
  const preference = localStorage.getItem(exportNotificationsKey);
  return preference === "on" || preference === "off";
}

export function exportNotificationsEnabled() {
  return localStorage.getItem(exportNotificationsKey) === "on";
}

export function setExportNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(exportNotificationsKey, enabled ? "on" : "off");
}

export function isDesktop() {
  return typeof window !== "undefined" && Boolean(window.drymdfDesktop);
}

export async function resolveDesktopImages(html: string, documentId?: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  await Promise.all(
    Array.from(doc.querySelectorAll("img"), async (image) => {
      const source = image.getAttribute("src");
      const resolved =
        source && documentId
          ? await window.drymdfDesktop?.readImage(documentId, source)
          : null;
      if (resolved) {
        image.src = resolved;
        return;
      }

      const placeholder = doc.createElement("span");
      placeholder.textContent = image.alt
        ? `[Image unavailable: ${image.alt}]`
        : "[Image unavailable]";
      image.replaceWith(placeholder);
    }),
  );
  return doc.body.innerHTML;
}

export async function renderDesktopHtml(
  markdown: string,
  documentId?: string,
): Promise<string> {
  const { parseMarkdown, extractMermaidFromHtml } =
    await import("@/lib/markdown/parser");
  const html = await resolveDesktopImages(
    await parseMarkdown(markdown, true),
    documentId,
  );
  const diagrams = extractMermaidFromHtml(html);
  if (diagrams.length === 0) return html;

  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const { id, code } of diagrams) {
    const placeholder = doc.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!placeholder) continue;
    placeholder.classList.add("mermaid");
    try {
      const { svg } = await mermaid.render(
        `print-${crypto.randomUUID()}`,
        code,
      );
      placeholder.innerHTML = svg;
    } catch {
      placeholder.textContent = `Invalid Mermaid diagram:\n${code}`;
    }
    placeholder.removeAttribute("data-chart");
  }
  return doc.body.innerHTML;
}

export async function renderDesktopPdf(
  markdown: string,
  options: PdfOptions,
  documentId?: string,
) {
  const html = await renderDesktopHtml(markdown, documentId);
  const bytes = await window.drymdfDesktop!.printPdf(html, options);
  return new Blob([bytes], { type: "application/pdf" });
}
