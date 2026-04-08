# Area Selection

The area selection system is a content script (`entrypoints/content.ts`) injected into web pages to let users draw a rectangular capture region. It has its own CSS (`entrypoints/selection.css`) with a glassmorphic design.

## How It Works

### Lifecycle

1. **Injection** — the background script injects `content.ts` via `chrome.scripting.executeScript` when the user chooses "Select Area"
2. **Guard** — a `window.__screenshot_selection_active` flag prevents duplicate listeners if the script is injected multiple times
3. **Message listener** — waits for `start-selection` to create the overlay, `cleanup-selection` to tear it down, and `annotation-screenshot-ready` to receive a pre-captured viewport for the blur tool
4. **Cleanup** — removes all DOM elements by ID and class prefix, resets all state variables, removes event listeners

### DOM Structure

When active, the content script creates:

```
body
└── .screenshot-selection-overlay  (id="screenshot-selection-root")
│   ├── .screenshot-selection-hint     "Drag to select area..."
│   ├── .screenshot-selection-box      The selection rectangle
│   │   ├── .screenshot-selection-handle.nw
│   │   ├── .screenshot-selection-handle.n
│   │   ├── .screenshot-selection-handle.ne
│   │   ├── ... (8 resize handles total)
│   │   └── .screenshot-selection-actions
│   │       ├── button.annotate        "✏ Annotate" (lazy-loads annotation mode)
│   │       ├── button.confirm         "✓ Edit"
│   │       └── button.cancel          "✕ Cancel"
│   └── .screenshot-selection-size     "320 × 240" dimension label
│
├── <canvas id="screenshot-annotation-canvas">   (only when annotation mode active)
│
└── <div id="screenshot-annotation-host">         (Shadow DOM toolbar, only when annotation mode active)
      └── #shadow-root (closed)
            ├── <style>                            Inlined toolbar CSS
            ├── <div class="ann-toolbar">          Tool buttons, settings
            └── <div class="ann-action-bar">       Done / Edit / Cancel
```

### Interaction Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Selecting** | Mousedown on overlay | Draw a new rectangle from cursor position |
| **Resizing** | Mousedown on a handle | Resize from the corresponding edge/corner |
| **Moving** | Mousedown on the selection box (after handles created) | Drag the entire selection |
| **Annotating** | Click "Annotate" button | Lazy-loads annotation engine, shows toolbar and drawing canvas |

### Annotation Mode

When the user clicks "Annotate", the annotation engine module is dynamically imported (`import('./annotation/annotation-engine')`). This keeps the base content script lightweight — annotation code is only loaded on demand.

The annotation system uses:
- A **HTML5 Canvas** overlaid on the selection region for drawing (not React/Konva, to avoid framework dependencies in the content script)
- A **Shadow DOM** toolbar with closed shadow root for complete CSS isolation from host page styles
- A mutable **state object** with element list, history stack (max 50 entries), and tool settings

Available annotation tools: pencil, line, arrow, rectangle, circle, text, blur, image (8 tools — crop is intentionally omitted since the selection area itself defines the crop region).

#### "Done" Flow
1. User clicks "Done" in annotation toolbar
2. Content script hides all overlay elements
3. Sends `{ type: 'selection-complete', rect, annotations, mode: 'done' }` to background
4. Background captures viewport, crops to selection rect, composites annotations onto the cropped image
5. Image is auto-downloaded — no editor tab is opened

#### "Edit" Flow
1. User clicks "Edit" in annotation toolbar
2. Content script hides all overlay elements
3. Sends `{ type: 'selection-complete', rect, annotations, mode: 'edit' }` to background
4. Background captures, crops, serializes annotations with DPR scaling, stores as `pendingAnnotations` in `browser.storage.local`
5. Editor tab opens, reads `pendingAnnotations`, merges them into the Konva canvas as `DrawingElement` objects

#### Annotation Coordinate System
- During annotation: all coordinates are in **CSS pixels** relative to the selection rect's top-left corner
- On serialization for editor: coordinates are multiplied by `devicePixelRatio` to match the DPR-scaled cropped image
- On compositing for "Done": `ctx.scale(dpr, dpr)` transforms the canvas so annotation CSS pixel coords map correctly to the DPR-scaled image

### Keyboard Shortcuts

- **Escape** — cancel selection (or exit annotation mode if active)
- **Enter** — confirm selection (only when actions bar is visible, not in annotation mode)
- **Ctrl+Z** — undo annotation (in annotation mode)
- **Ctrl+Y / Ctrl+Shift+Z** — redo annotation (in annotation mode)

### Z-Index Strategy

All selection UI elements use extremely high z-indexes to appear above page content:

| Element | z-index |
|---------|---------|
| Overlay | 2147483640 |
| Selection box | 2147483645 |
| Size label | 2147483646 |
| Annotation canvas | 2147483646 |
| Handles | 2147483647 |
| Actions bar | 2147483647 |
| Annotation toolbar (Shadow DOM) | 2147483647 |

All values are clamped to `INT32_MAX` (2147483647) to comply with the CSS specification.

### Message Protocol

| Message | Direction | Fields | Purpose |
|---------|-----------|--------|---------|
| `start-selection` | background → content | — | Begin selection overlay |
| `cleanup-selection` | background → content | — | Tear down all selection/annotation UI |
| `annotation-screenshot-ready` | background → content | `dataUrl: string` | Pre-captured viewport for blur tool |
| `selection-complete` | content → background | `rect`, `canceled?`, `annotations?`, `mode?` | Report selection result |

### Styling

The selection CSS (`selection.css`) uses a glassmorphic design:
- **Selection box**: 2px solid border with blue accent, `box-shadow: 0 0 0 9999px rgba(0,0,0,0.3)` creates the darkened-outside effect
- **Handles**: 12px white circles with blue border, scale up on hover
- **Actions bar**: Frosted glass background with `backdrop-filter: blur(12px)`
- **Hint banner**: Slides down with a CSS animation, pill-shaped with blur backdrop
- **CSS variables**: `--select-primary`, `--select-border`, `--glass-bg`, etc. for consistent theming
- **Annotation toolbar**: Glassmorphic style matching the selection UI, isolated in Shadow DOM

### Cleanup

The `cleanup()` function is thorough:
1. Destroys the annotation engine (if active), removing canvas and Shadow DOM host
2. Removes annotation-related elements by ID (`screenshot-annotation-canvas`, `screenshot-annotation-host`)
3. Removes the root element by ID
4. Removes the injected stylesheet by ID
5. Fallback scan for any stray elements with class prefix `screenshot-selection-`
6. Resets all JavaScript state variables
7. Removes all document-level event listeners

This robustness is intentional — the selection UI must never leave artifacts on the page after capture completes or is canceled.

### Module Structure

The annotation system is organized as a separate module under `entrypoints/annotation/`:

| File | Purpose |
|------|---------|
| `annotation-types.ts` | Shared types: `AnnotationElement`, `AnnotationTool`, `AnnotationState` |
| `annotation-state.ts` | Pure state management functions: add/remove elements, undo/redo, history |
| `annotation-renderer.ts` | Canvas 2D rendering for all tool types |
| `annotation-toolbar.ts` | Shadow DOM toolbar builder with tool buttons, settings controls |
| `annotation-engine.ts` | Orchestrator: creates canvas, wires events, manages state lifecycle |
| `annotation-serializer.ts` | Converts `AnnotationElement[]` to `DrawingElement[]` with DPR scaling |
