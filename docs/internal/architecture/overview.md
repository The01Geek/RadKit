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
3. **Background script captures** — uses `chrome.tabs.captureVisibleTab` (visible/full-page), injects the content script for area selection, or opens a popup window with `getDisplayMedia` for screen/window capture.
4. **Image stored** — the captured data URL is saved to `browser.storage.local` under the `capturedImage` key.
5. **History saved** — the image is also saved to IndexedDB (`radkit-history` database) with a generated JPEG thumbnail, capture metadata (mode, URL, title, timestamp), and empty tags. This step is non-blocking — failures are logged but do not prevent the editor from opening.
6. **Editor opens** — a new tab is created at `/editor.html`, which reads the image from storage and renders it on a Konva stage. The editor can also load images from IndexedDB history when opened with a `screenshotId` query parameter.

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
- `unlimitedStorage` — support large full-page screenshots and IndexedDB history storage


Note: Screen/window capture uses `getDisplayMedia` in a popup extension window (`capture.html`), which requires no special permissions beyond the standard web API. The `desktopCapture` and `offscreen` permissions have been removed.

## Privacy Model

RadKit makes **zero external network requests**. All fonts are bundled locally (`assets/fonts/`), all processing happens in-browser, and no analytics or telemetry is included. This is a core design constraint, not a feature toggle.

## File Structure

```
entrypoints/
├── background.ts        # Service worker — capture orchestration + history saving
├── content.ts           # Content script — area selection overlay
├── selection.css         # Styles for the selection UI
├── lib/                 # Shared utilities
│   ├── historyStore.ts  # IndexedDB screenshot history storage
│   └── thumbnailGenerator.ts  # Thumbnail generation and blob/data URL conversion
├── popup/               # Extension popup
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx          # Tab toggle between Capture and History views
│   ├── HistoryView.tsx  # History browsing UI with search, tags, and actions
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
