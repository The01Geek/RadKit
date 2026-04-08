# Popup UI

The extension popup (`entrypoints/popup/`) is a React app shown when the user clicks the RadKit icon in the browser toolbar.

## Layout

- **Header**: "RadKit" brand name with purple accent on "Kit", plus an "Alt+S" shortcut hint badge
- **5 capture cards + 1 webcam toggle**: Stacked vertically, each with an icon and label/description
- **Status bar**: Shown during capture with a pulsing dot animation

## Capture Cards

| Card | Mode | Icon | Description |
|------|------|------|-------------|
| Visible Viewport | `visible` | `IconMonitor` | "Capture what's on screen" |
| Select Area | `selection` | `IconSelection` | "Draw a custom rectangle" |
| Full Page | `fullpage` | `IconFile` | "Capture top to bottom" |
| Visible After Delay | `visible-delayed` | `IconTimer` | "3-second countdown" |
| Screen / Window | `desktop` | `IconDesktop` | "Capture screen or app window" |
| Webcam Overlay | *(toggle)* | `IconWebcam` | "Show webcam bubble on page" / "Remove webcam bubble from page" |

Each capture card calls `handleCapture(mode)` on click, which:
1. Sets `isCapturing = true` and shows "Capturing..." status
2. Sends `{ type: 'capture', mode }` to the background script
3. On success: shows "Opening editor..." and closes the popup after 500ms
4. On failure: displays the error message and re-enables the buttons

The **Webcam Overlay** card works differently — it calls `handleWebcamToggle()`, which:
1. Sends `{ type: 'toggle-webcam', action: 'start' | 'stop' }` to the background script
2. Tracks three states via `WebcamState`: `'off'`, `'starting'`, `'on'`
3. When active, the card receives the `.active` CSS class (purple-tinted background and solid accent icon)
4. The label toggles between "Webcam Overlay" and "Hide Webcam"

## Design: Dark Glassmorphism

Defined in `entrypoints/popup/App.css`:

- **Background**: `#0f0f14` with a subtle noise texture
- **Cards**: `rgba(255,255,255,0.06)` background, `backdrop-filter: blur(12px)`, `1px` border at `rgba(255,255,255,0.08)`
- **Hover effect**: Purple glow border, slight scale-up (1.02), background brightens
- **Active state**: `.capture-card.active` — purple-tinted background (`rgba(161, 115, 254, 0.15)`), accent border, solid accent icon background (used for the webcam toggle when on)
- **Accent color**: `#a173fe` (purple) — used for brand text, icons, and the capture pulse
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

The popup imports icon components from `entrypoints/editor/Icons.tsx` (`IconMonitor`, `IconSelection`, `IconFile`, `IconTimer`, `IconDesktop`, `IconWebcam`). These are shared with the editor to maintain visual consistency.
