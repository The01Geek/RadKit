import type { AnnotationElement } from './annotation-types';

/**
 * Serialized format matching the editor's DrawingElement interface.
 * Used to transfer annotations from the overlay to the Konva editor.
 */
export interface SerializedDrawingElement {
  id: string;
  type: string;
  points?: number[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  filled?: boolean;
  visible: boolean;
  name: string;
  opacity?: number;
  dash?: number[] | null;
  pointerAtStart?: boolean;
  fontFamily?: string;
  fontSize?: number;
  bgColor?: string;
  imageSrc?: string;
}

/**
 * Convert annotation elements (CSS pixel coords relative to selection rect)
 * to DrawingElement format (DPR-scaled coords for the Konva editor).
 */
export function toDrawingElements(
  elements: AnnotationElement[],
  dpr: number
): SerializedDrawingElement[] {
  return elements.map((el, index) => {
    const scaled: SerializedDrawingElement = {
      id: el.id,
      type: el.type,
      x: el.x * dpr,
      y: el.y * dpr,
      color: el.color,
      strokeWidth: el.strokeWidth * dpr,
      filled: el.filled,
      visible: el.visible,
      name: el.name || `${el.type}-${index}`,
      opacity: el.opacity,
      dash: el.dash ? el.dash.map(d => d * dpr) : null,
      pointerAtStart: el.pointerAtStart,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize ? el.fontSize * dpr : undefined,
      bgColor: el.bgColor,
      imageSrc: el.imageSrc,
    };

    if (el.width !== undefined) scaled.width = el.width * dpr;
    if (el.height !== undefined) scaled.height = el.height * dpr;
    if (el.text) scaled.text = el.text;

    if (el.points) {
      scaled.points = el.points.map(p => p * dpr);
    }

    return scaled;
  });
}
