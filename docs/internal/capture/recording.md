# Recording (WebM Video Capture)

> **Status**: Implemented. Records a browser tab or screen region as a WebM video clip using `getDisplayMedia` and `MediaRecorder`, with configurable settings, a floating control bar, optional webcam overlay, and in-browser preview/management.

## Overview

The recording mode captures screen activity as a WebM video file (VP9/VP8 codec, optional Opus audio), with configurable frame rate, audio source, resolution, and webcam overlay. Completed recordings are stored in `chrome.storage.local` and previewed in a browser tab before the user decides to save or discard. All encoding and storage is client-side with zero network requests, consistent with RadKit's privacy model.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `entrypoints/popup/App.tsx` | Record tab with inline settings (framerate, audio, resolution, webcam) and `handleRecord()` function |
| `entrypoints/popup/App.css` | Tab bar, settings grid, toggle switch, record button styles |
| `public/record.html` | Compact recording control bar UI (timer + pause/stop/discard buttons) |
| `public/record.js` | Auto-start recording, control bar logic, pause/resume, webcam overlay messaging, preview preparation |
| `public/preview.html` | Recording preview page (opens in a browser tab after recording finishes) |
| `public/preview.js` | Preview video playback, save-as-download and discard logic |
| `public/recordings.html` | Recordings management page listing all stored recordings |
| `public/recordings.js` | List, download, and delete stored recordings |
| `public/webcam.html` | Legacy webcam popup (no longer used for overlay) |
| `public/webcam.js` | Legacy webcam stream initialization (no longer used for overlay) |
| `entrypoints/content.ts` | Webcam overlay injection via Shadow DOM, drag/resize, camera error handling |
| `entrypoints/background.ts` | `captureRecording()` function, window lifecycle, webcam message relay, preview tab opening |
| `entrypoints/editor/Icons.tsx` | `IconRecord` component |

### Flow

1. User opens the popup and switches to the **Record** tab
2. User configures settings (frame rate, audio, resolution, webcam overlay) inline within the tab
3. User clicks **Start Recording**
4. `handleRecord()` writes the settings to `chrome.storage.local` as `recordingSettings`, then sends `{ type: 'capture', mode: 'recording' }` to the background
5. Background opens `record.html` in a popup window (1024x768) via `chrome.windows.create()`
6. `record.js` auto-starts recording on load: reads `recordingSettings` from storage, calls `getDisplayMedia` with the configured video/audio constraints
7. The screen-picker dialog appears; the user selects a screen/window/tab
8. If webcam overlay is enabled, `record.js` sends `start-webcam-overlay` to the background, which relays it to the content script in the recorded tab; the content script injects a 200x200 circular webcam overlay (Shadow DOM isolated, draggable, resizable) at the bottom-right of the page
9. After the screen-picker closes, `showBar()` resizes the record window from 1024x768 down to 340x90, becoming a compact floating control bar with:
   - Pulsing red recording dot (turns orange when paused)
   - Running timer (`m:ss` format)
   - Pause/Resume button
   - Stop button (finish and save)
   - Discard button (X)
10. `MediaRecorder` records the stream, collecting data chunks every 1000ms
11. Recording stops when: user clicks Stop, user clicks the browser's "Stop sharing" button, or the video track ends
12. On stop, video blob is assembled from chunks, converted to a data URL via `FileReader`, and stored in a `recordings` array in `chrome.storage.local` (with id, timestamp, duration, size, dataUrl)
13. `record.js` sends `{ type: 'recording-preview-ready' }` to the background
14. Background closes the record popup window, opens `preview.html` in a new browser tab, and resolves the Promise
15. Preview page loads the recording from storage, displays it with playback controls, and offers **Save Recording** (triggers save-as download via `chrome.downloads`) or **Discard** (removes from storage)

### Key Design Decisions

