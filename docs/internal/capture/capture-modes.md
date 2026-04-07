# Capture Modes

RadKit supports four capture modes, all implemented in `entrypoints/background.ts`.

## Visible Viewport (`captureVisibleTab`)

The simplest mode. Loads user settings via `loadSettings()` and calls `chrome.tabs.captureVisibleTab({ format, quality })` with the configured export format and quality. If the user has selected `webp`, the capture falls back to `png` since `captureVisibleTab` does not support WebP.

- **Triggered by**: Popup "Visible Viewport" button, or `Alt+S` keyboard shortcut
- **Limitations**: Cannot capture chrome://, edge://, or other restricted pages; `webp` format not supported by capture API (falls back to `png`)
- **Code**: `captureVisibleTab()` function in `background.ts`

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

## Visible After Delay (`visible-delayed`)

A timed variant of the Visible Viewport mode. Waits 3 seconds before capturing, allowing the user to open transient UI elements (drop-down menus, tooltips, hover states) that would otherwise close when interacting with the extension popup.

### Flow

1. User clicks the "Visible After Delay" card in the popup
2. Popup sends `{ type: 'capture', mode: 'visible-delayed' }` to the background service worker
3. Popup closes after ~500ms (standard behavior)
4. Background service worker waits 3 seconds (`setTimeout`, 3000ms)
5. `captureVisibleTab()` fires and captures the current visible viewport
6. Editor opens with the captured image — identical to the Visible Viewport flow

### Notes

- The 3-second delay runs entirely in the background service worker, independent of the popup lifecycle
- No new permissions required — reuses `captureVisibleTab()`
- The service worker's keep-alive window (typically 30s after the last event) is well within the 3-second delay
- If the user switches tabs during the delay, the wrong tab will be captured (acceptable trade-off for v1)

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

## Screen / Window Capture (`captureDesktopMedia`)

Captures the entire screen, a specific application window, or a browser tab using the browser's native `getDisplayMedia` API. This is the only mode that can capture content outside the browser.

- **Triggered by**: Popup "Screen / Window" button, or `Alt+D` keyboard shortcut
- **Permissions**: No special capture permissions required (uses standard `getDisplayMedia`)
- **Browser support**: Works in both Chrome and Microsoft Edge

### Flow

1. **Open capture window** — `chrome.windows.create()` opens a small popup extension window (`public/capture.html`, 1024×768) which has real user activation context
2. **`getDisplayMedia` in capture window** — the capture page immediately calls `navigator.mediaDevices.getDisplayMedia({ video: true })`, which opens the browser's native screen/window/tab picker
3. **User selects a source** — the browser grants the media stream
4. **Capture a frame** — the stream is played in a `<video>` element, metadata is loaded, a decoded frame is awaited via `setTimeout(300ms)` (works even when the window is backgrounded), then drawn to a `<canvas>` and exported as PNG data URL
5. **Send result back** — `chrome.runtime.sendMessage({ type: 'desktop-capture-result', ... })` sends the data URL to the background
6. **Background closes window** — the popup window is removed, stream tracks are stopped
7. **Store and open editor** — image stored under `capturedImage` in `browser.storage.local`, editor tab created

### Why a Popup Window Instead of Offscreen Document?

`getDisplayMedia` requires user activation (a transient user gesture). In MV3, transient activation does NOT transfer through `chrome.runtime.sendMessage()`. An offscreen document receives messages without user context, so `getDisplayMedia` is rejected with `NotAllowedError`. A real popup window created via `chrome.windows.create()` has user activation from the window creation, allowing `getDisplayMedia` to work reliably.

The previous approach using `chrome.desktopCapture.chooseDesktopMedia` + `getUserMedia` with `chromeMediaSource: 'desktop'` in an offscreen document failed on both Chrome and Edge due to this same user gesture limitation.

### Frame Capture Timing

The capture uses `setTimeout(300ms)` instead of `requestVideoFrameCallback` to wait for a decoded frame. This is intentional: `requestVideoFrameCallback` only fires when the page is actively rendering, but when the user selects a different tab from the picker, the capture window goes to the background and the callback never fires. `setTimeout` works regardless of page visibility.
