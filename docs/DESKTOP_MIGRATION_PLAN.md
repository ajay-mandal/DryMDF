# DryMDF macOS Desktop Migration

**Status, 26 November 2026.** The desktop shell, welcome wizard, multi-file workspaces, dedicated Settings page, and Markdown/PDF navigation have passed local checks on Apple Silicon. The source baseline still needs a Git revision. PDF page setup and export sheets, AI, and clean-Mac release checks remain.

## Goal and release scope

Ship DryMDF as an offline, single-user macOS app. Users should be able to install it from a DMG, open or write Markdown, preview it, and export PDF, HTML, and Markdown with no hosted backend.

The first release targets **Apple Silicon** and uses a **free, unnotarized DMG** hosted on GitHub Releases. The download instructions will cover the first-launch **Open Anyway** prompt. Windows, Intel Macs, notarization, App Store distribution, automatic updates, and cloud sync are deferred. Record the oldest macOS version that passes installer and export testing before publishing.

## Architecture and code changes

- **Desktop shell.** Add an Electron and Electron Forge workspace at `apps/desktop`. Package a static build of the editor from `apps/frontend` and launch into the editor. Reuse CodeMirror, the split-pane preview, theming, and Zustand. Check that routing, CSS, fonts, and other assets load from the installed bundle. Keep the current web build usable during migration.
- **Local conversion.** Add a typed desktop bridge for conversion and file dialogs. Wire both the export handler in [the editor](../apps/frontend/src/app/editor/page.tsx) and the generated PDF path in [the preview pane](../apps/frontend/src/components/preview/pdf-preview-pane.tsx) to it. Desktop runtime dependencies should consist of the packaged app and its local assets. Drop the HTTP calls, Bull/Redis jobs, and WebSocket status polling from the desktop paths.
- **PDF layout.** Reuse the existing [print styles and footer](../apps/backend/src/modules/pdf/print-layout.ts). Generate preview and export with the same hidden Chromium window and `webContents.printToPDF` pipeline. Bundle Mermaid, KaTeX CSS and fonts, syntax highlighting, and print fonts locally. Wait for diagrams, fonts, and supported images before printing. Discard stale preview results when the document or options change, and release temporary resources after each job.
- **File access and safety.** Add native Open and Save dialogs and preserve draft recovery across restarts. Keep file reads and writes in the main process and validate requests from the renderer. Treat imported Markdown and Mermaid as untrusted content. Use sandboxed renderers, context isolation, a narrow preload bridge, sanitized HTML, and restricted navigation. Support relative images from the opened document's folder. Define a clear placeholder for unavailable remote images and verify that preview and export work offline.

## Work tracker

Update each row as work moves through Pending, In progress, and Done. Record the build or PR and the verification result before marking a row Done.

| ID     | Work                                                                                                                 | Depends on                    | Estimate | Status          | Evidence                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------- | --------------- | -------------------------------------------------------------------------------- |
| MAC-01 | Package the editor and prove a local multi-page PDF export from an installed Apple Silicon build                     | —                             | 1–2 days | Done            | Local DMG smoke test below                                                       |
| MAC-02 | Wire local PDF preview and PDF, HTML, and Markdown exports. Preserve existing export settings and replace CDN assets | MAC-01                        | 2–3 days | Done            | Preview and export share the web print layout. Standalone HTML opened offline    |
| MAC-03 | Add native file dialogs, draft recovery, and safe handling of imported content and local images                      | MAC-01                        | 1–2 days | Done            | Native save, Unicode paths, image resolution, and draft recovery verified        |
| MAC-04 | Produce a repeatable ARM64 DMG build and write install instructions                                                  | MAC-01                        | 1 day    | Done            | Build and install steps below. DMG checksum and mount verified                   |
| MAC-05 | Verify the downloaded DMG on a clean Mac, fix release blockers, and publish the tested artifact                      | MAC-04, MAC-06 through MAC-10 | TBD      | Pending         | Single-file build verified locally. Verify the expanded MVP on the final DMG     |
| MAC-06 | Create and reopen workspaces with multiple Markdown documents and per-file draft recovery                            | MAC-03                        | TBD      | Done            | Tested same-name drafts, relaunch, save isolation, and recovery below            |
| MAC-07 | Configure and test Ollama, LM Studio, and hosted OpenAI-compatible AI providers                                      | MAC-03                        | TBD      | In verification | Local acceptance passed; live hosted authentication and packaged upgrade pending |
| MAC-08 | Chat with AI in the editor and preview, apply, or undo suggested Markdown edits                                      | MAC-06, MAC-07                | TBD      | Planned         | Chat, context selection, and review designs                                      |
| MAC-09 | Apply the desktop identity, window layout, start screen, and first-launch design                                     | MAC-01, MAC-03                | TBD      | Done            | Local renderer and mounted-DMG smoke checks below                                |
| MAC-10 | Implement the designed PDF page setup, export sheets, and recovery                                                   | MAC-02, MAC-09                | TBD      | Done            | Page setup, manual preview states, export sheets, recovery, and ARM64 DMG below  |

