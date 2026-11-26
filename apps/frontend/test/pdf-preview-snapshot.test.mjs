import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capturePdfPreview,
  isPdfPreviewStale,
} from "../src/components/preview/pdf-preview-snapshot.ts";

const source = {
  markdown: "# Title\n",
  documentId: "file-1",
  sourceKey: "workspace-1:file-1:0",
  options: { orientation: "portrait", margins: { top: "20mm" } },
};

test("raw Markdown and source identity independently invalidate a preview", () => {
  const snapshot = capturePdfPreview(source);
  assert.equal(isPdfPreviewStale(snapshot, source), false);
  for (const edit of [
    { markdown: "# Title\n\n" },
    { documentId: "file-2" },
    { sourceKey: "workspace-1:file-1:1" },
  ]) {
    assert.equal(isPdfPreviewStale(snapshot, { ...source, ...edit }), true);
  }
});

test("settings changes leave the captured print options intact until refresh", () => {
  const current = structuredClone(source);
  const snapshot = capturePdfPreview(current);
  current.options.orientation = "landscape";
  assert.equal(isPdfPreviewStale(snapshot, current), true);
  current.options.orientation = "portrait";
  current.options.margins.top = "12mm";
  assert.equal(isPdfPreviewStale(snapshot, current), true);
  assert.equal(snapshot.options.margins.top, "20mm");
  assert.equal(isPdfPreviewStale(capturePdfPreview(current), current), false);
});
