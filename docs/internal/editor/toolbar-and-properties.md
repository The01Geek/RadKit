# Toolbar & Properties Panel

The editor has two surfaces for configuring element styles: the **top toolbar** and the **right sidebar properties panel**. Both surfaces expose color, stroke width, opacity, and other properties, but they serve different roles and currently have an asymmetric relationship.

## Top Toolbar

The toolbar (`div.top-toolbar`) displays the current drawing tool's settings. Key controls:

| Control | State variable | Purpose |
|---------|---------------|---------|
| Color picker | `color` | Sets the drawing color for new elements |
| Stroke width | `strokeWidth` | Sets line thickness |
| Opacity slider | `opacity` | Sets element transparency |
| Fill toggle | `filled` | Toggles shape fill |
| Font controls | `fontFamily`, `fontSize`, etc. | Text-specific settings (shown when text tool is active) |

### Color Picker Behavior

The toolbar color picker is an HTML5 `<input type="color">` inside `.color-tool`. When a color is selected:

1. `setColor(newValue)` updates the global toolbar color state
2. `setActivePresetId(null)` clears any active style preset
3. If an element is currently selected, `updateElementProperty(selectedId, { color: newValue })` applies the color to that element immediately
4. The new color is also used for future element creation

### Preset Color Buttons

Below the color picker, preset color swatches are available. Clicking a preset calls the same `setColor()` flow.

## Right Sidebar Properties Panel

The sidebar (`div.right-sidebar`) has two tabs: **Layers** and **Properties**.

### Layers Tab
- Lists all elements in the canvas
- Click to select an element (`handleElementClick`)
- Toggle visibility, reorder, delete

### Properties Tab
Shows editable properties for the currently selected element (`selectedId`). Each property change calls `updateElementProperty(id, updates)`:

```typescript
const updateElementProperty = (id: string, updates: Partial<DrawingElement>, saveToHistory = true) => {
    // 1. Updates the element in the elements array
    // 2. Syncs global toolbar state (e.g., setColor(updates.color))
    // 3. Clears active preset
    // 4. Adds to undo history
};
```

Properties shown vary by element type:

| Property | Shown for | Control |
|----------|-----------|---------|
| Color | All except blur, image | Color input + hex display |
| Stroke width | All except text, blur, image | Number input |
| Opacity | All | Range slider |
| Fill | Rectangle, circle | Checkbox |
| Font family | Text | Dropdown |
| Font size | Text | Number input |
| Text case | Text | Toggle buttons |
| Alignment | Text | Toggle buttons |
| Shadow | Text | Checkbox + color/blur/offset controls |
| Highlight | Text | Checkbox + color control |

## State Synchronization

### Selection syncs toolbar (bidirectional for properties panel)

When an element is selected via `handleElementClick()`:
- The toolbar state is synced TO the selected element's values (color, strokeWidth, opacity, etc.)
- This means the toolbar always reflects the selected element's current settings

When a property is changed via the **properties panel**:
- The element is updated
- The toolbar state is synced to match

When a property is changed via the **toolbar color picker**:
- The toolbar state variable is updated
- If an element is selected, the element's color is also updated via `updateElementProperty()`

### Visual flow

```
Toolbar color change  -->  setColor()  -->  affects future elements
                      -->  updateElementProperty()  -->  updates selected element (if any)

Properties panel change  -->  updateElementProperty()  -->  updates element
                                                        -->  syncs toolbar state

Element selection  -->  handleElementClick()  -->  syncs toolbar TO element
```

## Per-Tool Settings (`toolSettingsRef`)

When switching tools, the current toolbar state is saved into `toolSettingsRef` for the previous tool and restored for the new tool. This allows each tool to remember its last-used settings independently.
