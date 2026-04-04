# Extension Messaging

RadKit uses Chrome's messaging APIs to coordinate between the popup, background script, content script, and editor. All messages are plain objects with a `type` field.

## Message Types

### Popup → Background

| Message | Purpose | Response |
|---------|---------|----------|
| `{ type: 'capture', mode: 'visible' }` | Capture visible viewport | `{ success: true }` or `{ success: false, error: string }` |
| `{ type: 'capture', mode: 'selection' }` | Start area selection flow | Same |
| `{ type: 'capture', mode: 'fullpage' }` | Capture full scrollable page | Same |

Sent from `entrypoints/popup/App.tsx` via `browser.runtime.sendMessage`. The background listener in `entrypoints/background.ts` returns `true` from the listener to indicate an async response.

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

### Keyboard Shortcut → Background

The `chrome.commands.onCommand` listener in `entrypoints/background.ts` handles the `capture-visible` command (mapped to `Alt+S` in `wxt.config.ts`). This bypasses the popup entirely and directly calls `handleCapture('visible')`.

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

## Error Handling

- If the content script can't be reached (`start-selection` fails), the background throws: *"Could not connect to the page. Please refresh and try again."*
- If `captureVisibleTab` fails on restricted pages (chrome://, edge://), the error is rewritten to: *"Browser restriction: Cannot capture internal browser pages."*
- Selection has a 60-second timeout. After that, `waitForSelection` rejects with *"Selection timeout"*.
