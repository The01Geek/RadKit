# Recording (WebM Video Capture)

> **Status**: Implemented. Records a browser tab or screen region as a WebM video clip using `getDisplayMedia` and `MediaRecorder`.

## Overview

The recording mode captures screen activity as a WebM video file (VP9/VP8 codec), with configurable duration limit and frame rate. All encoding is client-side with zero network requests, consistent with RadKit's privacy model.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `public/record.html` | Recording popup window markup and styles |
| `public/record.js` | MediaRecorder logic, UI controls, download trigger |
| `entrypoints/background.ts` | `captureRecording()` function, window lifecycle management |
| `entrypoints/popup/App.tsx` | Recording card in popup, `'recording'` in `CaptureMode` type |
| `entrypoints/editor/Icons.tsx` | `IconRecord` component |

### Flow

1. User clicks **Screen Recording** card in the popup
2. Popup sends `{ type: 'capture', mode: 'recording' }` to the background
3. Background opens `record.html` in a popup window (480x400) via `chrome.windows.create()`
4. User configures duration limit and frame rate, then clicks **Start Recording**
5. `getDisplayMedia` prompts the user to select a screen/window/tab
6. `MediaRecorder` records the stream, collecting data chunks every second
7. Recording stops when: duration limit is reached, user clicks Stop, or user clicks browser's "Stop sharing" button
8. Video blob is assembled from chunks and downloaded via `chrome.downloads.download()` with `saveAs: true`
9. `record.js` sends `{ type: 'recording-result', success: true }` to the background
10. Background closes the recording window (with a 500ms delay to allow the download to start)

### Key Design Decisions

- **Bypasses the editor entirely** — recordings go directly to download, never through `browser.storage.local` or the image editor
- **Popup window pattern** — same pattern as `captureDesktopMedia()`, required for `getDisplayMedia` user activation in MV3
- **Window-close detection** — `chrome.windows.onRemoved` listener detects if the user closes the recording window manually, preventing the Promise from hanging
- **Finish guard** — `finish()` uses a boolean flag to prevent duplicate invocations from race conditions (e.g., `onerror` + `onstop`, track `ended` + duration timeout)
- **Codec fallback** — tries VP9 first, falls back to VP8, then plain WebM

### Permissions

- `downloads` — required for `chrome.downloads.download()` (added to `wxt.config.ts`)
- `getDisplayMedia` and `MediaRecorder` are standard web APIs requiring no special extension permissions

### Configuration Defaults

| Setting | Default | Options |
|---------|---------|---------|
| Duration limit | 30 seconds | 10, 15, 30, 45, 60 seconds |
| Frame rate | 30 fps | 15, 24, 30 fps |

### Error Handling

- `getDisplayMedia` rejection (user cancels) — shows error, sends failure result
- `MediaRecorder` constructor failure — caught and reported via `finish()`
- `chrome.downloads` failure — checks `chrome.runtime.lastError`, reports failure
- Window closed manually — `onRemoved` listener rejects the Promise
- `chrome.windows.create` failure — checks `chrome.runtime.lastError`, rejects immediately
- Stream track ended (browser "Stop sharing") — triggers `stopRecording()` with null check on video track
