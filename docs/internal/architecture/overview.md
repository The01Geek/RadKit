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
│  Handles capture orchestration, keyboard shortcuts,  │
│  and cross-component messaging                       │
├──────────────────────────────────────────────────────┤
│  Content Script                                      │
│  entrypoints/content.ts + selection.css               │
│  Injected into web pages for area-selection overlay   │
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
3. **Background script captures** — uses `chrome.tabs.captureVisibleTab` (visible/full-page), injects the content script for area selection, or uses `chrome.desktopCapture` with an offscreen document for screen/window capture.
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
- `desktopCapture` — access screen, window, and tab capture via `chrome.desktopCapture`
- `offscreen` — create offscreen documents for DOM-dependent APIs (e.g., `getUserMedia`) in the service worker context

## Privacy Model

RadKit makes **zero external network requests**. All fonts are bundled locally (`assets/fonts/`), all processing happens in-browser, and no analytics or telemetry is included. This is a core design constraint, not a feature toggle.

## File Structure

```
entrypoints/
├── background.ts        # Service worker — capture orchestration
├── content.ts           # Content script — area selection overlay
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
├── offscreen.html       # Offscreen document for desktop media capture
└── icon/                # Extension icons (16–128px)
```
