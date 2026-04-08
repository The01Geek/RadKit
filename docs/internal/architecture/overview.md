# Architecture Overview

RadKit is a browser extension built with the [WXT](https://wxt.dev/) framework, React 19, TypeScript, and Konva (2D canvas). It targets Chrome and Microsoft Edge.

## Extension Components

```
┌──────────────────────────────────────────────────────┐
│  Browser Action (Popup)                              │
│  entrypoints/popup/                                  │
│  React app shown when clicking the extension icon    │
├──────────────────────────────────────────────────────┤
│  Background Script (Service Worker)                  │
│  entrypoints/background.ts                           │
│  Handles capture orchestration, webcam overlay        │
│  toggling, keyboard shortcuts, and messaging         │
├──────────────────────────────────────────────────────┤
│  Content Script (Selection)                           │
│  entrypoints/content.ts + selection.css               │
│  Injected into web pages for area-selection overlay   │
├──────────────────────────────────────────────────────┤
│  Content Script (Webcam Overlay)                      │
│  entrypoints/webcam-overlay.ts                        │
│  Injected into web pages for circular webcam bubble   │
├──────────────────────────────────────────────────────┤
│  Editor Page                                         │
│  entrypoints/editor/                                 │
│  Full-page React app (editor.html) with Konva canvas │
│  for annotating captured screenshots                 │
└──────────────────────────────────────────────────────┘
```

## Data Flow

1. **User initiates capture** — via the popup (click) or keyboard shortcut (`Alt+S` for visible, `Alt+D` for desktop).
2. **Popup sends message** — `{ type: 'capture', mode: 'visible' | 'selection' | 'fullpage' | 'desktop' }` to the background script via `browser.runtime.sendMessage`.
3. **Background script captures** — uses `chrome.tabs.captureVisibleTab` (visible/full-page), injects the content script for area selection, or opens a popup window with `getDisplayMedia` for screen/window capture.
4. **Image stored** — the captured data URL is saved to `browser.storage.local` under the `capturedImage` key.
5. **Editor opens** — a new tab is created at `/editor.html`, which reads the image from storage and renders it on a Konva stage.

## Key Technologies

| Technology | Purpose | Entry point |
|-----------|---------|-------------|
| WXT | Extension framework, dev server, build tooling | `wxt.config.ts` |
| React 19 | UI for popup and editor | `entrypoints/popup/`, `entrypoints/editor/` |
| Konva / react-konva | 2D canvas for the annotation editor | `entrypoints/editor/Editor.tsx` |
| TypeScript | Type safety across the codebase | `tsconfig.json` |

## Permissions

Declared in `wxt.config.ts` → `manifest.permissions`:

- `activeTab` — access the currently active tab for capture
- `storage` — persist captured images and style presets
- `scripting` — inject content scripts dynamically for selection and full-page capture
- `unlimitedStorage` — support large full-page screenshots (data URLs can be 10+ MB)


Note: Screen/window capture uses `getDisplayMedia` in a popup extension window (`capture.html`), which requires no special permissions beyond the standard web API. The `desktopCapture` and `offscreen` permissions have been removed.

## Privacy Model

RadKit makes **zero external network requests**. All fonts are bundled locally (`assets/fonts/`), all processing happens in-browser, and no analytics or telemetry is included. This is a core design constraint, not a feature toggle.

## File Structure

```
entrypoints/
├── background.ts        # Service worker — capture orchestration
├── content.ts           # Content script — area selection overlay
├── webcam-overlay.ts    # Content script — webcam bubble overlay
├── selection.css         # Styles for the selection UI
├── popup/               # Extension popup
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   └── App.css
└── editor/              # Annotation editor
    ├── index.html
    ├── main.tsx
    ├── Editor.tsx        # Main editor component (1600+ lines)
    ├── editor.css
    └── Icons.tsx         # SVG icon components
assets/
├── fonts/               # Bundled Inter font files
├── icon.png
└── logo.png
public/
├── capture.html         # Popup window for screen/window capture (getDisplayMedia)
├── capture.js           # Capture logic for getDisplayMedia frame grab
└── icon/                # Extension icons (16–128px)
```
