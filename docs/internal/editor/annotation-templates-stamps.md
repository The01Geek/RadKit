# Annotation Templates & Stamps

## Current Status

**Not implemented.** Listed as a planned feature in `docs/plans/2026-04-06-feature-roadmap.md`.

## Relevant Existing Infrastructure

### Drawing Element Model

All canvas annotations are represented as `DrawingElement` objects (`Editor.tsx:16–46`). Key fields for templates/stamps:

- `type: Tool` — currently `'crop' | 'pencil' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'blur' | 'image'`
- `imageSrc?: string` — used by the `image` tool to insert external images; could serve as the basis for stamp/overlay rendering
- Style properties: `color`, `strokeWidth`, `opacity`, `filled`, `dash`, font settings, shadow settings

### Style Presets System

The editor already has a **Style Presets** system (`Editor.tsx:54–58`, `Editor.tsx:210–215`):

```typescript
interface Preset {
    id: string;
    name: string;
    elements: DrawingElement[];
}
```

- Presets save and restore tool-specific style configurations (color, stroke, opacity, etc.)
- Stored in `chrome.storage.local` under the `stylePresets` key
- Applied via a templates dropdown menu (`.templates-menu-wrapper` in CSS)
- When a preset is active, switching tools applies the matching element style from that preset

**Important distinction:** The existing preset system stores *style configurations*, not *pre-built visual elements*. Annotation templates/stamps would need to place actual elements (or groups of elements) onto the canvas.

### Image Tool

The `image` tool (`Editor.tsx:124–151`, `ImageElement` component) allows inserting external images:
- Uses a file picker to load images
- Renders via Konva `Image` component
- Stores the image data in `DrawingElement.imageSrc`

This tool provides the closest analog to how stamps (pre-built graphic overlays) could work — loading a bundled SVG/PNG and placing it as an image element.

### Konva Canvas

The editor renders via `react-konva` (`Stage` → `Layer` → shape components). Any new template/stamp elements would need corresponding Konva rendering logic.

## What Does Not Exist Yet

1. **No template/stamp library** — no bundled assets for numbered steps, callout boxes, device frames, or watermarks
2. **No compound element concept** — no way to group multiple `DrawingElement` objects into a single reusable unit
3. **No stamp tool** — no tool mode for browsing and placing pre-built overlays
4. **No device frame rendering** — no logic for wrapping the canvas in phone/laptop/browser frames
5. **No watermark system** — no repeating overlay or positioned text/image watermark
6. **No template gallery UI** — no browsable catalog of available templates

## Key Files

| File | Relevance |
|------|-----------|
| `entrypoints/editor/Editor.tsx` | Core editor component (~1600 lines), tool system, element model, preset system |
| `entrypoints/editor/editor.css` | Editor styles including `.templates-menu-wrapper` for presets dropdown |
| `docs/plans/2026-04-06-feature-roadmap.md` | Feature roadmap listing this as a planned feature |
