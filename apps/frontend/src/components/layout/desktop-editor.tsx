"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Clock3,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Save,
  Settings,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { DesktopExportSheet } from "@/components/export/desktop-export-sheet";
import {
  DesktopPreview,
  desktopPdfStatus,
} from "@/components/preview/desktop-preview";
import { useExportStore } from "@/stores/export-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBaseFilename } from "@/hooks/use-markdown-file-upload";
import { useWorkspaceFiles } from "@/hooks/use-workspace-files";
import {
  restoreDesktopSession,
  type DesktopDocument,
  type RecentDocument,
} from "@/lib/desktop";
import { useEditorStore } from "@/stores/editor-store";
import { DesktopSetup, type DesktopSheet } from "./desktop-setup";
import { DesktopSettings } from "./desktop-settings";
import {
  CreateWorkspaceDialog,
  WorkspaceLibrary,
  WorkspaceRecoveryDialog,
} from "./desktop-workspaces";
import { SplitPane } from "./split-pane";
import "./desktop-editor.css";

const setupKey = "drymdf-desktop-setup-v1";
const screenKey = "drymdf-desktop-screen";
const sample = `# Ridge walk

The trail opens above the tree line.\u0020\u0020
Bring a wind layer and a paper map.

## Route

- Start at the north trailhead.
- Stop at the saddle for lunch.

## Conditions

Wind picks up along the ridge.`;

interface Props {
  onPreviewModeChange: (mode: "markdown" | "pdf") => void;
  pdfMode: boolean;
}

