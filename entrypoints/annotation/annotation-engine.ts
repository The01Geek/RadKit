import type { AnnotationElement, AnnotationCallbacks, AnnotationTool, AnnotationState } from './annotation-types';
import { createDefaultState } from './annotation-types';
import { addElement, undo, redo, canUndo, canRedo } from './annotation-state';
import { renderAll, preloadScreenshot } from './annotation-renderer';
import { createAnnotationToolbar, type ToolbarHandles } from './annotation-toolbar';

export interface AnnotationEngine {
  destroy: () => void;
  getElements: () => AnnotationElement[];
  updateSelectionRect: (rect: { x: number; y: number; w: number; h: number }) => void;
}

let idCounter = 0;
function genId(): string {
  return `ann_${Date.now()}_${++idCounter}`;
}

export function initAnnotationMode(
  selectionRect: { x: number; y: number; w: number; h: number },
  screenshotDataUrl: string | null,
  callbacks: AnnotationCallbacks
): AnnotationEngine {
  const state = createDefaultState(selectionRect, screenshotDataUrl);

  // Preload screenshot for blur tool
  if (screenshotDataUrl) {
    preloadScreenshot(screenshotDataUrl);
  }

  // Create the annotation canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'screenshot-annotation-canvas';
  canvas.width = selectionRect.w;
  canvas.height = selectionRect.h;
  canvas.style.cssText = `
    position: fixed !important;
    left: ${selectionRect.x}px !important;
    top: ${selectionRect.y}px !important;
    width: ${selectionRect.w}px !important;
    height: ${selectionRect.h}px !important;
    z-index: 2147483646 !important;
    cursor: crosshair !important;
    pointer-events: auto !important;
  `;
  document.body.appendChild(canvas);

  // Pending image for image tool (loaded via file input from toolbar)
  let pendingImageSrc: string | null = null;

  // Text input overlay for text tool
  let textInput: HTMLTextAreaElement | null = null;

  // Create toolbar
  const toolbar: ToolbarHandles = createAnnotationToolbar(state.settings, {
    onToolChange: (tool: AnnotationTool) => {
      state.settings.activeTool = tool;
      toolbar.updateSettings(state.settings);
      canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
    },
    onSettingChange: (key: string, value: any) => {
      (state.settings as any)[key] = value;
      toolbar.updateSettings(state.settings);
    },
    onUndo: () => {
      if (undo(state)) {
        paint();
        updateUndoRedo();
      }
    },
    onRedo: () => {
      if (redo(state)) {
        paint();
        updateUndoRedo();
      }
    },
    onDone: () => {
      callbacks.onDone(state.elements);
    },
    onEdit: () => {
      callbacks.onEdit(state.elements);
    },
    onCancel: () => {
      callbacks.onCancel();
    },
    onImageUpload: (dataUrl: string) => {
      pendingImageSrc = dataUrl;
      state.settings.activeTool = 'image';
      toolbar.updateSettings(state.settings);
    },
  });

  toolbar.updatePosition(selectionRect);
  toolbar.setUndoRedoState(false, false);

  function paint() {
    renderAll(canvas, state);
  }

  function updateUndoRedo() {
    toolbar.setUndoRedoState(canUndo(state), canRedo(state));
  }

  // --- Drawing interaction ---
  let isDrawing = false;
  let drawStartX = 0;
  let drawStartY = 0;

  function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handleCanvasMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getCanvasCoords(e);
    const tool = state.settings.activeTool;

    if (tool === 'text') {
      showTextInput(x, y);
      return;
    }

    if (tool === 'image' && pendingImageSrc) {
      const element: AnnotationElement = {
        id: genId(),
        type: 'image',
        x, y,
        width: 200,
        height: 150,
        color: state.settings.color,
        strokeWidth: state.settings.strokeWidth,
        opacity: state.settings.opacity,
        imageSrc: pendingImageSrc,
        visible: true,
        name: `image-${state.elements.length}`,
      };
      addElement(state, element);
      pendingImageSrc = null;
      paint();
      updateUndoRedo();
      return;
    }

    isDrawing = true;
    drawStartX = x;
    drawStartY = y;

    const baseElement: AnnotationElement = {
      id: genId(),
      type: tool,
      x, y,
      color: state.settings.color,
      strokeWidth: state.settings.strokeWidth,
      opacity: state.settings.opacity,
      filled: state.settings.filled,
      dash: state.settings.dash,
      visible: true,
      name: `${tool}-${state.elements.length}`,
    };

    if (tool === 'pencil') {
      baseElement.points = [0, 0];
      baseElement.x = x;
      baseElement.y = y;
    } else if (tool === 'line' || tool === 'arrow') {
      baseElement.points = [0, 0, 0, 0];
      if (tool === 'arrow') {
        baseElement.pointerAtStart = false;
      }
    } else {
      // rectangle, circle, blur
      baseElement.width = 0;
      baseElement.height = 0;
    }

    state.currentElement = baseElement;
    paint();
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    if (!isDrawing || !state.currentElement) return;
    e.preventDefault();
    e.stopPropagation();

    const { x, y } = getCanvasCoords(e);
    const el = state.currentElement;
    const tool = el.type;

    if (tool === 'pencil') {
      el.points!.push(x - el.x, y - el.y);
    } else if (tool === 'line' || tool === 'arrow') {
      el.points![2] = x - el.x;
      el.points![3] = y - el.y;
    } else {
      // rectangle, circle, blur
      el.x = Math.min(drawStartX, x);
      el.y = Math.min(drawStartY, y);
      el.width = Math.abs(x - drawStartX);
      el.height = Math.abs(y - drawStartY);
    }

    paint();
  }

  function handleCanvasMouseUp(e: MouseEvent) {
    if (!isDrawing || !state.currentElement) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawing = false;

    const el = state.currentElement;

    // Validate minimum size
    let valid = true;
    if (el.type === 'pencil') {
      valid = (el.points?.length ?? 0) >= 4;
    } else if (el.type === 'line' || el.type === 'arrow') {
      const dx = el.points?.[2] ?? 0;
      const dy = el.points?.[3] ?? 0;
      valid = Math.sqrt(dx * dx + dy * dy) > 3;
    } else {
      valid = (el.width ?? 0) > 3 && (el.height ?? 0) > 3;
    }

    if (valid) {
      state.currentElement = null;
      addElement(state, el);
    } else {
      state.currentElement = null;
    }

    paint();
    updateUndoRedo();
  }

  function showTextInput(x: number, y: number) {
    if (textInput) return;

    const canvasRect = canvas.getBoundingClientRect();

    textInput = document.createElement('textarea');
    textInput.style.cssText = `
      position: fixed !important;
      left: ${canvasRect.left + x}px !important;
      top: ${canvasRect.top + y}px !important;
      min-width: 100px !important;
      min-height: 30px !important;
      font-size: ${state.settings.fontSize}px !important;
      font-family: ${state.settings.fontFamily} !important;
      color: ${state.settings.color} !important;
      background: rgba(255,255,255,0.9) !important;
      border: 2px solid hsl(187, 92%, 43%) !important;
      border-radius: 4px !important;
      padding: 4px !important;
      z-index: 2147483647 !important;
      outline: none !important;
      resize: both !important;
      overflow: hidden !important;
    `;

    document.body.appendChild(textInput);
    textInput.focus();

    const commitText = () => {
      if (!textInput) return;
      const text = textInput.value.trim();
      if (text) {
        const element: AnnotationElement = {
          id: genId(),
          type: 'text',
          x, y,
          text,
          color: state.settings.color,
          strokeWidth: state.settings.strokeWidth,
          opacity: state.settings.opacity,
          fontSize: state.settings.fontSize,
          fontFamily: state.settings.fontFamily,
          visible: true,
          name: `text-${state.elements.length}`,
        };
        addElement(state, element);
        paint();
        updateUndoRedo();
      }
      textInput.remove();
      textInput = null;
    };

    textInput.addEventListener('blur', commitText);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textInput?.remove();
        textInput = null;
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commitText();
      }
    });
  }

  // Keyboard handler for undo/redo
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      if (undo(state)) { paint(); updateUndoRedo(); }
    } else if (
      (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
    ) {
      e.preventDefault();
      if (redo(state)) { paint(); updateUndoRedo(); }
    }
  }

  // Attach event listeners
  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  document.addEventListener('mousemove', handleCanvasMouseMove);
  document.addEventListener('mouseup', handleCanvasMouseUp);
  document.addEventListener('keydown', handleKeyDown, true);

  function updateSelectionRect(rect: { x: number; y: number; w: number; h: number }) {
    state.selectionRect = rect;
    canvas.width = rect.w;
    canvas.height = rect.h;
    canvas.style.left = `${rect.x}px`;
    canvas.style.top = `${rect.y}px`;
    canvas.style.width = `${rect.w}px`;
    canvas.style.height = `${rect.h}px`;
    toolbar.updatePosition(rect);
    paint();
  }

  function destroy() {
    canvas.removeEventListener('mousedown', handleCanvasMouseDown);
    document.removeEventListener('mousemove', handleCanvasMouseMove);
    document.removeEventListener('mouseup', handleCanvasMouseUp);
    document.removeEventListener('keydown', handleKeyDown, true);
    canvas.remove();
    toolbar.destroy();
    if (textInput) {
      textInput.remove();
      textInput = null;
    }
  }

  function getElements(): AnnotationElement[] {
    return state.elements;
  }

  return { destroy, getElements, updateSelectionRect };
}
