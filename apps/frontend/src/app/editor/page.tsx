"use client";

import { Header } from "@/components/layout/header";
import { SplitPane } from "@/components/layout/split-pane";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { MarkdownPreview } from "@/components/preview/markdown-preview";

export default function EditorPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex-1 overflow-hidden">
        <SplitPane left={<MarkdownEditor />} right={<MarkdownPreview />} />
      </div>
    </div>
  );
}
