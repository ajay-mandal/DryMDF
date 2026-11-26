import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DesktopDocument } from "@/lib/desktop";
import type { EditorSettings } from "@/types/editor";

export interface Workspace {
  id: string;
  name: string;
  fileIds: string[];
  activeFileId?: string;
  openedAt: number;
}

export interface WorkspaceFile extends Omit<DesktopDocument, "revision"> {
  revision?: string;
  savedContent: string;
  locationVersion?: number;
}

interface Draft {
  content: string;
  filename: string;
  desktopDocumentId?: string;
  desktopDraftEdited?: boolean;
  desktopRevision?: string;
}

interface EditorStore extends Draft {
  settings: EditorSettings;
  workspaces: Workspace[];
  workspaceFiles: Record<string, WorkspaceFile>;
  workspaceId?: string;
  looseDraft?: Draft;

  setContent: (content: string) => void;
  setFilename: (filename: string) => void;
  setDesktopDocument: (
    content: string,
    filename: string,
    id?: string,
    revision?: string,
  ) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  resetContent: () => void;
  addWorkspace: (workspace: Workspace) => void;
  addWorkspaceFiles: (workspaceId: string, files: DesktopDocument[]) => void;
  openWorkspace: (
    workspaceId: string,
    fileId?: string,
    preserveLooseDraft?: boolean,
  ) => void;
  leaveWorkspace: () => void;
  updateWorkspaceFile: (id: string, change: Partial<WorkspaceFile>) => void;
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

const desktopBuild = process.env.NEXT_PUBLIC_DRYMDF_DESKTOP === "1";

const defaultDraft: Draft = {
  content: defaultContent,
  filename: "document",
  desktopDocumentId: undefined,
  desktopDraftEdited: undefined,
  desktopRevision: undefined,
};

function draftState(state: Draft): Draft {
  const {
    content,
    filename,
    desktopDocumentId,
    desktopDraftEdited,
    desktopRevision,
  } = state;
  return {
    content,
    filename,
    desktopDocumentId,
    desktopDraftEdited,
    desktopRevision,
  };
}

function fileDraft(file: WorkspaceFile): Draft {
  return {
    content: file.content,
    filename: file.name.replace(/\.(md|markdown)$/i, ""),
    desktopDocumentId: file.id,
    desktopDraftEdited: file.content !== file.savedContent,
    desktopRevision: file.revision,
  };
}

export function looseDocumentReference() {
  const state = useEditorStore.getState();
  const draft = state.workspaceId ? state.looseDraft : state;
  return draft?.desktopDocumentId
    ? { id: draft.desktopDocumentId, filename: draft.filename }
    : undefined;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      ...defaultDraft,
      settings: defaultSettings,
      workspaces: [],
      workspaceFiles: {},

      setContent: (content) =>
        set((state) => {
          if (!desktopBuild) return { content };
          const id = state.desktopDocumentId;
          const file =
            state.workspaceId && id ? state.workspaceFiles[id] : undefined;
          if (!file) return { content, desktopDraftEdited: true };
          return {
            content,
            desktopDraftEdited: content !== file.savedContent,
            workspaceFiles: {
              ...state.workspaceFiles,
              [file.id]: { ...file, content },
            },
          };
        }),

      setFilename: (filename) => set({ filename }),
      setDesktopDocument: (
        content,
        filename,
        desktopDocumentId,
        desktopRevision,
      ) =>
        set({
          content,
          filename,
          desktopDocumentId,
          desktopRevision,
          desktopDraftEdited: false,
        }),

      updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),

      resetContent: () =>
        set({ content: defaultContent, desktopDocumentId: undefined }),

      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),

      addWorkspaceFiles: (workspaceId, files) =>
        set((state) => {
          const workspace = state.workspaces.find(
            (item) => item.id === workspaceId,
          );
          if (!workspace) return state;
          const workspaceFiles = { ...state.workspaceFiles };
          const looseDraft = state.workspaceId ? state.looseDraft : state;
          for (const file of files) {
            if (workspaceFiles[file.id]) continue;
            const legacyDraft =
              looseDraft?.desktopDocumentId === file.id
                ? looseDraft
                : undefined;
            const content = legacyDraft?.content ?? file.content;
            // Older drafts have no disk revision until the user confirms which version to keep.
            const revision =
              legacyDraft && content !== file.content
                ? legacyDraft.desktopRevision
                : file.revision;
            workspaceFiles[file.id] = {
              ...file,
              content,
              revision,
              savedContent: file.content,
            };
          }
          const fileIds = [
            ...new Set([...workspace.fileIds, ...files.map(({ id }) => id)]),
          ];
          return {
            workspaceFiles,
            workspaces: state.workspaces.map((item) =>
              item.id === workspaceId ? { ...item, fileIds } : item,
            ),
          };
        }),

      openWorkspace: (workspaceId, fileId, preserveLooseDraft) =>
        set((state) => {
          const workspace = state.workspaces.find(
            (item) => item.id === workspaceId,
          );
          if (!workspace) return state;
          const id = fileId ?? workspace.activeFileId ?? workspace.fileIds[0];
          const file = id ? state.workspaceFiles[id] : undefined;
          const looseDraft =
            !state.workspaceId && preserveLooseDraft
              ? draftState(state)
              : state.looseDraft;
          return {
            ...(file ? fileDraft(file) : defaultDraft),
            looseDraft,
            workspaceId,
            workspaces: state.workspaces.map((item) =>
              item.id === workspaceId
                ? { ...item, activeFileId: id, openedAt: Date.now() }
                : item,
            ),
          };
        }),

      leaveWorkspace: () =>
        set((state) => {
          if (!state.workspaceId) return state;
          return {
            ...(state.looseDraft ?? defaultDraft),
            workspaceId: undefined,
            looseDraft: undefined,
          };
        }),

      updateWorkspaceFile: (id, change) =>
        set((state) => {
          const previous = state.workspaceFiles[id];
          if (!previous) return state;
          const file = { ...previous, ...change };
          const active = state.workspaceId && state.desktopDocumentId === id;
          return {
            ...(active ? fileDraft(file) : {}),
            workspaceFiles: { ...state.workspaceFiles, [id]: file },
          };
        }),
    }),
    {
      name: "drymdf-editor-storage",
      partialize: (state) => ({
        ...draftState(state),
        settings: state.settings,
        ...(desktopBuild && {
          workspaces: state.workspaces,
          workspaceFiles: state.workspaceFiles,
          workspaceId: state.workspaceId,
          looseDraft: state.looseDraft,
        }),
      }),
    },
  ),
);
