import type { AnnotationToolSettings, AnnotationTool } from './annotation-types';

const TOOLBAR_CSS = `
:host {
  all: initial;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.ann-container {
  position: fixed;
  z-index: 2147483649;
  pointer-events: auto;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 13px;
  user-select: none;
  -webkit-user-select: none;
}
.ann-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: hsla(0, 0%, 100%, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsla(0, 0%, 0%, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
}
.ann-separator {
  width: 1px;
  height: 24px;
  background: hsla(0, 0%, 0%, 0.1);
  margin: 0 4px;
}
.ann-tool-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(0, 0%, 30%);
  transition: all 0.15s ease;
  padding: 0;
}
.ann-tool-btn:hover {
  background: hsla(0, 0%, 0%, 0.06);
  color: hsl(0, 0%, 10%);
}
.ann-tool-btn.active {
  background: hsl(187, 92%, 43%);
  color: white;
  box-shadow: 0 2px 8px hsla(187, 92%, 43%, 0.3);
}
.ann-tool-btn.active:hover {
  background: hsl(187, 92%, 35%);
}
.ann-tool-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ann-tool-btn.undo-redo {
  width: 28px;
  height: 28px;
}
.ann-tool-btn.undo-redo:disabled {
  opacity: 0.3;
  cursor: default;
}
.ann-settings {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ann-color-input {
  width: 28px;
  height: 28px;
  border: 2px solid hsla(0, 0%, 0%, 0.1);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  background: none;
  overflow: hidden;
}
.ann-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.ann-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
.ann-slider {
  width: 60px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: hsla(0, 0%, 0%, 0.1);
  border-radius: 2px;
  outline: none;
}
.ann-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: hsl(187, 92%, 43%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.ann-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: hsla(0, 0%, 100%, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsla(0, 0%, 0%, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
  margin-top: 6px;
}
.ann-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.ann-btn-done {
  background: hsl(145, 63%, 42%);
  color: white;
  box-shadow: 0 2px 8px hsla(145, 63%, 42%, 0.3);
}
.ann-btn-done:hover {
  background: hsl(145, 63%, 35%);
  transform: translateY(-1px);
}
.ann-btn-edit {
  background: hsl(187, 92%, 43%);
  color: white;
  box-shadow: 0 2px 8px hsla(187, 92%, 43%, 0.3);
}
.ann-btn-edit:hover {
  background: hsl(187, 92%, 35%);
  transform: translateY(-1px);
}
.ann-btn-cancel {
  background: hsla(0, 0%, 0%, 0.05);
  color: hsl(0, 0%, 30%);
}
.ann-btn-cancel:hover {
  background: hsla(0, 0%, 0%, 0.1);
}
.ann-label {
  font-size: 11px;
  color: hsl(0, 0%, 50%);
  margin-right: 2px;
}
.ann-filled-toggle {
  width: 28px;
  height: 28px;
  border: 2px solid hsla(0, 0%, 0%, 0.1);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: all 0.15s ease;
}
.ann-filled-toggle.active {
  background: currentColor;
  border-color: currentColor;
}
`;

const TOOL_ICONS: Record<AnnotationTool, string> = {
  pencil: `<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
  line: `<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>`,
  rectangle: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`,
  circle: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="9"/></svg>`,
  text: `<svg viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9.5" y1="20" x2="14.5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  blur: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  image: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
};

