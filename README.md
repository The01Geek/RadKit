# RadKit

Privacy-first screenshot and screen recording browser extension for Chrome and Microsoft Edge.

Forked from [raakkan/screenshot-editor](https://github.com/raakkan/screenshot-editor) (MIT License).

## Features

### Screenshots
- Five capture modes: visible viewport, select area, full page, timed delay, and screen/window
- Annotation editor: arrows, text, shapes, blur, crop, pencil, lines
- Export as PNG, JPEG, or clipboard
- All captures saved to local storage for easy access later

### Screen Recording
- Record your screen, a window, or a browser tab as WebM video
- Configurable frame rate (15/24/30/60 fps), resolution (up to 4K), and audio (microphone, system, or both)
- Floating control bar with pause, resume, stop, and discard
- Optional circular webcam overlay, draggable to any position
- In-browser preview before saving
- All recordings saved to local storage with a management page for browsing, downloading, and deleting

### General
- Tabbed popup interface: Capture for screenshots, Record for video
- Keyboard shortcuts: Alt+S (visible viewport), Alt+D (screen/window)
- Zero external network requests — fully offline, nothing leaves your device

## Development

```bash
npm install
npm run dev        # Dev mode with hot reload
npm run build      # Build for Chrome/Edge
```

## License

MIT — see [LICENSE](LICENSE) for details.
