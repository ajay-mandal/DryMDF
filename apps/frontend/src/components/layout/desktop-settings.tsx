"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Bell, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportNotificationsEnabled,
  restoreDesktopSession,
  setExportNotificationsEnabled,
  setRestoreDesktopSession,
} from "@/lib/desktop";

interface Props {
  onBack: () => void;
}

export function DesktopSettings({ onBack }: Props) {
  const { theme, setTheme } = useTheme();
  const [restore, setRestore] = useState(restoreDesktopSession);
  const [notifications, setNotifications] = useState(
    exportNotificationsEnabled,
  );
  const [status, setStatus] = useState("");

  async function sendTest() {
    try {
      const sent = await window.drymdfDesktop?.notify("test");
      setStatus(
        sent
          ? "Test alert requested. Check macOS Notifications for delivery."
          : "Notifications are unavailable.",
      );
    } catch {
      setStatus("Couldn’t send the test alert. Try again.");
    }
  }

  return (
    <section
      className="mac-page mac-settings"
      aria-labelledby="mac-settings-title"
    >
      <div>
        <button className="mac-back" onClick={onBack} autoFocus>
          <ArrowLeft /> Back
        </button>
        <h1 id="mac-settings-title">Settings</h1>
      </div>
      <div className="mac-settings-group">
        <h2>
          <Monitor /> General
        </h2>
        <label className="mac-setting">
          Appearance
          <select
            value={theme ?? "system"}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="mac-setting">
          <span>
            Restore last session
            <small>
              Reopen the last document or workspace when DryMDF starts.
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={restore}
            onChange={(event) => {
              setRestore(event.target.checked);
              setRestoreDesktopSession(event.target.checked);
            }}
          />
        </label>
      </div>
      <div className="mac-settings-group">
        <h2>
          <Bell /> Notifications
        </h2>
        <label className="mac-setting">
          <span>
            PDF export completion
            <small>Show a macOS notification when a PDF is saved.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={notifications}
            onChange={(event) => {
              setNotifications(event.target.checked);
              setExportNotificationsEnabled(event.target.checked);
              setStatus("");
            }}
          />
        </label>
        <div className="mac-setting">
          <span>
            System permission
            <small>Manage DryMDF notification permissions in macOS.</small>
          </span>
          <Button
            variant="outline"
            onClick={() => {
              void window.drymdfDesktop
                ?.openNotificationSettings()
                .catch(() =>
                  setStatus(
                    "Couldn’t open System Settings. Open Notifications in macOS.",
                  ),
                );
            }}
          >
            Open System Settings…
          </Button>
        </div>
        <div className="mac-setting">
          <span>Test notification</span>
          <Button
            variant="outline"
            disabled={!notifications}
            onClick={() => void sendTest()}
          >
            Send Test Alert
          </Button>
        </div>
        {status && (
          <p className="mac-settings-status" role="status">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
