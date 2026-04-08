# Recording (Video Capture)

> **Status**: Implemented. Screen/window/tab recording with a pre-record delay, pause/resume, stop, and discard controls.

## Architecture

The recording feature follows the same popup-window pattern as `capture.html`/`capture.js`: a dedicated HTML page is opened via `chrome.windows.create`, which has the user activation needed for `getDisplayMedia`.

### Files

| File | Role |
|------|------|
| `public/record.html` | Popup window UI — countdown overlay during delay, compact control bar during recording |
| `public/record.js` | Recording logic — `getDisplayMedia`, `MediaRecorder`, pre-record delay, download via blob URL |
| `entrypoints/background.ts` | `handleCapture('recording')` → `startRecordingWindow()` — opens the popup, listens for completion |
| `entrypoints/popup/App.tsx` | "Record Screen" card in the popup, `CaptureMode` includes `'recording'` |
| `entrypoints/editor/Icons.tsx` | `IconRecord` — concentric circle icon for the recording button |
| `wxt.config.ts` | `downloads` permission added for saving recordings |

### Flow

1. User clicks "Record Screen" in the popup → sends `{ type: 'capture', mode: 'recording' }` to the background.
2. `startRecordingWindow()` opens `record.html` in a small popup window.
3. `record.js` runs:
   - Calls `getDisplayMedia({ video: true, audio: true })` — the browser picker opens.
   - User selects a screen, window, or tab.
   - A `MediaRecorder` is constructed (VP9 preferred, VP8 fallback).
   - **A `PRE_RECORD_DELAY_MS` (500ms) delay** gives the user time to switch windows or prepare.
   - During the delay, a spinner with "Starting recording..." is shown.
   - After the delay, `recorder.start(1000)` begins capturing.
   - The UI switches to a compact control bar with: recording indicator, timer, Pause, Stop, Discard.
4. On **Stop**: the recorded blob is downloaded directly via `URL.createObjectURL` + `chrome.downloads.download`, then a `recording-result` message is sent to the background.
5. On **Discard**: recording stops, no download occurs, a `recording-result` message with `discarded: true` is sent.
6. The background listener removes the popup window and resolves.

### Pre-Record Delay

The `PRE_RECORD_DELAY_MS` constant (default: 500ms) is defined at the top of `public/record.js`. This delay exists between the `getDisplayMedia` picker closing and `recorder.start()` being called. During this time, a visual indicator (spinner + "Starting recording..." label) is shown so the user knows recording is about to begin.

### Download Strategy

Recordings are downloaded directly from `record.js` using a blob URL (`URL.createObjectURL`) passed to `chrome.downloads.download`. This avoids passing large video data through `chrome.runtime.sendMessage`, which has practical size limits. The background script only receives a lightweight result message indicating success or discard.

### Edge Cases

- **User closes the recording window manually**: A `chrome.windows.onRemoved` listener in the background detects this and cleans up the message listener, preventing leaks.
- **Browser "Stop sharing" button**: The video track's `ended` event triggers `recorder.stop()`, which follows the normal stop flow.
- **User cancels the picker**: `getDisplayMedia` throws, the catch block sends `{ success: false }`, and the window is closed.

### Constraints

1. **Privacy model** — all recording and encoding happens client-side. No network requests.
2. **MV3 service worker** — the background script cannot access DOM APIs. Recording happens in the popup window.
3. **User activation** — `getDisplayMedia` requires a transient user gesture. The popup window pattern provides this.
4. **Storage** — recordings bypass `browser.storage.local` entirely. Output is saved directly to disk via `chrome.downloads`.
