# Popup UI

The extension popup (`entrypoints/popup/`) is a React app shown when the user clicks the RadKit icon in the browser toolbar.

## Layout

- **Header**: "RadKit" brand name with purple accent on "Kit", plus an "Alt+S" shortcut hint badge
- **Tab toggle**: Two-button toggle to switch between "Capture" and "History" views
- **Capture tab** (default): 5 capture mode cards stacked vertically
- **History tab**: Browsable grid of past captures (see [Screenshot History](screenshot-history.md))
- **Status bar**: Shown during capture with a pulsing dot animation

The active tab is tracked via `activeTab` state (`PopupTab` type: `'capture' | 'history'`).

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

## Design: Dark Glassmorphism

Defined in `entrypoints/popup/App.css`:

- **Background**: `#0f0f14` with a subtle noise texture
- **Cards**: `rgba(255,255,255,0.06)` background, `backdrop-filter: blur(12px)`, `1px` border at `rgba(255,255,255,0.08)`
- **Hover effect**: Purple glow border, slight scale-up (1.02), background brightens
- **Accent color**: `#a173fe` (purple) — used for brand text, icons, and the capture pulse
- **Font**: Inter (bundled locally in `assets/fonts/`)
- **Width**: ~320px

## Files

| File | Purpose |
|------|---------|
| `entrypoints/popup/index.html` | HTML shell for the popup |
| `entrypoints/popup/main.tsx` | React entry point |
| `entrypoints/popup/App.tsx` | Main component with tab toggle between Capture and History views |
| `entrypoints/popup/HistoryView.tsx` | History browsing component (see [Screenshot History](screenshot-history.md)) |
| `entrypoints/popup/App.css` | All popup styles (including history view styles) |
| `entrypoints/popup/style.css` | Minimal global resets |

## Icons

The popup imports icon components from `entrypoints/editor/Icons.tsx` (`IconMonitor`, `IconSelection`, `IconFile`, `IconTimer`, `IconDesktop`, `IconClock`). The History tab uses `IconClock` for the tab button. The `HistoryView` component uses additional icons: `IconSearch`, `IconTag`, `IconExternalLink`, `IconCopy`, `IconTrash`, `IconCamera`.
