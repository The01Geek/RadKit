# Capture Modes

RadKit supports three capture modes, all implemented in `entrypoints/background.ts`.

## Visible Viewport (`captureVisibleTab`)

The simplest mode. Calls `chrome.tabs.captureVisibleTab({ format: 'png' })` and returns the data URL directly.

- **Triggered by**: Popup "Visible Viewport" button, or `Alt+S` keyboard shortcut
- **Limitations**: Cannot capture chrome://, edge://, or other restricted pages
- **Code**: `captureVisibleTab()` function (~15 lines)

## Area Selection (`captureWithSelection`)

Lets the user draw a rectangle on the page, then crops the captured image to that rectangle.

### Flow

1. **Inject content script** — tries `content-scripts/content.js` then `content.js` as fallback paths
2. **Wait 300ms** — for script initialization
3. **Send `start-selection`** — content script shows the overlay
4. **`waitForSelection()`** — listens for `selection-complete` message (60s timeout)
5. **Wait 300ms** — for overlay cleanup animation
6. **`captureVisibleTab()`** — captures the viewport
7. **`cropImage()`** — crops using an offscreen canvas injected into the tab

### Cropping

The `cropImage()` function runs inside the page (via `chrome.scripting.executeScript`) to access the DOM's `Image` and `Canvas` APIs. It accounts for `devicePixelRatio` to produce pixel-perfect crops on high-DPI displays.

**Important**: The crop uses the tab's DPR, not a fixed value. On a 2x display, a 100×100 CSS-pixel selection produces a 200×200 pixel image.

## Full Page (`captureFullPage`)

Captures the entire scrollable page by stitching multiple viewport-sized screenshots.

### Flow

1. **Get page dimensions** — `scrollHeight`, `clientHeight`, `clientWidth`, DPR
2. **Scroll loop** — scrolls down by `clientHeight` each iteration (max 50 iterations)
3. **Hide floating elements** — after the first capture, fixed/sticky elements (headers, navbars) are hidden to prevent duplication
4. **Capture each frame** — `captureVisibleTab()` at each scroll position
5. **Stitch** — combines all frames using `OffscreenCanvas` (max 30,000px height)
6. **Restore** — unhides floating elements and restores original scroll position

### Floating Element Hiding (`hideFloatingElements`)

This function injects CSS and JavaScript into the page to hide elements that would appear in every frame:

- **Targeted selectors**: `header`, `nav`, `.navbar`, `.sticky`, `[role="banner"]`, `[role="navigation"]`, etc.
- **Broad scan**: Any element with `position: fixed` or `position: sticky` gets hidden
- **High z-index heuristic**: Absolute-positioned elements near the top with z-index ≥ 50 and width > 45% of viewport are also hidden
- **Class-based**: Hidden elements get the `wxt-screenshot-hidden` class for easy restoration

### Stitching (`stitchImages`)

Uses `OffscreenCanvas` in the service worker context:

- Canvas width matches the first frame's pixel width
- Total height = `min(scrollHeight × DPR, 30000px)` safety cap
- Overlap detection prevents duplicate content between frames
- First frame draws full viewport; subsequent frames calculate overlap from previous frame's end position
- Output is PNG via `canvas.convertToBlob()`, converted to data URL

### Known Limitations

- **30,000px cap** — extremely long pages may be truncated
- **50-iteration limit** — safety valve for infinite-scroll pages
- **Lazy-loaded content** — 800ms settle time may not be enough for slow connections
- **Dynamic content** — content that changes between scrolls can cause visual seams