The previous 6–9 day estimate covered the single-file build. Estimate the expanded launch scope after a prototype verifies file persistence, streaming on both local providers, and credential storage across DMG updates.

## Phased delivery from the Penpot design

Reviewed the local working tree and the open Penpot file _New File 1_ on 25 November 2026. Its 32 boards span Direction, Identity, First launch, Workspace, Export and settings, Multi-file workspaces, and AI in the editor. MAC-01–04 describe the existing single-file implementation. Their verification log records earlier runs. The checks below define when the redesigned app is ready.

### Phase 0 — Establish a reproducible baseline

- Start with the current working tree. The desktop workspace and some shared print and frontend changes are still untracked or uncommitted. Capture the intended baseline before branching feature tickets.
- The original inspection found an alias at the build-output path. The replacement image from 26 November 2026 has a verified checksum and mount result. Build and verify the installer again from the captured baseline revision.
- **Pass when** the installed copy opens the existing draft, previews and exports the offline fixture, and the web editor still builds. Record the revision and actual image checksum so later phases can repeat the comparison.

### Phase 1 — Deliver the desktop editor shell and first launch (MAC-09)

- Use the Two Sheets icon from Identity for the app bundle and installer, with the separate wordmark on Welcome. Check the silhouette at 16, 32, and 128 pt in light and dark appearances. The Page Fold board is the design fallback if small-size legibility fails.
- Use the Direction board’s system type, Monaco source text, blue selection, and thin dividers. At the 1080 × 690 reference size, place navigation on the left, Markdown in the center, and preview on the right. At 720 × 660, the [split pane](../apps/frontend/src/components/layout/split-pane.tsx) switches between Editor and Preview.
- Implement Start, Recents, New Document, Open a File, and the editable sample with Start Over / Start Editing. Preserve Skip Setup and the existing draft on upgrade. Populate Recents from real opens. Workspace navigation becomes available with Phase 2.
- **Pass when** first launch, skip, canceled Open, sample editing, and relaunch all lead to the intended document. Compare the packaged app with the light, dark, and compact boards. Verify keyboard access, focus return, and reduced motion and transparency.

### Phase 2 — Make workspaces reliable (MAC-06)

- The Library, Create Workspace dialog, and editor sidebar group existing Markdown files. The [editor store](../apps/frontend/src/stores/editor-store.ts) persists workspace membership, recent use, the active file, and each draft. The [file bridge](../apps/desktop/documents.cjs) keeps stable document IDs and independent image roots. Adding the original file can adopt the legacy draft and its image association.
- Track saved revisions and recoverable drafts separately. Make Save write the selected document. Keep its dirty indicator until that write succeeds. For external changes or a missing file, offer Keep Draft, Reload from Disk, or Locate File as applicable.
- **Pass when** two files with the same name in different folders retain independent drafts and relative images after switching and quitting. Saving one changes only its original. Move one file and externally edit the other, then exercise each recovery action and verify the resulting disk contents.

### Phase 3 — Complete page setup, export, and settings (MAC-10)

