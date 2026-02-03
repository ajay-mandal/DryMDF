export interface EditorSettings {
  theme: "light" | "dark";
  fontSize: number;
  lineHeight: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  autoSave: boolean;
}

export interface EditorState {
  content: string;
  cursorPosition: number;
  selection?: {
    start: number;
    end: number;
  };
}
