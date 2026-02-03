"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEditorStore } from "@/stores/editor-store";

export function MarkdownEditor() {
  const { content, setContent, settings } = useEditorStore();

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
    },
    [setContent],
  );

  return (
    <div className="h-full w-full overflow-hidden border-r border-slate-200 dark:border-slate-700">
      <div className="h-full">
        <CodeMirror
          value={content}
          height="100%"
          theme={settings.theme === "dark" ? oneDark : "light"}
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