- Connect the designed paper size, orientation, and margin controls to both preview and print. Orientation is missing from the current [PDF options](../apps/frontend/src/types/pdf.ts). Retain existing color and numbering options. Show Generate Preview when empty and Refresh PDF when edits make the preview stale.
- Deliver the format, filename, destination, progress, completion, and retry sheets. Reuse the native save dialog. The current [preload bridge](../apps/desktop/preload.cjs) returns a success flag. Give Show in Finder a reference to the completed export and retain the user’s choices for Export Again or Choose Folder.
- The dedicated Settings page now provides appearance, restore last session, notification preference, system settings access, and a test alert. It uses the same preference as the first-PDF notification offer.
- **Pass when** changing orientation or margins produces matching preview and saved PDF pagination, HTML opens offline, and Markdown round-trips. Canceling leaves the destination untouched. A failed save supports retry to another folder. Show in Finder reveals the file actually written.

### Phase 4 — Connect and verify AI providers (MAC-07)

- This work can begin after Phase 0 alongside the desktop UI. Build the settings screens for Ollama, LM Studio, and one hosted OpenAI-compatible endpoint. Support model discovery, model selection, refresh, and a fixed-prompt connection test using no document content. Show where inference runs and distinguish unavailable server, empty model list, and authentication failure.
- Route provider calls through typed Electron main-process operations. Keep local presets on loopback with downloaded local models, route cloud models through an explicit hosted choice, and require HTTPS for hosted requests. Keep keys in Keychain-backed storage scoped to provider and endpoint. Keep prompts, document contents, and secrets out of logs.
- In desktop **Settings → AI providers**, turn on **Use AI**. For a hosted service, select **OpenAI-compatible**, enter the provider’s HTTPS API base URL and API key, and save. Choose **Find Models** if the endpoint supports model discovery, or enter the provider’s model ID directly. Use **Test Connection** to verify streaming and save the model to keep it as your default. The endpoint must support Bearer API-key authentication and streaming OpenAI Chat Completions. For keyless access, choose **ChatGPT (account sign-in)**, save AI settings, and select **Continue with ChatGPT**. Authorize eligible ChatGPT plan usage in your browser, then find a model and run **Test Connection**. **Disconnect ChatGPT** removes the session from this Mac; manage the grant itself in ChatGPT. Claude organization OAuth is deferred. Local presets require a running loopback server and a downloaded chat model; if the server stops, start it again and refresh the model list.
- **Pass when** each local provider lists models, streams a response, and recovers after a server restart. Test one OpenAI-compatible endpoint with a supplied key and complete a browser authorization, model refresh, and streamed connection test using an eligible ChatGPT account. Verify disconnect and reauthorization. Check a packaged upgrade retains access to the saved key and ChatGPT session, and switching endpoints cannot reuse the key or access token. Editing and export must work with AI off.

### Phase 5 — Ship context-aware chat and reviewed edits (MAC-08)

- After Phases 2 and 4, use the editor’s right pane for chat. Start with the selection. Let the user explicitly add the active document or named workspace files. Show the prompt, provider, model, and included context. For hosted requests, show the Penpot **Review before sending** sheet with Cancel and Send Context before transmitting document text.
- Stream the reply with Stop and Retry. Bind a suggestion to its source document, revision, and selected range. Show Original and Suggestion with Apply Edit and Discard. Apply one undoable CodeMirror change to the source draft. If the user switches files or changes the source, prevent applying to the wrong text and offer regeneration for a stale suggestion.
- **Pass when** a request with a paragraph from Ridge walk.md and an explicitly added Gear list.md excludes Weather.md and the rest of Ridge walk.md. Canceling hosted review sends nothing. Stopping ignores late tokens. Discard leaves the draft intact, Apply updates the preview, and Undo restores the exact original. Check typing and switching files mid-stream.

### Phase 6 — Qualify and publish the redesigned app (MAC-05)

