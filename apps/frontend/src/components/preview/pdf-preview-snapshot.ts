import type { PdfOptions } from "../../types/pdf";

interface PdfPreviewSource {
  markdown: string;
  documentId?: string;
  sourceKey: string;
  options: PdfOptions;
}

export function capturePdfPreview(source: PdfPreviewSource): PdfPreviewSource {
  return { ...source, options: structuredClone(source.options) };
}

export function isPdfPreviewStale(
  snapshot: PdfPreviewSource,
  current: PdfPreviewSource,
): boolean {
  return (
    snapshot.markdown !== current.markdown ||
    snapshot.documentId !== current.documentId ||
    snapshot.sourceKey !== current.sourceKey ||
    JSON.stringify(snapshot.options) !== JSON.stringify(current.options)
  );
}
