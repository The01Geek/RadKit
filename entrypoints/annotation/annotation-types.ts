/**
 * Shared types for inline annotation during area selection.
 * Coordinates are in CSS pixels relative to the selection rect's top-left corner.
 * DPR scaling happens only at serialization/composite time.
 */

export type AnnotationTool = 'pencil' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'blur' | 'image';

export interface AnnotationElement {
  id: string;
  type: AnnotationTool;
  /** For pencil: [x0,y0,x1,y1,...] relative to element origin. For line/arrow: [0,0,dx,dy]. */
  points?: number[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  filled?: boolean;
  opacity: number;
  dash?: number[] | null;
  pointerAtStart?: boolean;
  fontFamily?: string;
  fontSize?: number;
  bgColor?: string;
  imageSrc?: string;
  visible: boolean;
  name: string;
}

export interface AnnotationToolSettings {
  activeTool: AnnotationTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  filled: boolean;
  fontSize: number;
  fontFamily: string;
  dash: number[] | null;
}

export interface AnnotationState {
  elements: AnnotationElement[];
  history: AnnotationElement[][];
  historyIndex: number;
  settings: AnnotationToolSettings;
  currentElement: AnnotationElement | null;
  selectionRect: { x: number; y: number; w: number; h: number };
  screenshotDataUrl: string | null;
}

export interface AnnotationCallbacks {
  onDone: (elements: AnnotationElement[]) => void;
  onEdit: (elements: AnnotationElement[]) => void;
  onCancel: () => void;
}

export function createDefaultSettings(): AnnotationToolSettings {
  return {
    activeTool: 'pencil',
    color: '#ff0000',
    strokeWidth: 3,
    opacity: 1,
    filled: false,
    fontSize: 24,
    fontFamily: 'Arial',
    dash: null,
  };
}

export function createDefaultState(
  selectionRect: { x: number; y: number; w: number; h: number },
  screenshotDataUrl: string | null
): AnnotationState {
  return {
    elements: [],
    history: [[]],
    historyIndex: 0,
    settings: createDefaultSettings(),
    currentElement: null,
    selectionRect,
    screenshotDataUrl,
  };
}
