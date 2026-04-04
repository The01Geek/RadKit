# Area Selection

The area selection system is a content script (`entrypoints/content.ts`) injected into web pages to let users draw a rectangular capture region. It has its own CSS (`entrypoints/selection.css`) with a glassmorphic design.

## How It Works

### Lifecycle

1. **Injection** — the background script injects `content.ts` via `chrome.scripting.executeScript` when the user chooses "Select Area"
2. **Guard** — a `window.__screenshot_selection_active` flag prevents duplicate listeners if the script is injected multiple times
3. **Message listener** — waits for `start-selection` to create the overlay, `cleanup-selection` to tear it down
4. **Cleanup** — removes all DOM elements by ID and class prefix, resets all state variables, removes event listeners

### DOM Structure

When active, the content script creates:

```
body
└── .screenshot-selection-overlay  (id="screenshot-selection-root")
    ├── .screenshot-selection-hint     "Drag to select area..."
    ├── .screenshot-selection-box      The selection rectangle
    │   ├── .screenshot-selection-handle.nw
    │   ├── .screenshot-selection-handle.n
    │   ├── .screenshot-selection-handle.ne
    │   ├── ... (8 resize handles total)
    │   └── .screenshot-selection-actions
    │       ├── button.confirm         "✓ Edit"
    │       └── button.cancel          "✕ Cancel"
    └── .screenshot-selection-size     "320 × 240" dimension label
```

### Interaction Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Selecting** | Mousedown on overlay | Draw a new rectangle from cursor position |
| **Resizing** | Mousedown on a handle | Resize from the corresponding edge/corner |
| **Moving** | Mousedown on the selection box (after handles created) | Drag the entire selection |

### Keyboard Shortcuts

- **Escape** — cancel selection, send `{ type: 'selection-complete', canceled: true }`
- **Enter** — confirm selection (only when actions bar is visible)

### Z-Index Strategy

All selection UI elements use extremely high z-indexes to appear above page content:

| Element | z-index |
|---------|---------|
| Overlay | 2147483640 |
| Selection box | 2147483645 |
| Size label | 2147483647 |
| Handles | 2147483647 |
| Actions bar | 2147483647 |

These are near the `INT32_MAX` (2147483647) to ensure nothing on the host page can overlap the selection UI.

### Styling

The selection CSS (`selection.css`) uses a glassmorphic design:
- **Selection box**: 2px solid border with blue accent, `box-shadow: 0 0 0 9999px rgba(0,0,0,0.3)` creates the darkened-outside effect
- **Handles**: 12px white circles with blue border, scale up on hover
- **Actions bar**: Frosted glass background with `backdrop-filter: blur(12px)`
- **Hint banner**: Slides down with a CSS animation, pill-shaped with blur backdrop
- **CSS variables**: `--select-primary`, `--select-border`, `--glass-bg`, etc. for consistent theming

### Cleanup

The `cleanup()` function is thorough:
1. Removes the root element by ID
2. Removes the injected stylesheet by ID
3. Fallback scan for any stray elements with class prefix `screenshot-selection-`
4. Resets all JavaScript state variables
5. Removes all document-level event listeners

This robustness is intentional — the selection UI must never leave artifacts on the page after capture completes or is canceled.
