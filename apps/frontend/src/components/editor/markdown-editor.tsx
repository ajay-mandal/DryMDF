"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEditorStore } from "@/stores/editor-store";

export function MarkdownEditor() {
  const { content, setContent, settings } = useEditorStore();
  const { theme } = useTheme();
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
          value={content}
          height="100%"
          theme={theme === "dark" ? oneDark : "light"}
          extensions={[markdown()]}
          onChange={handleChange}
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: settings.showLineNumbers,
            foldGutter: true,
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
