"use client";

import { useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { setExportNotificationsEnabled } from "@/lib/desktop";

export type DesktopSheet = "welcome" | "sample" | "notifications" | null;

interface Props {
  sheet: DesktopSheet;
  busy: boolean;
  openError: string;
  onDismiss: () => void;
  onOpen: () => void;
  onSample: () => void;
  onStartOver: () => void;
  onStartEditing: () => void;
}

export function DesktopSetup({
  sheet,
  busy,
  openError,
  onDismiss,
  onOpen,
  onSample,
  onStartOver,
  onStartEditing,
}: Props) {
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (sheet) primary.current?.focus();
  }, [sheet]);

  function decideNotifications(enabled: boolean) {
    setExportNotificationsEnabled(enabled);
    if (enabled) {
      void window.drymdfDesktop?.notify("export").catch(() => undefined);
    }
    onDismiss();
  }

  return (
    <Dialog
      open={sheet !== null}
      onOpenChange={(open) => {
        if (open) return;
        if (sheet === "notifications") decideNotifications(false);
        else onDismiss();
      }}
    >
      <DialogContent
        className="mac-sheet"
        data-sheet={sheet}
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          primary.current?.focus();
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        {sheet === "welcome" && (
          <>
            <DialogTitle>Welcome to DryMDF</DialogTitle>
            <DialogDescription>
              Write and preview Markdown on your Mac, then export to PDF.
            </DialogDescription>
            <section className="mac-choice">
              {/* The artwork is the same vector used for the packaged app icon. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/two-sheets.svg" width="50" height="50" alt="" />
              <div>
                <h3>Open a file</h3>
                <p>Pick an existing Markdown document.</p>
                <Button ref={primary} aria-disabled={busy} onClick={onOpen}>
                  Open a File
                </Button>
              </div>
            </section>
            {openError && <p role="alert">{openError}</p>}
            <section className="mac-choice inset">
              <div>
                <h3>Try the sample</h3>
                <p>Explore the editor with a document you can change.</p>
                <Button variant="outline" disabled={busy} onClick={onSample}>
                  Try the Sample
                </Button>
              </div>
            </section>
            <footer>
              <Button variant="outline" disabled={busy} onClick={onDismiss}>
                Skip Setup
              </Button>
            </footer>
          </>
        )}
        {sheet === "sample" && (
          <>
            <DialogTitle>Your sample is ready</DialogTitle>
            <DialogDescription>
              Ridge walk.md is open in the editor.
            </DialogDescription>
            <p className="mac-sample-tip">
              Edit the Markdown to see the preview update.
            </p>
            <footer>
              <Button variant="outline" onClick={onStartOver}>
                Start Over
              </Button>
              <Button ref={primary} onClick={onStartEditing}>
                Start Editing
              </Button>
            </footer>
          </>
        )}
        {sheet === "notifications" && (
          <>
            <DialogTitle>Export notifications</DialogTitle>
            <DialogDescription>
              Show a macOS notification when PDF export finishes.
            </DialogDescription>
            <div className="mac-notification-summary">
              <strong>
                <CircleCheck aria-hidden="true" /> Your PDF has been saved
              </strong>
              <p>You can change this preference in DryMDF Settings.</p>
              <p>macOS may ask for permission if you continue.</p>
            </div>
            <footer>
              <Button
                variant="outline"
                onClick={() => decideNotifications(false)}
              >
                Not Now
              </Button>
              <Button ref={primary} onClick={() => decideNotifications(true)}>
                Allow Notifications
              </Button>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