- Build from the integrated revision after Phases 1–5. Compare the installed surfaces with the Penpot reference boards, including compact navigation and error recovery. Repeat the existing offline export fixture, upgrade a single-file draft, and run the workspace and provider acceptance cases from the packaged app.
- **Pass when** a browser-downloaded DMG installs on a clean Apple Silicon Mac with Gatekeeper enabled, notification allow and deny paths have been observed, and the oldest claimed macOS version has passed. Publish those exact tested bytes, SHA-256, supported OS, and installation steps.

The first usable redesign is Phase 1. Phase 2 makes it a multi-file editor, and Phase 5 completes the AI workflow. Keep cross-file writes, indexing, automatic tool execution, and additional hosted adapters outside this release.

## Multi-file workspaces and editor AI

- **Workspaces:** Create a named workspace, then add Markdown files through the native picker. Show them in a sidebar with the active file and unsaved changes. Keep originals in place, save each file independently, and restore drafts after quitting. Handle missing or externally changed files before overwriting.
- **AI settings:** Offer Ollama and LM Studio as local presets and one hosted OpenAI-compatible provider with an API key. Show where inference runs, list models, and offer a connection test with a fixed test prompt. Keep keys in Keychain-backed storage through Electron's main process, scoped to the provider and endpoint. Verify access across updates to the ad-hoc-signed DMG.
- **Local routing:** Connect to loopback for local presets. Surface server unavailable, no models, and authentication errors. Treat Ollama cloud models as remote and require a hosted choice for them. Keep hosted requests on HTTPS and keep document data and keys out of logs.
- **In-editor AI:** Default to the text selection when one exists. Offer explicit controls for the active file or named workspace files. Show the provider, model, and selected context before sending, with a clear disclosure for hosted requests. Stream responses with a Stop action. Present document edits as diffs with Apply and Discard and put applied edits on the editor's undo stack. If the source changed while AI was running, regenerate the suggestion against the new text.
- **Launch scope:** Local AI downloads and runs through the user's chosen provider app. Editing and export work with AI disabled. Cross-file writes, workspace indexing, tool execution, and additional hosted adapters are deferred.

Dossier provides a reference for provider selection, model discovery, endpoint-scoped keys, and connection testing. DryMDF's desktop bridge owns provider calls and only receives document context selected by the user.

## Build and install the test DMG

Use Apple Silicon macOS, Node 22.12 or newer within the 22.x line, and the repository's pinned pnpm version. From the repository root, run:

```sh
pnpm install --frozen-lockfile
pnpm --filter @drymdf/desktop make
```

