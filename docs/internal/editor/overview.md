# Editor Overview

The editor (`entrypoints/editor/Editor.tsx`, ~1600 lines) is the core feature of RadKit. It opens in a new tab after any capture and provides a Konva-based canvas for annotating screenshots.

## Architecture

The editor is a single React component (`Editor`) that manages all state with `useState` hooks. There is no external state management library.

### Key State Groups

| State | Purpose |
|-------|---------|
| `image`, `imageData` | The captured screenshot loaded from `chrome.storage.local` |
| `tool` | Current drawing tool: `crop`, `pencil`, `line`, `arrow`, `rectangle`, `circle`, `text`, `blur`, `image`, `stamp-step`, `stamp-callout` |
| `elements` | Array of `DrawingElement` objects on the canvas |
| `selectedId` | Currently selected element for transformation |
| `history`, `historyIndex` | Undo/redo stack (array of element snapshots) |
| `zoom` | Current zoom level (starts at fit-to-viewport) |
| `cropRect`, `isCropping` | Active crop region |
| `presets` | Saved style presets (persisted to `chrome.storage.local`) |

## Drawing Elements

All annotations are represented as `DrawingElement` objects:

```typescript
interface DrawingElement {
    id: string;
    type: Tool;
    points?: number[];           // For pencil, line, arrow
    x: number; y: number;
    width?: number; height?: number;
    text?: string;               // For text elements
    color: string;
    strokeWidth: number;
    filled?: boolean;            // For shapes
    visible: boolean;            // Toggle visibility
    name: string;                // Display name in layers panel
    stampNumber?: number;        // For stamp-step
    stampBodyText?: string;      // For stamp-callout
    // Advanced: opacity, dash, fontFamily, fontSize, shadows, etc.
}
```

## Tools

| Tool | Element type | Interaction |
|------|-------------|-------------|
| Crop | N/A | Drag to define crop region, confirm/cancel buttons. Flattens all layers (background + elements) before cropping. |
| Pencil | Freehand line | Click-drag to draw, stores `points[]` |
| Line | Straight line | Click start, drag to end. Direction is preserved when drawing right-to-left. |
| Arrow | Arrow line | Like line, with arrowhead (optional start pointer). Direction is preserved when drawing right-to-left. |
| Rectangle | Rect shape | Click-drag corner-to-corner (supports all drag directions) |
| Circle | Ellipse | Click-drag to define bounding box (supports all drag directions) |
| Text | Text label | Click to place, type directly on the canvas (inline editing). Double-click existing text to edit. |
| Blur | Pixelated region | Click-drag to define blur area (supports all drag directions) |
| Image | Inserted image | File picker, placed at click position |
| Step Stamp | Numbered circle | Click to place; auto-numbers sequentially. Renders as a Konva Group (Circle + Text). |
| Callout Stamp | Titled box with body | Click to place; editable title and body text. Renders as a Konva Group (Rect + accent bar + header + body Text). |

## Defaults

- **Default color**: Red (`#ff0000`) for all drawing tools
- **Default stroke width**: 6px for all drawing tools
- **Default font size**: 30px for text tool

## Per-Tool Settings Persistence

Settings are remembered per tool via `toolSettingsRef` (a ref holding a `Record<Tool, Partial<DrawingElement>>`). When you switch from pencil (red, 5px) to arrow (blue, 3px) and back, pencil restores red/5px. This state lives in the ref, not in `useState`, to avoid render cycles.

## Konva Rendering

The canvas uses `react-konva`:
- `Stage` → `Layer` → individual shape components (`Line`, `Arrow`, `Rect`, `Ellipse`, `Text`)
- The `PixelatedBlur` custom component renders blur regions by downscaling and upscaling a canvas crop. Normalizes negative width/height for right-to-left drawing.
- On mouse-up, shape elements (rectangle, circle, blur) are normalized so `x,y` is the top-left corner and `width`/`height` are positive. Line and arrow elements skip this normalization to preserve their directional points.
- The `ImageElement` component handles inserted images
- Stamp elements render as Konva `Group` components containing multiple shapes (Circle/Rect/Text)
- A `Transformer` is attached to the selected element for resize/rotate handles

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z` | Redo |
| `Delete` / `Backspace` | Delete the selected element |
| Tool letter keys | Switch to tool (e.g., `r` for rectangle, `a` for arrow, `s` for step stamp, `k` for callout stamp) |

## Export

The editor supports:
- **Copy to clipboard** — renders the stage to a blob, writes to clipboard via `navigator.clipboard.write`
- **Download** — renders to PNG and triggers a download link
- **Save** — same as download with a custom filename

All export functions use `stageRef.current.toBlob()` or `stageRef.current.toDataURL()`.
