# Screen Recording (WebM Video Capture)

> **Status**: Implemented. Records browser tabs or screen regions as WebM video clips using `MediaRecorder`.

## Overview

The recording capture mode extends RadKit's capture system from static PNG screenshots to video recording. It uses `getDisplayMedia` for screen access and `MediaRecorder` for client-side WebM encoding, then triggers a direct file download — bypassing the image editor and `browser.storage.local` entirely.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `public/record.html` | Recording popup window — HTML with inline CSS for start/stop controls, duration input, frame rate selector, and live timer |
| `public/record.js` | All recording logic — `getDisplayMedia`, `MediaRecorder`, chunk collection, blob assembly, `chrome.downloads.download()`, and background messaging |
| `entrypoints/background.ts` | `startRecordingSession()` function — opens the recording window and listens for completion/window-close |
| `entrypoints/popup/App.tsx` | Recording card in the popup UI, `'recording'` in `CaptureMode` type union |
| `entrypoints/editor/Icons.tsx` | `IconRecord` component (filled circle inside stroked circle) |
| `wxt.config.ts` | `'downloads'` permission in manifest |

### Flow

```
Popup                    Background                Recording Window
  │                         │                          │
  ├─ capture/recording ────►│                          │
  │                         ├─ chrome.windows.create ──► (record.html)
  │                         │  (registers message +     │
  │                         │   window-close listeners)  │
  │                         │                          ├─ User clicks Start
  │                         │                          ├─ getDisplayMedia()
  │                         │                          ├─ MediaRecorder.start()
  │                         │                          ├─ ... recording in progress ...
  │                         │                          ├─ User clicks Stop / duration limit
  │                         │                          ├─ MediaRecorder.stop()
  │                         │                          ├─ Blob assembly
  │                         │                          ├─ chrome.downloads.download(blobUrl)
  │                         │                          ├─ sendMessage('recording-complete')
  │                         │◄── recording-complete ───┤
  │                         ├─ chrome.windows.remove    │
  │◄── { success: true } ──┤                          │
  │  (window.close())       │                          │
```

### Key Design Decisions

1. **Separate popup window** — `getDisplayMedia` requires a transient user gesture. The popup window created via `chrome.windows.create()` provides this. Same pattern as `captureDesktopMedia()`.

2. **Download from recording window** — Blob URLs are scoped to the window that created them. `chrome.downloads.download()` is called from `record.js` (inside the popup window), not from the background service worker.

3. **Editor bypass** — The `'recording'` case in `handleCapture()` returns `{ success: true }` directly after `startRecordingSession()` resolves, skipping `browser.storage.local.set()` and `editor.html`. Video blobs would exceed storage limits and the image editor cannot process video.

4. **Window lifecycle management** — The background script listens for both `recording-complete` messages and `chrome.windows.onRemoved` events. If the user closes the recording window manually, the promise rejects cleanly and listeners are removed (no leaks).

## Recording Controls

| Control | Default | Range | Notes |
|---------|---------|-------|-------|
| Frame rate | 30 fps | 15 / 30 / 60 fps | Passed as `{ frameRate: fps }` constraint to `getDisplayMedia`. Browsers may ignore this for screen capture. |
| Duration limit | 30 seconds | 5–60 seconds | Enforced via `setTimeout`. Recording stops automatically when reached. |
| Start/Stop button | — | — | Visual toggle: red circle (start) → red square (stop) |

## Codec Negotiation

`record.js` tries MIME types in order:
1. `video/webm;codecs=vp9`
2. `video/webm;codecs=vp8`
3. `video/webm` (generic)

Uses `MediaRecorder.isTypeSupported()` to select the first supported type. All Chromium browsers support at least VP8.

## Error Handling

Every error path in `record.js` calls `sendComplete(false, errorMessage)` to notify the background script, preventing hung promises:

- `getDisplayMedia` denial or failure
- No video track in stream
- Unsupported MIME type
- `MediaRecorder` constructor failure
- `MediaRecorder.onerror` during recording
- `chrome.downloads.download` failure
- Empty recording (no data chunks)

The background script also detects the recording window being closed via `chrome.windows.onRemoved` and rejects the promise with `'Recording window was closed'`.

`sendComplete()` includes a callback to handle extension context invalidation (e.g., extension update during recording), showing the user a fallback message to close the window manually.

## Privacy

- **Zero network requests** — all encoding is client-side via `MediaRecorder`
- **No storage** — video data never touches `browser.storage.local`; uses ephemeral blob URL
- **No audio** — `audio: false` is explicitly set in `getDisplayMedia` constraints
- **Blob cleanup** — blob URL is revoked 5 seconds after download initiation

## Permissions

The `'downloads'` permission was added to `wxt.config.ts` to enable `chrome.downloads.download()` from extension pages.