Open `apps/desktop/out/make/DryMDF-<version>-arm64.dmg`, drag DryMDF into Applications, and launch it. If macOS blocks the first launch because it cannot verify the developer, try opening DryMDF first, then use **System Settings → Privacy & Security → Open Anyway**. [Apple's installation instructions](https://support.apple.com/en-us/102445)

The build applies a local ad-hoc signature, verifies the app bundle, runs the packaged executable in headless mode, and writes a `.sha256` file next to the DMG. The direct download remains unnotarized.

## First-launch setup

- Welcome offers **Open a File**, **Try the Sample**, and **Skip Setup**. You can return from the sample with **Start Over**. **Start Editing** opens the sample as a local draft. Reopen the wizard from **View → Open Setup**.
- DryMDF receives file access through the macOS Open and Save dialogs. Relative images are read within the selected document's folder.
- The app offers notifications after the first successful PDF save when no preference is stored. Users can opt in, send a test notification, and change their preference from **View → Settings**. macOS controls banner delivery under **System Settings → Notifications**. The editor reports export results in the app.
- [x] Verify first launch, skip, relaunch, reopening Setup, and persisting the notification choice.
- [x] Verify a test request and successful export route through the desktop bridge after opt-in. Verify opt-out stops export requests.
- [ ] On a clean Mac, test notification delivery after allowing it and verify exports work after denying it.

## Milestone acceptance

### Internal beta

- [x] A packaged Apple Silicon build opens directly into the editor.
- [x] An offline multi-page Markdown fixture renders and exports with Mermaid, KaTeX, and a JavaScript code block. A separate PDF probe verifies page numbers.
- [x] PDF preview and saved PDF agree on page count and pagination for the fixture.

### Release MVP

- [x] Users can create and edit Markdown, open a local `.md` file, and save PDF, HTML, and Markdown to a chosen folder offline. Local images, Unicode filenames, and paths with spaces work.
- [x] Page size, background, and available page numbering options behave consistently in preview and export. Multi-page content has no clipped diagrams or text.
- [x] Draft content returns after relaunch. Canceling a dialog leaves the document and destination untouched. A failed export surfaces an actionable error and permits a retry.
- [x] Create and reopen a workspace with multiple Markdown files, retain each draft separately, and handle a moved file and an external edit safely.
- [ ] Test model discovery, successful chat, and recovery from a stopped local server with both Ollama and LM Studio. Test one hosted provider with a user-supplied key and verify keys stay scoped to the configured endpoint across restart and update.
- [ ] Verify selection-only and explicitly added file context, hosted disclosure, stream cancellation, diff Apply and Discard, undo, and stale suggestion handling.
- [ ] Download the release-candidate DMG through a browser on a clean Apple Silicon Mac. Drag DryMDF into Applications, verify the first-launch override with Gatekeeper enabled, then rerun offline export from the installed copy.
- [ ] Publish the exact tested DMG with its SHA-256 checksum, supported macOS version, and install steps. If macOS blocks first launch because it cannot verify the developer, direct users to **System Settings → Privacy & Security → Open Anyway** after they try to open DryMDF. [Apple's installation instructions](https://support.apple.com/en-us/102445)

## Verification log

### PDF page setup, export sheets, and recovery, 27 November 2026

- Implemented inline PDF page setup (paper size, portrait/landscape orientation, margin presets/custom display) and manual preview lifecycle (**No PDF preview yet / Generate Preview**, **Preview is out of date / Refresh PDF**) backed by shared `getDesktopPrintLayout` styles and Electron `printToPDF` options (`ecd2ae0`).
- Implemented the macOS export sheet (`b4f7234`) with editable filename, PDF/HTML/Markdown format selection, native folder destination picker, real progress updates, completion summary with **Export Again** and **Show in Finder** via opaque main-process export handles, and save-error recovery (**Retry**, **Choose Folder**) preserving captured document source and export selections.
- Verified with unit tests (`print-layout.spec.ts`, `pdf-preview-snapshot.test.mjs`, `exports.test.cjs`), workspace lint, Prettier formatting, TypeScript checks, web/desktop builds, Electron smoke testing (cancel, write failure/recovery, Markdown/HTML/PDF outputs, Finder reveal, notification offer, and landscape A4 parity via `pdfinfo`), and packaged ARM64 DMG (`DryMDF-0.1.0-arm64.dmg`, SHA-256 `d6d267367325a08947334ad91ac250174af6039276a73dc0be73b310733508c8`) signature and mount checks.

### Workspaces, Settings, and navigation, 26 November 2026

- Tested two `Notes.md` files in independent folders. Both drafts and relative images survived a full process relaunch. Adding the original adopted a migrated single-file draft and its image association. Add Files cancellation and duplicate selections preserved workspace membership.
- Confirmed Save updated only the selected original. Moved a file and its image, kept the draft, canceled and retried Locate File, and saved at the new location. Exercised Keep Draft and Reload from Disk against an externally changed sibling without overwriting either original unexpectedly.
- Verified the dedicated Settings page, session restore preference, compact file navigation, and Open, Save, and Export alignment. Switching workspace files in PDF mode clears the previous PDF until the preview is refreshed.
- Production frontend, backend, and desktop builds and targeted lint passed. The ARM64 DMG passed integrity and signature checks. A copy from the mounted image opened Welcome, Workspaces, and Settings, printed a PDF locally, and restored the draft on relaunch.
- The image came from the working tree on `main` at `e7fb8c5`. SHA-256 is `8ae84fa34e2ecffe3521ed05a689d888dcf77339bfe7d6f69dd43b173c03290d`.
- Follow-up PDF zoom verification: removed the width and height transition that animated layout on every zoom step. Desktop actual-size zoom now preserves the rendered page width and allows horizontal scrolling. The rebuilt signed ARM64 DMG passed Fit width, 100%, Fit page, and modifier-wheel zoom with zero layout-transition duration; the mounted copy also passed Welcome, editing, local PDF printing, relaunch, Workspaces, and Settings. Current installer SHA-256: `5f96150454129a730866e61f923079f1b4080b753a512838eeeaee2f8b0fad71`.

### Desktop UI and welcome wizard, 26 November 2026

- Opened the Penpot Direction, Identity, First Launch, and Workspace boards. Compared the Electron renderer in light, dark, and compact layouts. Reviewed the Two Sheets icon at 16, 32, and 128 pt.
- Electron checks covered native picker results with simulated Cancel, unreadable file, and successful Unicode path selection. Verified Recents, keyboard focus, sample editing, Start Over, Skip Setup, draft restoration in a new process, and reduced-motion and transparency CSS.
- Generated a real PDF in the smoke run. A canceled Save produced no offer. A successful save showed the offer once. Verified both notification choices and simulated notification requests after opting in. Native notification permission and banner delivery remain clean-Mac checks.
- The web frontend, backend, desktop build, and targeted frontend lint passed. The ARM64 DMG passed SHA-256 and macOS image verification. A signed copy from the mounted image showed Welcome, accepted and previewed a sample edit, printed a PDF locally, and restored the draft on relaunch.
- The image came from the working tree on `main` at `e7fb8c5`. SHA-256 is `deaf8ed4afbf0e184bfa9be949a84444f6305a50d52e4107eb87f2acb8f8cbf9`. Record a committed source baseline before release qualification.

### Local test build 0.1.0

- **Environment:** Apple Silicon, macOS 27.0.1. The DMG passed integrity verification and mounted successfully. The app was copied from the DMG into a temporary install directory.
- **Offline result:** With network requests disabled in the editor, PDF preview and export each produced six A4 pages with matching extracted page text. Both PDFs included the Mermaid diagram, embedded KaTeX fonts, and the code block. A separate PDF contained page numbers 1 through 6. The normal web build also passed.

### Release candidate 0.1.0

- **Installer:** `DryMDF-mac-arm64.dmg` passed integrity verification and launched after being copied from the mounted image. Verified on Apple Silicon running macOS 27.0.1. SHA-256 is `112031af19a69c917c1ca69e02443080f2497ed02678ab0058fc5fb66fbf80d4`.
- **Files:** Opened Markdown with Unicode in the filename and spaces in the path. A relative PNG rendered offline and returned with the draft after relaunch. Verified the macOS Save sheet on the installed app. Export tests used controlled Save selections to verify cancellation, failure, and retry.
- **Exports:** PDF preview and saved PDF matched across four A4 pages, with all 32 sections, a relative image, a Mermaid diagram, and embedded KaTeX fonts. A separate Legal fixture verified the page color and footer numbering. HTML reopened offline with its embedded image, diagrams, math fonts, and highlighting. Markdown round-tripped exactly.
- **Web:** The frontend and backend builds passed. Compared the extracted print styles and footer with the original web implementation for default and customized options.
- **Pending:** Browser download and first launch with Gatekeeper on a clean Apple Silicon Mac, testing the oldest macOS version claimed for release, and publishing the DMG and checksum.

### Release candidate with first-launch setup

- **Installer:** SHA-256 is `8cadd1d7b4c601221dfb2bc724b813dcab58acc608b9c9beda857c67cc936374`. The previous ad-hoc signature enabled Hardened Runtime, causing macOS to reject the bundled Electron framework at startup. The rebuilt DMG uses per-file ad-hoc signing settings and checks the actual executable before creating the image.
- **Setup:** Hidden-window tests verified onboarding, persistence, notification opt-in and opt-out, and export notification requests using a simulated notification service. Native banner delivery and the first-run system prompt still require visible testing.

For each release candidate, record the build tag, DMG checksum, tested macOS version and hardware, fixture used, results, and linked follow-up issues.