- **Tabbed popup UI** — the popup has two tabs ("Capture" and "Record") so screenshot and recording features share one entry point without clutter; settings live inline in the Record tab instead of in a separate window
- **Settings in popup, not in record window** — `record.html` has no settings UI; it reads `recordingSettings` from `chrome.storage.local` and auto-starts immediately, keeping the record window minimal
- **Auto-start pattern** — `startRecording()` is called at the bottom of the IIFE in `record.js`, so the screen-picker dialog appears as soon as the window opens with zero additional user interaction
- **Floating control bar** — after the screen-picker closes, the 1024x768 popup shrinks to 340x90 so it sits unobtrusively on-screen while the user records; this avoids a full-size window blocking the content being captured
- **Persistent storage** — recordings are stored as data URLs in `chrome.storage.local` and persist across sessions until the user manually deletes them, unlike the old approach which went directly to a download
- **Preview before save** — the preview page lets the user watch back the recording and choose to save or discard, rather than immediately triggering a download
- **Popup window pattern** — same pattern as `captureDesktopMedia()`, required for `getDisplayMedia` user activation in MV3
- **Window-close detection** — `chrome.windows.onRemoved` listener detects if the user closes the recording window manually, preventing the Promise from hanging
- **Finish guard** — `finish()` uses a boolean `finished` flag to prevent duplicate invocations from race conditions (e.g., `onerror` + `onstop`, track `ended` + stop button)
- **Codec fallback** — when audio tracks are present, tries `vp9,opus` first, then `vp8,opus`, then plain WebM; when no audio, tries `vp9`, then `vp8`, then plain WebM
- **Webcam overlay** — a content script injects a circular, mirrored webcam feed as a Shadow DOM overlay directly into the recorded page; it is removed when recording stops via `closeWebcam()` in `finish()` and `discardRecording()`, which sends `stop-webcam-overlay` through the background relay to the content script. The overlay is draggable and resizable, with a default 200x200px size at bottom-right

### Permissions

- `downloads` — required for `chrome.downloads.download()` in preview.js and recordings.js (added to `wxt.config.ts`)
- `getDisplayMedia`, `getUserMedia`, and `MediaRecorder` are standard web APIs requiring no special extension permissions

### Configuration Defaults

| Setting | Default | Options |
|---------|---------|---------|
| Frame rate | 30 fps | 15, 24, 30, 60 fps |
| Audio | Microphone | Microphone, System audio, Both, None |
| Resolution | Source (native) | Source (native), 720p, 1080p, 4K |
| Webcam Overlay | Off | On, Off |

Settings are stored in `chrome.storage.local` under the key `recordingSettings` with the shape:

```json
{
  "framerate": 30,
  "audioMode": "mic",
  "resolution": "source",
  "webcam": false
}
```

Audio mode values: `"mic"` (microphone via `getUserMedia`), `"system"` (system audio via `getDisplayMedia({ audio: true })`), `"both"` (both sources), `"none"` (no audio).

Resolution values: `"source"` (no constraints, native resolution), `"720"` (1280x720 ideal), `"1080"` (1920x1080 ideal), `"4k"` (3840x2160 ideal).

### Storage Schema

Recordings are persisted in `chrome.storage.local` under the key `recordings` as an array of entries, newest first:

```json
{
  "id": "rec_1712345678901_a1b2c3",
  "timestamp": "2026-04-07T21:44:00.000Z",
  "duration": 42,
  "size": 5242880,
  "dataUrl": "data:video/webm;base64,..."
}
```

The `previewRecordingId` key is temporarily set to the ID of the just-completed recording so `preview.html` knows which entry to load; it is removed after the preview page reads it.

### Error Handling

- `getDisplayMedia` rejection (user cancels) — shows error status text, sends `{ type: 'recording-result', success: false }` to background
- `getUserMedia` rejection (microphone access denied) — silently continues recording without microphone audio
- `MediaRecorder` constructor failure — caught and reported via `finish()` with error message
- Recording error (`recorder.onerror`) — calls `finish()` with the error message
- `FileReader` failure during data URL conversion — shows failure status, sends error result to background
- `chrome.downloads` failure in preview — checks `chrome.runtime.lastError`, displays error, re-enables save button
- Discard — stops recorder and stream, clears chunks, sends error result `"Recording discarded"` to background; in preview, removes entry from storage array
- Window closed manually — `onRemoved` listener in background rejects the Promise
- `chrome.windows.create` failure — checks `chrome.runtime.lastError`, rejects immediately
- Stream track ended (browser "Stop sharing") — triggers `stopRecording()` via the video track's `ended` event listener
- Pause edge case — if recorder is paused when stop is clicked, `stopRecording()` calls `recorder.resume()` first so `onstop` fires correctly
- Webcam unavailable — the content script's `getUserMedia` catch handler shows a specific error message (permission denied, no camera found, camera in use, or generic fallback) and logs the error to the console
