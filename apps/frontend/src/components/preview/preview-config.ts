export const PAGE_DIMENSIONS = {
  a3: {
    width: 1123,
    height: 1587,
    label: 'A3 (11.69" × 16.54")',
  },
  a4: {
    width: 794,
    height: 1123,
    label: 'A4 (8.27" × 11.69")',
  },
  legal: {
    width: 816,
    height: 1344,
    label: 'Legal (8.5" × 14")',
  },
} as const;

export type PreviewPageFormat = keyof typeof PAGE_DIMENSIONS;

export const DEFAULT_PREVIEW_FORMAT: PreviewPageFormat = "a4";
export const PREVIEW_GAP = 32;
export const PDF_MARGIN_MM = 20;
export const PDF_MARGIN_PX = (PDF_MARGIN_MM * 96) / 25.4;
export const BODY_PADDING_PX = 20;

export const A4_CONTENT_AREA_HEIGHT =
  PAGE_DIMENSIONS.a4.height - (PDF_MARGIN_PX + BODY_PADDING_PX) * 2;
