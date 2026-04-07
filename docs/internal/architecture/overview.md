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
- `storage` — persist captured images, style presets, and S3 credentials (via `browser.storage.sync`)
- `scripting` — inject content scripts dynamically for selection and full-page capture
- `unlimitedStorage` — support large full-page screenshots (data URLs can be 10+ MB)

**Optional host permissions** (`optional_host_permissions: ['*://*/*']`): Requested dynamically via `browser.permissions.request()` when the user configures an S3 endpoint. This allows the extension to upload screenshots to the user's S3-compatible storage without requiring broad network access at install time.

Note: Screen/window capture uses `getDisplayMedia` in a popup extension window (`capture.html`), which requires no special permissions beyond the standard web API. The `desktopCapture` and `offscreen` permissions have been removed.

## Privacy Model

By default, RadKit makes **zero external network requests**. All fonts are bundled locally (`assets/fonts/`), all processing happens in-browser, and no analytics or telemetry is included.

**Opt-in S3 sharing:** When a user explicitly configures S3-compatible credentials via the options page (`entrypoints/options/`), the extension can upload screenshots to the user-provided S3 endpoint. This is the only external network communication RadKit will ever make, and it only occurs when:
1. The user has manually configured S3 credentials in the settings page.
2. The user clicks the "Share" button in the editor.
3. The user has granted host permissions for the configured endpoint.

No data is sent to any Anthropic, RadKit, or third-party service. The S3 endpoint is entirely user-provided and user-controlled. Host permissions are requested dynamically at configuration time — not at install.

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
├── editor/              # Annotation editor
│   ├── index.html
│   ├── main.tsx
│   ├── Editor.tsx        # Main editor component (1600+ lines)
│   ├── editor.css
│   └── Icons.tsx         # SVG icon components
└── options/             # Settings page (S3 credentials)
    ├── index.html
    ├── main.tsx
    ├── Options.tsx
    └── options.css
lib/
├── s3-client.ts         # Lightweight S3 upload client with SigV4 signing
└── s3-storage.ts        # S3 credential CRUD via browser.storage.sync
assets/
├── fonts/               # Bundled Inter font files
├── icon.png
└── logo.png
public/
├── capture.html         # Popup window for screen/window capture (getDisplayMedia)
├── capture.js           # Capture logic for getDisplayMedia frame grab
└── icon/                # Extension icons (16–128px)
```
