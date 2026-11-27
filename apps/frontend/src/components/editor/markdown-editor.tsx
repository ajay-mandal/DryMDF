"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import CodeMirror, { lineNumbers } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEditorStore } from "@/stores/editor-store";

const desktopBuild = process.env.NEXT_PUBLIC_DRYMDF_DESKTOP === "1";
const markdownExtension = markdown();
const desktopLineNumbers = lineNumbers({
  formatNumber: (number) => String(number).padStart(2, "0"),
});

export function MarkdownEditor({
  sampleContent,
  editorRef,
}: {
  sampleContent?: string;
  editorRef?: React.Ref<import("@uiw/react-codemirror").ReactCodeMirrorRef>;
}) {
  const { content, setContent, settings } = useEditorStore();
  const { theme, resolvedTheme } = useTheme();
  const appearance = desktopBuild ? resolvedTheme : theme;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use a separate microtask to avoid setState in effect warning
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
    },
    [setContent],
  );

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-full w-full overflow-hidden border-r border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden border-r border-slate-200 dark:border-slate-700">
      <div className="h-full">
        <CodeMirror
          ref={editorRef}
          value={sampleContent ?? content}
          readOnly={sampleContent !== undefined}
          height="100%"
          theme={appearance === "dark" ? oneDark : "light"}
          extensions={
            desktopBuild && settings.showLineNumbers
              ? [markdownExtension, desktopLineNumbers]
              : [markdownExtension]
          }
          onChange={sampleContent === undefined ? handleChange : undefined}
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: !desktopBuild && settings.showLineNumbers,
            foldGutter: !desktopBuild,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
        />
      </div>
    </div>
  );
}
