# Recording (GIF / Video Capture) — Design Reference

> **Status**: Partially implemented. The webcam overlay content script is complete (issue #42). Screen/video recording is not yet implemented.

## Current State

RadKit's capture system is entirely **static** — every mode produces a single PNG screenshot. There is no recording, animation, or video capture functionality today.

### Webcam Overlay (Implemented)

The webcam overlay is a content script (`entrypoints/webcam-overlay.ts`) that injects a circular webcam feed directly into the active tab's DOM using Shadow DOM for style isolation. Key characteristics:

- **Shadow DOM**: Styles are encapsulated via `attachShadow({ mode: 'open' })`, preventing conflicts with host page CSS
- **Circular bubble**: 200x200px default size, `border-radius: 50%`, mirrored via `scaleX(-1)`, thin white border
- **Draggable**: Click-and-drag to reposition anywhere on the page
- **Resizable**: Drag handle at bottom-right corner (80px min, 600px max)
- **Camera access**: Uses `navigator.mediaDevices.getUserMedia({ video: true })` directly in the content script
- **Error handling**: Shows a fallback message if camera access fails
- **Cleanup**: Stops camera tracks, removes document event listeners, and removes the host element
- **z-index**: `2147483647` (maximum) to appear above all page content

The overlay is toggled from the popup UI via the background script. The content script is dynamically injected on first use and persists its message listener for subsequent toggles.

### Relevant Existing Infrastructure

| Component | File | Relevance |
|-----------|------|-----------|
| `getDisplayMedia` popup window | `public/capture.html` + `public/capture.js` | Already opens a popup window with user activation to call `getDisplayMedia`. Recording will extend this pattern to keep the stream open instead of grabbing a single frame. |
| Background orchestration | `entrypoints/background.ts` | `handleCapture()` switch dispatches by mode string. A new `'recording'` mode would be added here. |
| Popup UI | `entrypoints/popup/App.tsx` | `CaptureMode` type union and capture card buttons. A new card for recording would be added. |
| Editor | `entrypoints/editor/Editor.tsx` | Currently expects a static PNG data URL from `browser.storage.local`. Would need to either accept video/GIF blobs or the recording feature would bypass the editor entirely and offer direct download. |
| Storage | `browser.storage.local` (`capturedImage` key) | Data URLs for large recordings may exceed storage limits. Video/GIF output may need `IndexedDB` or direct blob download instead. |

### APIs Available in Extension Context

- **`navigator.mediaDevices.getDisplayMedia()`** — already used in `capture.js` for screen/window/tab selection. Returns a `MediaStream` that can be piped to `MediaRecorder`.
- **`MediaRecorder` API** — records a `MediaStream` into `webm` (VP8/VP9) or potentially other formats. Available in both Chrome and Edge.
- **`OffscreenCanvas` / `ImageBitmap`** — already used in `stitchImages()` for full-page capture. Could be used for GIF frame extraction.

### Key Constraints

1. **Privacy model** — RadKit makes zero network requests. All recording/encoding must happen client-side.
2. **MV3 service worker** — the background script cannot access DOM APIs. Any canvas/video processing must happen in a popup window, offscreen document, or content script.
3. **User activation** — `getDisplayMedia` requires a transient user gesture. The existing popup window pattern (`chrome.windows.create`) solves this.
4. **Storage limits** — `browser.storage.local` has a 10 MB default limit (even with `unlimitedStorage`). Video data should use blob URLs or IndexedDB rather than data URLs in storage.

### File Locations for Implementation

New files that would likely be created:

- `public/record.html` + `public/record.js` — popup window for recording (similar to `capture.html`/`capture.js`)
- Or extend `public/capture.html`/`capture.js` to support both single-frame and recording modes

Files that would be modified:

- `entrypoints/background.ts` — add `'recording'` case to `handleCapture()`, manage recording window lifecycle
- `entrypoints/popup/App.tsx` — add recording card to the popup, extend `CaptureMode` type
- `entrypoints/editor/Icons.tsx` — add a recording icon (e.g., `IconRecord`)
- `wxt.config.ts` — no new permissions needed (`getDisplayMedia` and `MediaRecorder` are standard web APIs)
