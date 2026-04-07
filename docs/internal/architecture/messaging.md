# Extension Messaging

RadKit uses Chrome's messaging APIs to coordinate between the popup, background script, content script, and editor. All messages are plain objects with a `type` field.

## Message Types

### Popup → Background

| Message | Purpose | Response |
|---------|---------|----------|
| `{ type: 'capture', mode: 'visible' }` | Capture visible viewport | `{ success: true }` or `{ success: false, error: string }` |
| `{ type: 'capture', mode: 'selection' }` | Start area selection flow | Same |
| `{ type: 'capture', mode: 'fullpage' }` | Capture full scrollable page | Same |
| `{ type: 'capture', mode: 'desktop' }` | Capture screen, window, or tab via desktop media picker | Same |
| `{ type: 'capture', mode: 'recording' }` | Start screen recording session | Same |

Sent from `entrypoints/popup/App.tsx` via `browser.runtime.sendMessage`. The background listener in `entrypoints/background.ts` returns `true` from the listener to indicate an async response.

### Recording Window → Background

| Message | Purpose |
|---------|---------|
| `{ type: 'recording-complete', success: true }` | Recording saved, close the recording window |
| `{ type: 'recording-complete', success: false, error: string }` | Recording failed |

Sent from `public/record.js` via `chrome.runtime.sendMessage`. The background script listens for this in `startRecordingSession()`. If the recording window is closed manually instead, `chrome.windows.onRemoved` detects it and rejects the promise.

### Background → Content Script

| Message | Purpose |
|---------|---------|
| `{ type: 'start-selection' }` | Tell the content script to show the selection overlay |
| `{ type: 'cleanup-selection' }` | Remove any leftover selection UI from the page |

Sent via `browser.tabs.sendMessage(tabId, ...)`.

### Content Script → Background

| Message | Purpose |
|---------|---------|
| `{ type: 'selection-complete', rect: { x, y, width, height } }` | User confirmed a selection area |
| `{ type: 'selection-complete', canceled: true }` | User canceled selection (Escape key or Cancel button) |

Sent via `browser.runtime.sendMessage`. The background script listens for this in `waitForSelection()` with a 60-second timeout.

### Background → Offscreen Document

| Message | Purpose | Response |
|---------|---------|----------|
| `{ type: 'capture-desktop-frame', streamId: string }` | Capture a single frame from the desktop media stream | `{ success: true, dataUrl: string }` or `{ success: false, error: string }` |

Sent via `chrome.runtime.sendMessage`. The offscreen document (`public/offscreen.html`) listens for this message, calls `navigator.mediaDevices.getUserMedia` with the provided `streamId`, draws one frame to a canvas, and returns the PNG data URL. The offscreen document is created on demand and destroyed after each capture.

### Keyboard Shortcut → Background

The `chrome.commands.onCommand` listener in `entrypoints/background.ts` handles:
- `capture-visible` (mapped to `Alt+S` in `wxt.config.ts`) — calls `handleCapture('visible')`
- `capture-desktop` (mapped to `Alt+D` in `wxt.config.ts`) — calls `handleCapture('desktop')`

Both bypass the popup entirely.

## Flow: Area Selection

```
Popup                    Background                Content Script
  │                         │                          │
  ├─ capture/selection ────►│                          │
  │                         ├─ inject content.js ─────►│
  │                         ├─ start-selection ───────►│
  │                         │                          ├─ shows overlay
  │                         │                          ├─ user drags/resizes
  │                         │◄── selection-complete ───┤
  │                         ├─ captureVisibleTab       │
  │                         ├─ cropImage (in tab)      │
  │                         ├─ store to storage.local  │
  │                         ├─ open editor.html        │
  │◄── { success: true } ──┤                          │
  │                         ├─ cleanup-selection ─────►│
```

## Flow: Desktop Capture

```
Popup                    Background                Offscreen Document
  │                         │                          │
  ├─ capture/desktop ──────►│                          │
  │                         ├─ chooseDesktopMedia      │
  │                         │   (user picks source)    │
  │                         ├─ createDocument ─────────► (created)
  │                         ├─ capture-desktop-frame ──►│
  │                         │                          ├─ getUserMedia(streamId)
  │                         │                          ├─ draw frame to canvas
  │                         │◄── { dataUrl } ──────────┤
  │                         ├─ store to storage.local  │
  │                         ├─ open editor.html        │
  │                         ├─ closeDocument ──────────► (destroyed)
  │◄── { success: true } ──┤                          │
```

## Error Handling

- If the content script can't be reached (`start-selection` fails), the background throws: *"Could not connect to the page. Please refresh and try again."*
- If `captureVisibleTab` fails on restricted pages (chrome://, edge://), the error is rewritten to: *"Browser restriction: Cannot capture internal browser pages."*
- Selection has a 60-second timeout. After that, `waitForSelection` rejects with *"Selection timeout"*.
- If the user dismisses the desktop media picker without selecting a source, `chooseDesktopMedia` returns an empty `streamId`, which is caught as *"Selection canceled"*.
