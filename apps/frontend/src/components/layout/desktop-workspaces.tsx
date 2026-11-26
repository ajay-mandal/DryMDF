"use client";

import { FileText, Folder, FolderPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DesktopDocument, DiskDocument } from "@/lib/desktop";
import {
  looseDocumentReference,
  type Workspace,
  type WorkspaceFile,
} from "@/stores/editor-store";

interface LibraryProps {
  workspaces: Workspace[];
  onCreate: () => void;
  onOpen: (id: string) => void;
}

export function WorkspaceLibrary({
  workspaces,
  onCreate,
  onOpen,
}: LibraryProps) {
  const sorted = [...workspaces].sort(
    (left, right) => right.openedAt - left.openedAt,
  );
  return (
    <section className="mac-page" aria-labelledby="mac-workspaces-title">
      <div className="mac-page-heading">
        <div>
          <h1 id="mac-workspaces-title" tabIndex={-1}>
            Workspaces
          </h1>
          <p>Organize related Markdown files on this Mac.</p>
        </div>
        <Button className="mac-primary" onClick={onCreate}>
          <FolderPlus /> Create Workspace
        </Button>
      </div>
      {sorted.length ? (
        <ul className="mac-library-list" aria-label="Workspaces">
          {sorted.map((workspace) => (
            <li key={workspace.id}>
              <button onClick={() => onOpen(workspace.id)}>
                <Folder />
                <strong>{workspace.name}</strong>
                <span>
                  {workspace.fileIds.length}{" "}
                  {workspace.fileIds.length === 1 ? "file" : "files"}
                </span>
                <time dateTime={new Date(workspace.openedAt).toISOString()}>
                  {new Date(workspace.openedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mac-workspace-empty">
          Create a workspace to open a group of files together.
        </p>
      )}
    </section>
  );
}

export function CreateWorkspaceDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, files: DesktopDocument[]) => void;
}) {
  const [name, setName] = useState("");
  const [files, setFiles] = useState<DesktopDocument[]>([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  async function chooseFiles() {
    setPicking(true);
    setError("");
    try {
      const selected = await window.drymdfDesktop!.chooseWorkspaceFiles(
        true,
        looseDocumentReference(),
      );
      setFiles((previous) => [
        ...new Map(
          [...previous, ...selected].map((file) => [file.id, file]),
        ).values(),
      ]);
    } catch {
      setError(
        "Couldn’t add the selected files. Choose readable Markdown files and try again.",
      );
    } finally {
      setPicking(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !picking) onClose();
      }}
    >
      <DialogContent
        className="mac-sheet mac-workspace-sheet"
        showCloseButton={false}
      >
        <DialogTitle>Create Workspace</DialogTitle>
        <DialogDescription>
          Group Markdown files so you can open them together.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() && !picking) onCreate(name.trim(), files);
          }}
        >
          <label className="mac-workspace-name">
            Workspace name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </label>
          <div className="mac-workspace-add">
            <h3>Files in this workspace</h3>
            <Button
              type="button"
              variant="outline"
              disabled={picking}
              onClick={() => void chooseFiles()}
            >
              Add Files…
            </Button>
          </div>
          {files.length > 0 && (
            <ul className="mac-picked-files">
              {files.map((file) => (
                <li key={file.id}>
                  <FileText />
                  <span>
                    {file.name}
                    <small>{file.folder}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert">{error}</p>}
          <p>Files stay in their original locations.</p>
          <footer>
            <Button
              type="button"
              variant="outline"
              disabled={picking}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || picking}>
              Create
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkspaceRecoveryDialog({
  file,
  disk,
  busy,
  onKeep,
  onReload,
  onLocate,
}: {
  file: WorkspaceFile;
  disk: DiskDocument;
  busy: boolean;
  onKeep: () => void;
  onReload: () => void;
  onLocate: () => void;
}) {
  const available = disk.status === "available";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onKeep();
      }}
    >
      <DialogContent
        className="mac-sheet mac-workspace-sheet"
        showCloseButton={false}
      >
        <DialogTitle>
          {file.name} {available ? "changed on disk" : "couldn’t be found"}
        </DialogTitle>
        <DialogDescription>
          {available
            ? "Choose which version to keep editing. Keep Draft leaves the disk file as it is until you save."
            : "Your draft is safe. Locate the original file to save changes back to it."}
        </DialogDescription>
        {available && (
          <div className="mac-recovery-versions">
            <section>
              <h3>Draft in DryMDF</h3>
              <pre>{file.content.slice(0, 360) || "(Empty document)"}</pre>
            </section>
            <section>
              <h3>On disk</h3>
              <pre>
                {disk.document.content.slice(0, 360) || "(Empty document)"}
              </pre>
            </section>
          </div>
        )}
        <footer>
          <Button variant="outline" disabled={busy} onClick={onLocate}>
            Locate File…
          </Button>
          {available && (
            <Button variant="outline" disabled={busy} onClick={onReload}>
              Reload from Disk
            </Button>
          )}
          <Button disabled={busy} onClick={onKeep}>
            Keep Draft
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
