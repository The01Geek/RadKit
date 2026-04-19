# Annotation Templates & Stamps

## Current Status

**Implemented.** Two stamp tools are available: **Step** (numbered circle) and **Callout** (titled box with body text).

## Stamp Tools

### Step Stamp (`stamp-step`)

A numbered circle overlay for marking sequential steps in a screenshot.

- **Rendering**: Konva `Group` containing a filled `Circle` and a centered `Text` with the step number
- **Auto-numbering**: When placed, the step number is automatically set to one higher than the highest existing step stamp on the canvas
- **Default size**: 60×60 pixels
- **Default color**: `#6366f1` (indigo)
- **Default font size**: 30px
- **Keyboard shortcut**: `s`

#### Sidebar Properties

| Property | Control | Description |
|----------|---------|-------------|
| Step Number | Number input (min 1) | The number displayed inside the circle |
| Font Size | Range slider (8–100px) | Size of the number text |
| Color | Color picker | Fill color of the circle |
| Opacity | Range slider | Element transparency |

### Callout Stamp (`stamp-callout`)

A titled box with body text, useful for annotating areas with explanatory notes.

- **Rendering**: Konva `Group` containing:
  - A white `Rect` with colored border and 8px corner radius
  - A tinted header `Rect` (color + `22` alpha)
  - A 4px colored left accent bar
  - A bold title `Text` in the header area
  - A body `Text` below the header (75% of title font size)
- **Default size**: 240×120 pixels
- **Default color**: `#6366f1` (indigo)
- **Default font size**: 24px (title), 18px (body, computed as `fontSize * 0.75`)
- **Default title**: "Title"
- **Default body**: "Body text here"
- **Keyboard shortcut**: `k`

#### Sidebar Properties

| Property | Control | Description |
|----------|---------|-------------|
| Title | Text input | Header text displayed in bold |
| Body Text | Textarea (3 rows) | Content text below the header |
| Font Size | Range slider (8–100px) | Title font size (body scales proportionally) |
| Border Width | Range slider (1–10px) | Stroke width of the outer border |
| Color | Color picker | Border, accent bar, and header text color |
| Opacity | Range slider | Element transparency |

## DrawingElement Extensions

Two new optional properties on `DrawingElement` support stamps:

```typescript
stampNumber?: number;    // Step stamp: the displayed number
stampBodyText?: string;  // Callout stamp: the body text content
```

The `text` field (already on `DrawingElement`) is reused for the callout title.

## Per-Tool Settings Persistence

Both stamp tools participate in the existing `toolSettingsRef` system:

| Tool | Persisted settings |
|------|-------------------|
| `stamp-step` | `color`, `strokeWidth`, `opacity`, `fontSize` (default 30) |
| `stamp-callout` | `color`, `strokeWidth` (default 2), `opacity`, `fontSize` (default 24) |

When switching to a stamp tool, `fontSize` is restored from `toolSettingsRef`.

## Transform Behavior

- **Step stamp**: Scales uniformly — `width`, `height`, and `fontSize` all scale by `Math.max(scaleX, scaleY)`
- **Callout stamp**: `width` and `height` scale independently (allowing non-uniform resize); `fontSize` scales by the larger axis

## What Does Not Exist Yet

1. **No device frame rendering** — no logic for wrapping the canvas in phone/laptop/browser frames
2. **No watermark system** — no repeating overlay or positioned text/image watermark
3. **No template gallery UI** — no browsable catalog of available templates
4. **No compound element concept** — stamps are single `DrawingElement` objects rendered as Konva `Group`s, not multi-element groups

## Key Files

| File | Relevance |
|------|-----------|
| `entrypoints/editor/Editor.tsx` | Stamp tool logic, rendering, sidebar properties, transform handling |
| `entrypoints/editor/Icons.tsx` | `IconStampStep` and `IconStampCallout` SVG icon components |
| `entrypoints/editor/editor.css` | `.prop-textarea` and `input[type="number"]` styles for stamp property controls |
