# Annotation Templates & Stamps

## Current Status

**Implemented** (PR #40, issue #31). The stamp tool supports two stamp types: **numbered steps** and **callout boxes**.

## Stamp Tool Architecture

### Tool Type & Data Model

The `Tool` union type includes `'stamp'`. A separate `StampType` union (`'numbered-step' | 'callout'`) distinguishes stamp sub-types.

The `DrawingElement` interface has four stamp-specific optional fields:

- `stampType?: StampType` — which stamp variant this element represents
- `stampNumber?: number` — auto-incrementing number for numbered-step stamps
- `stampTitle?: string` — title text for callout box stamps
- `stampBody?: string` — body text for callout box stamps

### StampElement Component

Stamps are rendered by the `StampElement` component (defined before the `Editor` function). It uses Konva `Group` as the root node, which receives `commonProps` (draggable, event handlers, position, opacity).

**Numbered Step** — `Group` > `Circle` (filled with `el.color`) + `Text` (centered number, white, bold). Default size: 48×48px.

**Callout Box** — `Group` > `Rect` (rounded rectangle with stroke) + `Rect` (colored left border, 6px wide) + `Text` (title, bold) + `Text` (body). Default size: 220×90px.

### Stamp Placement

Stamps are placed via single click on an empty canvas area (same pattern as the text tool). The `handleStageMouseDown` function has a `tool === 'stamp'` branch that:

1. Filters existing elements for numbered-step stamps and computes `max(stampNumber) + 1`
2. Creates a new `DrawingElement` with stamp-specific fields
3. Centers the stamp on the click position
4. Adds to history and selects the new element

### Stamp Picker UI

The stamp toolbar button wraps in a `.stamp-menu-wrapper` div with a dropdown picker. The picker shows two options with visual previews:

- **Numbered Step** — circular preview with "1"
- **Callout Box** — rectangle preview with colored left border

The picker closes on click-outside via a `mousedown` event listener.

### Properties Panel

When a stamp element is selected in the sidebar:

- **Numbered Step**: displays a number input to edit the step number
- **Callout Box**: displays title (text input) and body (textarea) fields
- Both types show color and opacity controls (inherited from the generic element properties)

### Settings Persistence

Stamp tool settings (color, opacity) persist in `toolSettingsRef` when switching between tools, matching the behavior of other tool types.

### Keyboard Shortcut

The stamp tool is activated with the `S` key, which also opens the stamp picker.

## Existing Infrastructure

### Style Presets System

The editor has a **Style Presets** system (`Preset` interface) that saves and restores complete element configurations. Stamp elements are included when saving presets since all `DrawingElement` fields (including stamp-specific ones) are spread into the preset data.

### Undo/Redo

Stamp placement, editing, and deletion are tracked in the history system. The `addToHistory` function stores the full elements array, so stamp-specific fields survive undo/redo operations.

### Export

Stamps export correctly via Konva's `toDataURL()` and `toBlob()` since Group nodes with their children (Circle, Rect, Text) are natively rasterized.

## What Does Not Exist Yet

1. **Device frames** (phone/tablet/laptop mockups)
2. **Watermarks**
3. **Custom/user-uploaded stamp images**
4. **Template marketplace or sharing**
5. **Integration with Style Presets** for stamp-specific preset configurations

## Key Files

| File | Relevance |
|------|-----------|
| `entrypoints/editor/Editor.tsx` | Core editor: Tool type, DrawingElement, StampElement component, stamp placement logic, properties panel |
| `entrypoints/editor/Icons.tsx` | IconStamp SVG icon |
| `entrypoints/editor/editor.css` | Stamp picker dropdown styles (`.stamp-picker`, `.stamp-option`) |
