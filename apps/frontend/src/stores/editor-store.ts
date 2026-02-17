import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorSettings } from "@/types/editor";

interface EditorStore {
  content: string;
  settings: EditorSettings;

  setContent: (content: string) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  resetContent: () => void;
}

const defaultSettings: EditorSettings = {
  theme: "light",
  fontSize: 14,
  lineHeight: 1.6,
  wordWrap: true,
  showLineNumbers: true,
  autoSave: true,
};

const defaultContent = `# Welcome to DryMDF

Write your **Markdown** here and see it rendered in real-time!

## Features

- ✨ Live preview
- 📄 Export to PDF
- 🎨 Mermaid diagram support
- 💾 Auto-save
- 🌙 Dark mode

## Example Code

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
\`\`\`

Start typing to begin!
`;

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      content: defaultContent,
      settings: defaultSettings,

      setContent: (content) => set({ content }),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetContent: () => set({ content: defaultContent }),
    }),
    {
      name: "drymdf-editor-storage",
      partialize: (state) => ({
        content: state.content,
        settings: state.settings,
      }),
    },
  ),
);