const UNDO_ICON = `<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
const REDO_ICON = `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>`;

export interface ToolbarHandles {
  host: HTMLDivElement;
  updatePosition: (rect: { x: number; y: number; w: number; h: number }) => void;
  updateSettings: (settings: AnnotationToolSettings) => void;
  setUndoRedoState: (canUndo: boolean, canRedo: boolean) => void;
  destroy: () => void;
}

export function createAnnotationToolbar(
  settings: AnnotationToolSettings,
  callbacks: {
    onToolChange: (tool: AnnotationTool) => void;
    onSettingChange: (key: string, value: any) => void;
    onUndo: () => void;
    onRedo: () => void;
    onDone: () => void;
    onEdit: () => void;
    onCancel: () => void;
    onImageUpload: (dataUrl: string) => void;
  }
): ToolbarHandles {
  const host = document.createElement('div');
  host.id = 'screenshot-annotation-host';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483649;pointer-events:none;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = TOOLBAR_CSS;
  shadow.appendChild(style);

  // Container
  const container = document.createElement('div');
  container.className = 'ann-container';
  shadow.appendChild(container);

  // Toolbar row
  const toolbar = document.createElement('div');
  toolbar.className = 'ann-toolbar';
  container.appendChild(toolbar);

  // Tool buttons
  const toolButtons = new Map<AnnotationTool, HTMLButtonElement>();
  const tools: AnnotationTool[] = ['pencil', 'line', 'arrow', 'rectangle', 'circle', 'text', 'blur', 'image'];

  tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = `ann-tool-btn${tool === settings.activeTool ? ' active' : ''}`;
    btn.innerHTML = TOOL_ICONS[tool];
    btn.title = tool.charAt(0).toUpperCase() + tool.slice(1);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (tool === 'image') {
        fileInput.click();
        return;
      }
      callbacks.onToolChange(tool);
    });
    toolbar.appendChild(btn);
    toolButtons.set(tool, btn);
  });

  // Hidden file input for image tool
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      callbacks.onImageUpload(reader.result as string);
      callbacks.onToolChange('image');
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
  shadow.appendChild(fileInput);

  // Separator
  const sep1 = document.createElement('div');
  sep1.className = 'ann-separator';
  toolbar.appendChild(sep1);

  // Undo/Redo
  const undoBtn = document.createElement('button');
  undoBtn.className = 'ann-tool-btn undo-redo';
  undoBtn.innerHTML = UNDO_ICON;
  undoBtn.title = 'Undo (Ctrl+Z)';
  undoBtn.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onUndo(); });
  toolbar.appendChild(undoBtn);

  const redoBtn = document.createElement('button');
  redoBtn.className = 'ann-tool-btn undo-redo';
  redoBtn.innerHTML = REDO_ICON;
  redoBtn.title = 'Redo (Ctrl+Y)';
  redoBtn.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onRedo(); });
  toolbar.appendChild(redoBtn);

  // Separator
  const sep2 = document.createElement('div');
  sep2.className = 'ann-separator';
  toolbar.appendChild(sep2);

  // Settings: color
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'ann-color-input';
  colorInput.value = settings.color;
  colorInput.title = 'Color';
  colorInput.addEventListener('input', (e) => {
    e.stopPropagation();
    callbacks.onSettingChange('color', (e.target as HTMLInputElement).value);
  });
  toolbar.appendChild(colorInput);

  // Stroke width slider
  const strokeLabel = document.createElement('span');
  strokeLabel.className = 'ann-label';
  strokeLabel.textContent = 'Size';
  toolbar.appendChild(strokeLabel);

  const strokeSlider = document.createElement('input');
  strokeSlider.type = 'range';
  strokeSlider.className = 'ann-slider';
  strokeSlider.min = '1';
  strokeSlider.max = '20';
  strokeSlider.value = String(settings.strokeWidth);
  strokeSlider.title = 'Stroke Width';
  strokeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    callbacks.onSettingChange('strokeWidth', Number((e.target as HTMLInputElement).value));
  });
  toolbar.appendChild(strokeSlider);

  // Opacity slider
  const opacityLabel = document.createElement('span');
  opacityLabel.className = 'ann-label';
  opacityLabel.textContent = 'Op';
  toolbar.appendChild(opacityLabel);

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.className = 'ann-slider';
  opacitySlider.min = '0.1';
  opacitySlider.max = '1';
  opacitySlider.step = '0.1';
  opacitySlider.value = String(settings.opacity);
  opacitySlider.title = 'Opacity';
  opacitySlider.addEventListener('input', (e) => {
    e.stopPropagation();
    callbacks.onSettingChange('opacity', Number((e.target as HTMLInputElement).value));
  });
  toolbar.appendChild(opacitySlider);

  // Action bar (Done / Edit / Cancel)
  const actionBar = document.createElement('div');
  actionBar.className = 'ann-action-bar';
  container.appendChild(actionBar);

  const doneBtn = document.createElement('button');
  doneBtn.className = 'ann-btn ann-btn-done';
  doneBtn.textContent = '✓ Done';
  doneBtn.title = 'Save with annotations (no editor)';
  doneBtn.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onDone(); });
  actionBar.appendChild(doneBtn);

  const editBtn = document.createElement('button');
  editBtn.className = 'ann-btn ann-btn-edit';
  editBtn.textContent = '✎ Edit';
  editBtn.title = 'Open in full editor with annotations';
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onEdit(); });
  actionBar.appendChild(editBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'ann-btn ann-btn-cancel';
  cancelBtn.textContent = '✕ Cancel';
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); callbacks.onCancel(); });
  actionBar.appendChild(cancelBtn);

  // Prevent events from reaching the page
  container.addEventListener('mousedown', (e) => e.stopPropagation());
  container.addEventListener('mouseup', (e) => e.stopPropagation());
  container.addEventListener('click', (e) => e.stopPropagation());

  function updatePosition(rect: { x: number; y: number; w: number; h: number }) {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Position toolbar above selection if space, else below
    const toolbarHeight = 48;
    const actionHeight = 44;
    const gap = 8;

    let top: number;
    if (rect.y > toolbarHeight + gap + 10) {
      top = rect.y - toolbarHeight - gap;
    } else {
      top = rect.y + rect.h + gap;
    }

    // Horizontal: align to left of selection, clamp to viewport
    let left = rect.x;
    const toolbarWidth = toolbar.offsetWidth || 520;
    if (left + toolbarWidth > viewW - 10) {
      left = Math.max(10, viewW - toolbarWidth - 10);
    }

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;

    // Action bar below toolbar or below selection
    const actionTop = top + toolbarHeight + gap;
    if (actionTop + actionHeight > viewH - 10) {
      actionBar.style.position = 'fixed';
      actionBar.style.bottom = '10px';
      actionBar.style.right = '10px';
      actionBar.style.left = 'auto';
      actionBar.style.top = 'auto';
    }
  }

  function updateSettings(newSettings: AnnotationToolSettings) {
    toolButtons.forEach((btn, tool) => {
      btn.classList.toggle('active', tool === newSettings.activeTool);
    });
    colorInput.value = newSettings.color;
    strokeSlider.value = String(newSettings.strokeWidth);
    opacitySlider.value = String(newSettings.opacity);
  }

  function setUndoRedoState(canUndoVal: boolean, canRedoVal: boolean) {
    undoBtn.disabled = !canUndoVal;
    redoBtn.disabled = !canRedoVal;
  }

  function destroy() {
    host.remove();
  }

  return { host, updatePosition, updateSettings, setUndoRedoState, destroy };
}
