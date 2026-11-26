"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import type { DesktopDocument, DiskDocument } from "@/lib/desktop";
import { looseDocumentReference, useEditorStore } from "@/stores/editor-store";

type Recovery = { id: string; disk: DiskDocument };

export function useWorkspaceFiles(active: boolean, documentId?: string) {
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<Recovery>();
  const inFlight = useRef(false);
  const checking = useRef(0);

  async function run(operation: () => Promise<void>, error: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    checking.current++;
    setBusy(true);
    try {
      await operation();
    } catch (cause) {
      toast.error(error, {
        description: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function activeFile() {
    const state = useEditorStore.getState();
    return state.workspaceId && state.desktopDocumentId
      ? state.workspaceFiles[state.desktopDocumentId]
      : undefined;
  }

  const check = useEffectEvent(async (signal: AbortSignal) => {
    if (!active || inFlight.current || recovery || !documentId) return;
    const file = activeFile();
    const api = window.drymdfDesktop;
    if (!file || !api) return;
    const request = ++checking.current;
    try {
      const disk = await api.checkWorkspaceFile(file.id);
      if (
        signal.aborted ||
        request !== checking.current ||
        activeFile()?.id !== file.id
      )
        return;
      if (
        disk.status === "missing" ||
        disk.document.revision !== file.revision
      ) {
        setRecovery({ id: file.id, disk });
      }
    } catch {
      if (!signal.aborted && request === checking.current) {
        toast.error("Couldn’t check the file on disk.", {
          id: "workspace-file-check",
        });
      }
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    const onFocus = () => void check(controller.signal);
    onFocus();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [active, documentId]);

  function save() {
    const file = activeFile();
    if (!file || recovery) return;
    void run(async () => {
      const api = window.drymdfDesktop!;
      const result =
        file.revision && file.content !== file.savedContent
          ? await api.saveWorkspaceFile(file.id, file.revision, file.content)
          : await api.checkWorkspaceFile(file.id);
      if (result.status === "saved") {
        // Keep edits made while the write was in flight in the recoverable draft.
        useEditorStore.getState().updateWorkspaceFile(file.id, {
          revision: result.revision,
          savedContent: file.content,
        });
        toast.success("Saved to disk", { id: "workspace-save" });
      } else if (
        result.status === "missing" ||
        result.document.revision !== file.revision
      ) {
        setRecovery({ id: file.id, disk: result });
      }
    }, "Couldn’t save the file.");
  }

  function chooseFiles(
    onChoose: (files: DesktopDocument[]) => void,
    multiple: boolean,
  ) {
    void run(async () => {
      const api = window.drymdfDesktop!;
      const files = await api.chooseWorkspaceFiles(
        multiple,
        looseDocumentReference(),
      );
      if (files.length) onChoose(files);
    }, "Couldn’t add the selected files.");
  }

  function keep() {
    if (!recovery) return;
    if (recovery.disk.status === "available") {
      const { revision, content } = recovery.disk.document;
      useEditorStore.getState().updateWorkspaceFile(recovery.id, {
        revision,
        savedContent: content,
      });
    }
    setRecovery(undefined);
  }

  function reload() {
    if (recovery?.disk.status !== "available") return;
    const { id, disk } = recovery;
    void run(async () => {
      const latest = await window.drymdfDesktop!.checkWorkspaceFile(id);
      if (
        latest.status === "missing" ||
        latest.document.revision !== disk.document.revision
      ) {
        setRecovery({ id, disk: latest });
        return;
      }
      useEditorStore.getState().updateWorkspaceFile(id, {
        ...latest.document,
        savedContent: latest.document.content,
      });
      setRecovery(undefined);
    }, "Couldn’t reload the file.");
  }

  function locate() {
    if (!recovery) return;
    const { id } = recovery;
    void run(async () => {
      const found = await window.drymdfDesktop!.locateWorkspaceFile(id);
      if (!found) return;
      const state = useEditorStore.getState();
      const file = state.workspaceFiles[id];
      state.updateWorkspaceFile(id, {
        name: found.name,
        folder: found.folder,
        locationVersion: (file.locationVersion ?? 0) + 1,
      });
      if (found.revision === file.revision) {
        setRecovery(undefined);
      } else {
        setRecovery({ id, disk: { status: "available", document: found } });
      }
    }, "Couldn’t locate the file.");
  }

  return { busy, recovery, save, chooseFiles, keep, reload, locate };
}
