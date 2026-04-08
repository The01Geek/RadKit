# Popup UI

The extension popup (`entrypoints/popup/`) is a React app shown when the user clicks the RadKit icon in the browser toolbar.

## Layout

- **Header**: "RadKit" brand name with purple accent on "Kit", plus an "Alt+S" shortcut hint badge
- **Tab bar**: Two tabs -- "Capture" and "Record" -- implemented as `.tab-bar` with `.tab-btn` buttons. The active tab receives a purple highlight.
- **Capture tab**: Contains the 5 screenshot capture cards (stacked vertically) and a "View saved screenshots" link at the bottom that opens `screenshots.html` in a new tab.
- **Record tab**: Contains a settings grid, a "Start Recording" button, and a "View saved recordings" link that opens `recordings.html`.
- **Status bar**: Shown during capture with a pulsing dot animation

## Capture Cards

| Card | Mode | Icon | Description |
|------|------|------|-------------|
| Visible Viewport | `visible` | `IconMonitor` | "Capture what's on screen" |
| Select Area | `selection` | `IconSelection` | "Draw a custom rectangle" |
| Full Page | `fullpage` | `IconFile` | "Capture top to bottom" |
| Visible After Delay | `visible-delayed` | `IconTimer` | "3-second countdown" |
| Screen / Window | `desktop` | `IconDesktop` | "Capture screen or app window" |

Each card calls `handleCapture(mode)` on click, which:
1. Sets `isCapturing = true` and shows "Capturing..." status
2. Sends `{ type: 'capture', mode }` to the background script
3. On success: shows "Opening editor..." and closes the popup after 500ms
4. On failure: displays the error message and re-enables the buttons

## Record Tab

The Record tab provides screen recording controls with a settings grid and a start button.

### Settings Grid

| Setting | Options | Element |
|---------|---------|---------|
| Frame Rate | 15 / 24 / 30 / 60 fps | `.setting-select` dropdown |
| Audio | Mic / System / Both / None | `.setting-select` dropdown |
| Resolution | Source / 720p / 1080p / 4K | `.setting-select` dropdown |
| Webcam Overlay | On / Off | `.toggle` switch with `.toggle-slider` |

Each row is a `.setting-row` containing a `.setting-label` and the corresponding control.

### handleRecord()

Called when the "Start Recording" button (`.record-btn`, red with a pulsing `.record-dot`) is clicked:
1. Saves `recordingSettings` to `chrome.storage.local`
2. Sends `{ type: 'capture', mode: 'recording' }` to the background script

Note: The `'recording'` mode is not part of the `CaptureMode` type -- it is handled as a separate message type by the background script.

## Design: Dark Glassmorphism

Defined in `entrypoints/popup/App.css`:

- **Background**: `#0f0f14` with a subtle noise texture
- **Cards**: `rgba(255,255,255,0.06)` background, `backdrop-filter: blur(12px)`, `1px` border at `rgba(255,255,255,0.08)`
- **Hover effect**: Purple glow border, slight scale-up (1.02), background brightens
- **Tab bar**: `.tab-bar` with `.tab-btn` buttons; active tab highlighted with accent color
- **Settings grid**: `.setting-row`, `.setting-label`, `.setting-select` for recording options
- **Toggle switch**: `.toggle` and `.toggle-slider` for the Webcam Overlay setting
- **Record button**: `.record-btn` (red) with `.record-dot` pulsing animation
- **Recordings link**: `.recordings-link` for the "View saved recordings" link
- **Accent color**: `#a173fe` (purple) — used for brand text, icons, tab highlight, and the capture pulse
- **Font**: Inter (bundled locally in `assets/fonts/`)
- **Width**: ~320px

## Files

| File | Purpose |
|------|---------|
| `entrypoints/popup/index.html` | HTML shell for the popup |
| `entrypoints/popup/main.tsx` | React entry point |
| `entrypoints/popup/App.tsx` | Main component (~100 lines) |
| `entrypoints/popup/App.css` | All popup styles |
| `entrypoints/popup/style.css` | Minimal global resets |

## Icons

The popup imports icon components from `entrypoints/editor/Icons.tsx` (`IconMonitor`, `IconSelection`, `IconFile`, `IconTimer`, `IconDesktop`, `IconRecord`). These are shared with the editor to maintain visual consistency. Note: `IconRecord` is imported but not used as a card icon since recording is controlled via the separate Record tab.
