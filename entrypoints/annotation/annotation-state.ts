import type { AnnotationState, AnnotationElement } from './annotation-types';

const MAX_HISTORY = 50;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function addElement(state: AnnotationState, element: AnnotationElement): void {
  state.elements.push(element);
  pushHistory(state);
}

export function updateElement(state: AnnotationState, id: string, updates: Partial<AnnotationElement>): void {
  const idx = state.elements.findIndex(el => el.id === id);
  if (idx !== -1) {
    state.elements[idx] = { ...state.elements[idx], ...updates };
  }
}

export function removeElement(state: AnnotationState, id: string): void {
  state.elements = state.elements.filter(el => el.id !== id);
  pushHistory(state);
}

export function pushHistory(state: AnnotationState): void {
  // Discard any future history (after undo)
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(deepClone(state.elements));
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }
}

export function undo(state: AnnotationState): boolean {
  if (state.historyIndex <= 0) return false;
  state.historyIndex--;
  state.elements = deepClone(state.history[state.historyIndex]);
  return true;
}

export function redo(state: AnnotationState): boolean {
  if (state.historyIndex >= state.history.length - 1) return false;
  state.historyIndex++;
  state.elements = deepClone(state.history[state.historyIndex]);
  return true;
}

export function canUndo(state: AnnotationState): boolean {
  return state.historyIndex > 0;
}

export function canRedo(state: AnnotationState): boolean {
  return state.historyIndex < state.history.length - 1;
}