export default function DesktopEditor({ onPreviewModeChange, pdfMode }: Props) {
  const {
    filename,
    content,
    desktopDocumentId,
    desktopDraftEdited,
    workspaceId,
    workspaces,
    workspaceFiles,
    looseDraft,
    setDesktopDocument,
  } = useEditorStore();
  const pdfOptions = useExportStore((state) => state.pdfOptions);
  const [draftVersion, setDraftVersion] = useState(0);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const workspaceFile =
    workspace && desktopDocumentId
      ? workspaceFiles[desktopDocumentId]
      : undefined;
  const [hasDraft, setHasDraft] = useState(() =>
    workspaceId
      ? Boolean(looseDraft)
      : localStorage.getItem(screenKey) !== "empty" &&
        localStorage.getItem("drymdf-editor-storage") !== null,
  );
  const [page, setPage] = useState<"recents" | "workspaces" | "editor">(() => {
    if (workspaceId) return restoreDesktopSession() ? "editor" : "workspaces";
    return hasDraft &&
      restoreDesktopSession() &&
      localStorage.getItem(screenKey) !== "start"
      ? "editor"
      : "recents";
  });
  const [settings, setSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [setupSheet, setSheet] = useState<DesktopSheet>(() =>
    !workspaceId && !hasDraft && !localStorage.getItem(setupKey)
      ? "welcome"
      : null,
  );
  const [pane, setPane] = useState<"editor" | "preview">("editor");
  const [recent, setRecent] = useState<RecentDocument[]>([]);
  const [offerNotifications, setOfferNotifications] = useState(false);
  const [exportFolder, setExportFolder] = useState("Downloads");
  const [busy, setBusy] = useState(false);
  const [openError, setOpenError] = useState("");
  const shell = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const sheet = setupSheet ?? (offerNotifications ? "notifications" : null);
  const sampleReady = sheet === "sample";
  const editing = page === "editor";
  const showWorkarea =
    (editing && (!workspace || !!workspaceFile)) || sampleReady;
  const workspaceOps = useWorkspaceFiles(
    editing && !settings && sheet === null && !!workspace,
    workspaceFile?.id,
  );
  const unavailable = busy || workspaceOps.busy;
  const activeName = sampleReady
    ? "Ridge walk.md"
    : (workspaceFile?.name ??
      recent.find((item) => item.id === desktopDocumentId)?.name ??
      filename + ".md");

  useEffect(() => {
    let active = true;
    window.drymdfDesktop
      ?.listRecents()
      .then((items) => {
        if (active) setRecent(items);
      })
      .catch(() => toast.error("Couldn’t load recent documents."));
    return () => {
      active = false;
    };
  }, [editing, desktopDocumentId]);

  function focusDocument() {
    requestAnimationFrame(() => {
      const editor = shell.current?.querySelector<HTMLElement>(".cm-content");
      if (editor?.checkVisibility()) editor.focus();
      else heading.current?.focus();
    });
  }

  function showEditor() {
    localStorage.setItem(setupKey, "complete");
    localStorage.setItem(screenKey, "editor");
    setHasDraft(true);
    setPage("editor");
    setPane("editor");
    setSheet(null);
    focusDocument();
  }

  function start() {
    useEditorStore.getState().leaveWorkspace();
    localStorage.setItem(screenKey, hasDraft ? "start" : "empty");
    setPage("recents");
    focusDocument();
  }

  function showLibrary() {
    setPage("workspaces");
    requestAnimationFrame(() =>
      shell.current
        ?.querySelector<HTMLElement>("#mac-workspaces-title")
        ?.focus(),
    );
  }

  function activateWorkspace(id: string, fileId?: string) {
    useEditorStore.getState().openWorkspace(id, fileId, hasDraft);
    localStorage.setItem(setupKey, "complete");
    setPage("editor");
    setPane("editor");
    focusDocument();
  }

  function createWorkspace(name: string, files: DesktopDocument[]) {
    const id = crypto.randomUUID();
    const state = useEditorStore.getState();
    state.addWorkspace({ id, name, fileIds: [], openedAt: Date.now() });
    state.addWorkspaceFiles(id, files);
    setCreating(false);
    activateWorkspace(id);
  }

  function addFiles(multiple: boolean) {
    if (!workspace) return;
    workspaceOps.chooseFiles((files) => {
      useEditorStore.getState().addWorkspaceFiles(workspace.id, files);
      activateWorkspace(
        workspace.id,
        multiple ? workspace.activeFileId : files[0].id,
      );
    }, multiple);
  }

  function mayReplace() {
    const state = useEditorStore.getState();
    const draft = state.workspaceId ? state.looseDraft : state;
    return (
      !hasDraft ||
      draft?.desktopDraftEdited === false ||
      window.confirm(
        "Replace your current local draft? Export it as Markdown first if you want to keep a copy.",
      )
    );
  }

  async function openFile(source?: RecentDocument, fromWelcome = false) {
    if (unavailable) return;
    if (workspace && editing && !source && !fromWelcome) {
      addFiles(false);
      return;
    }
    const state = useEditorStore.getState();
    const looseId = state.workspaceId
      ? state.looseDraft?.desktopDocumentId
      : state.desktopDocumentId;
    if (source && source.id === looseId && hasDraft) {
      state.leaveWorkspace();
      showEditor();
      return;
    }
    if (!mayReplace()) return;
    const desktop = window.drymdfDesktop;
    if (!desktop) return;
    setOpenError("");
    setBusy(true);
    try {
      const doc = source
        ? await desktop.reopenMarkdown(source.id)
        : await desktop.chooseMarkdown();
      if (!doc) return;
      state.leaveWorkspace();
      setDesktopDocument(
        doc.content,
        getBaseFilename(doc.name),
        doc.id,
        doc.revision,
      );
      showEditor();
    } catch {
      const message =
        "Couldn’t open this document. Choose a Markdown file and try again.";
      if (sheet === "welcome") setOpenError(message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function closeSettings() {
    setSettings(false);
    requestAnimationFrame(() => settingsButton.current?.focus());
  }

  const shortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      !event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.ctrlKey ||
      unavailable ||
      event.defaultPrevented
    )
      return;
    if (sheet === "welcome" && event.key === "o") {
      event.preventDefault();
      void openFile(undefined, true);
      return;
    }
    if (
      document.querySelector('[data-slot="dialog-content"][data-state="open"]')
    )
      return;
    if (event.key === ",") {
      event.preventDefault();
      if (settings) closeSettings();
      else setSettings(true);
      return;
    }
    if (settings) return;
    if (event.key === "s" && editing && workspaceFile) {
      event.preventDefault();
      workspaceOps.save();
    }
    if (event.key === "o") {
      event.preventDefault();
      void openFile();
    }
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      shortcut(event);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openSetup() {
    setOpenError("");
    setSheet("welcome");
  }

  function dismiss() {
    if (busy) return;
    if (sheet === "sample") {
      openSetup();
      return;
    }
    if (sheet === "welcome") localStorage.setItem(setupKey, "complete");
    if (sheet === "notifications") setOfferNotifications(false);
    setSheet(null);
    focusDocument();
  }

  function startEditingSample() {
    if (!mayReplace()) return;
    useEditorStore.getState().leaveWorkspace();
    setDesktopDocument(sample, "Ridge walk");
    showEditor();
  }

  const chooseFile = () => void openFile();
  const switchPane = () => setPane(pane === "editor" ? "preview" : "editor");
  const newDocument = () => {
    if (mayReplace()) {
      useEditorStore.getState().leaveWorkspace();
      setDesktopDocument("", "Untitled");
      setDraftVersion((version) => version + 1);
      showEditor();
    }
  };
  return (
    <main className="mac-shell" ref={shell}>
      <header className="mac-toolbar">
        <strong title={workspace?.name}>
          {settings
            ? "DryMDF"
            : editing && workspace
              ? workspace.name
              : "DryMDF"}
        </strong>
        {!settings && (
          <div className="mac-toolbar-actions">
            <button
              className="mac-toolbar-button"
              disabled={unavailable}
              onClick={chooseFile}
              title="Open a Markdown file (⌘O)"
            >
              <FolderOpen />
              <span>Open…</span>
            </button>
            {editing && workspaceFile && !sampleReady && (
              <button
                className="mac-toolbar-button"
                disabled={unavailable || !desktopDraftEdited}
                onClick={workspaceOps.save}
                title="Save changes to disk (⌘S)"
              >
                <Save />
                <span>Save</span>
              </button>
            )}
            {showWorkarea && !sampleReady && (
              <DesktopExportSheet
                disabled={unavailable}
                folder={exportFolder}
                onFolderChange={setExportFolder}
                onOfferNotifications={() => setOfferNotifications(true)}
              />
            )}
            <span className="mac-toolbar-divider" aria-hidden="true" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="mac-toolbar-button"
                  aria-label="View"
                  disabled={unavailable}
                >
                  <PanelLeft />
                  <span>View</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={showLibrary}>
                  Workspaces
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={start}>Recents</DropdownMenuItem>
                <DropdownMenuItem onSelect={newDocument}>
                  New Document
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openSetup}>
                  Open Setup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              ref={settingsButton}
              className="mac-toolbar-button mac-toolbar-icon"
              aria-label="Settings"
              title="Settings (⌘,)"
              disabled={unavailable}
              onClick={() => setSettings(true)}
            >
              <Settings />
            </button>
          </div>
        )}
      </header>
      {settings && <DesktopSettings onBack={closeSettings} />}
      <div className="mac-body" hidden={settings}>
        <nav
          className="mac-sidebar"
          aria-label={editing && workspace ? "Workspace files" : "Library"}
        >
          <small>{editing && workspace ? workspace.name : "Library"}</small>
          <button
            className={page === "workspaces" ? "selected" : ""}
            onClick={showLibrary}
            disabled={unavailable}
          >
            <Folder />
            <span>
              Workspaces<em>On this Mac</em>
            </span>
          </button>
          {(!editing || !workspace) && (
            <button
              className={page === "recents" ? "selected" : ""}
              onClick={start}
            >
              <Clock3 />
              <span>
                Recents<em>Recently opened</em>
              </span>
            </button>
          )}
          {editing && workspace && !sampleReady ? (
            <>
              <ul className="mac-workspace-files">
                {workspace.fileIds.map((id) => {
                  const file = workspaceFiles[id];
                  const dirty = file.content !== file.savedContent;
                  return (
                    <li key={id}>
                      <button
                        className={id === desktopDocumentId ? "selected" : ""}
                        aria-current={
                          id === desktopDocumentId ? "true" : undefined
                        }
                        onClick={() => activateWorkspace(workspace.id, id)}
                        disabled={unavailable}
                      >
                        <FileText />
                        <span>
                          {file.name}
                          <em>
                            {file.folder}
                            {dirty ? " · Unsaved" : ""}
                          </em>
                        </span>
                        {dirty && (
                          <i className="mac-dirty" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                className="mac-add-files"
                onClick={() => addFiles(true)}
                disabled={unavailable}
              >
                <FolderPlus />
                <span>Add Files…</span>
              </button>
            </>
          ) : (
            (hasDraft || sampleReady) &&
            !workspace && (
              <button
                className={showWorkarea ? "selected" : ""}
                onClick={showEditor}
              >
                <FileText />
                <span>
                  {activeName}
                  <em>{sampleReady ? "Sample document" : "Local draft"}</em>
                </span>
              </button>
            )
          )}
        </nav>
        {showWorkarea ? (
          <div className="mac-workarea">
            <div className="mac-compact-toolbar">
              {workspace && !sampleReady && (
                <select
                  className="mac-compact-files"
                  aria-label="Workspace file"
                  disabled={unavailable}
                  value={desktopDocumentId}
                  onChange={(event) =>
                    activateWorkspace(workspace.id, event.target.value)
                  }
                >
                  {workspace.fileIds.map((id) => (
                    <option key={id} value={id}>
                      {workspaceFiles[id].name} · {workspaceFiles[id].folder}
                    </option>
                  ))}
                </select>
              )}
              <button className="mac-pane-toggle" onClick={switchPane}>
                <PanelRight />
                {sampleReady || pane === "editor" ? "Preview" : "Editor"}
              </button>
            </div>
            <SplitPane
              compactPane={sampleReady ? "editor" : pane}
              left={
                <section className="mac-source">
                  <div className="mac-source-title">
                    <h1 tabIndex={-1} ref={heading}>
                      {activeName}
                    </h1>
                    <span>Markdown</span>
                  </div>
                  <div className="mac-code">
                    <MarkdownEditor
                      key={workspaceFile?.id}
                      sampleContent={sampleReady ? sample : undefined}
                    />
                  </div>
                </section>
              }
              right={
                <section className="mac-preview" aria-label="Document preview">
                  <DesktopPreview
                    markdown={sampleReady ? sample : content}
                    documentId={desktopDocumentId}
                    sourceKey={
                      workspaceFile
                        ? `${workspaceId}:${workspaceFile.id}:${workspaceFile.locationVersion ?? 0}`
                        : `draft:${draftVersion}:${desktopDocumentId ?? "untitled"}`
                    }
                    sample={sampleReady}
                    mode={pdfMode ? "pdf" : "markdown"}
                    onModeChange={onPreviewModeChange}
                  />
                </section>
              }
            />
          </div>
        ) : page === "workspaces" ? (
          <WorkspaceLibrary
            workspaces={workspaces}
            onCreate={() => setCreating(true)}
            onOpen={activateWorkspace}
          />
        ) : editing && workspace ? (
          <section className="mac-page">
            <div className="mac-page-heading">
              <div>
                <h1 tabIndex={-1} ref={heading}>
                  {workspace.name}
                </h1>
                <p>Add Markdown files to start editing.</p>
              </div>
              <Button
                className="mac-primary"
                disabled={unavailable}
                onClick={() => addFiles(true)}
              >
                <FolderPlus /> Add Files…
              </Button>
            </div>
          </section>
        ) : (
          <section className="mac-start">
            <h1 tabIndex={-1} ref={heading}>
              Start writing
            </h1>
            <p>Create a Markdown document or pick up where you left off.</p>
            <div className="mac-start-actions">
              <Button onClick={newDocument}>
                <FilePlus2 />
                New Document
              </Button>
              <Button
                variant="outline"
                disabled={unavailable}
                onClick={chooseFile}
              >
                <FolderOpen />
                Open a File…
              </Button>
            </div>
            <h2>Recent documents</h2>
            {hasDraft && (
              <button className="mac-recent" onClick={showEditor}>
                <FileText />
                <span>
                  {activeName}
                  <em>Resume local draft</em>
                </span>
              </button>
            )}
            {recent
              .filter((item) => item.id !== desktopDocumentId)
              .map((item) => (
                <button
                  disabled={busy}
                  key={item.id}
                  className="mac-recent"
                  onClick={() => void openFile(item)}
                >
                  <FileText />
                  <span>
                    {item.name}
                    <em>{item.folder}</em>
                  </span>
                </button>
              ))}
            {!hasDraft && recent.length === 0 && (
              <p className="mac-empty">Documents you open will appear here.</p>
            )}
          </section>
        )}
      </div>
      {!settings && (
        <footer className="mac-status">
          <span>
            {sampleReady
              ? "Ridge walk.md · Sample document"
              : editing
                ? activeName +
                  (workspaceFile
                    ? desktopDraftEdited
                      ? " · Unsaved changes"
                      : " · Saved to disk"
                    : " · Draft saved locally")
                : "Files stay on this Mac"}
          </span>
          {showWorkarea && (
            <span>
              {pdfMode && !sampleReady
                ? desktopPdfStatus(pdfOptions)
                : `Markdown · ${(sampleReady ? sample : content).split("\n").length} lines`}
            </span>
          )}
        </footer>
      )}
      {creating && (
        <CreateWorkspaceDialog
          onClose={() => setCreating(false)}
          onCreate={createWorkspace}
        />
      )}
      {workspaceOps.recovery && (
        <WorkspaceRecoveryDialog
          file={workspaceFiles[workspaceOps.recovery.id]}
          disk={workspaceOps.recovery.disk}
          busy={workspaceOps.busy}
          onKeep={workspaceOps.keep}
          onReload={workspaceOps.reload}
          onLocate={workspaceOps.locate}
        />
      )}
      <DesktopSetup
        sheet={sheet}
        onDismiss={dismiss}
        onOpen={() => void openFile(undefined, true)}
        busy={unavailable}
        openError={openError}
        onSample={() => setSheet("sample")}
        onStartOver={openSetup}
        onStartEditing={startEditingSample}
      />
    </main>
  );
}
