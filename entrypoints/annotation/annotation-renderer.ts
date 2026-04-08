import type { AnnotationElement, AnnotationState } from './annotation-types';

// Cache loaded images for the image tool
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

// Screenshot image cache for blur tool
let screenshotImg: HTMLImageElement | null = null;
let screenshotSrc: string | null = null;

async function getScreenshotImage(dataUrl: string): Promise<HTMLImageElement> {
  if (screenshotImg && screenshotSrc === dataUrl) return screenshotImg;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { screenshotImg = img; screenshotSrc = dataUrl; resolve(img); };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function renderAll(
  canvas: HTMLCanvasElement,
  state: AnnotationState,
  pendingImages?: Map<string, HTMLImageElement>
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const el of state.elements) {
    if (!el.visible) continue;
    renderElement(ctx, el, state, pendingImages);
  }

  // Render in-progress element on top
  if (state.currentElement) {
    renderElement(ctx, state.currentElement, state, pendingImages);
  }
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  el: AnnotationElement,
  state: AnnotationState,
  pendingImages?: Map<string, HTMLImageElement>
): void {
  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.dash && el.dash.length > 0) {
    ctx.setLineDash(el.dash);
  }

  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'pencil':
      renderPencil(ctx, el);
      break;
    case 'line':
      renderLine(ctx, el);
      break;
    case 'arrow':
      renderArrow(ctx, el);
      break;
    case 'rectangle':
      renderRectangle(ctx, el);
      break;
    case 'circle':
      renderCircle(ctx, el);
      break;
    case 'text':
      renderText(ctx, el);
      break;
    case 'blur':
      renderBlur(ctx, el, state);
      break;
    case 'image':
      renderImage(ctx, el, pendingImages);
      break;
  }

  ctx.restore();
}

function renderPencil(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  const pts = el.points;
  if (!pts || pts.length < 4) return;

  ctx.beginPath();
  ctx.moveTo(el.x + pts[0], el.y + pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(el.x + pts[i], el.y + pts[i + 1]);
  }
  ctx.stroke();
}

function renderLine(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  const pts = el.points;
  if (!pts || pts.length < 4) return;

  ctx.beginPath();
  ctx.moveTo(el.x + pts[0], el.y + pts[1]);
  ctx.lineTo(el.x + pts[2], el.y + pts[3]);
  ctx.stroke();
}

function renderArrow(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  const pts = el.points;
  if (!pts || pts.length < 4) return;

  const x1 = el.x + pts[0], y1 = el.y + pts[1];
  const x2 = el.x + pts[2], y2 = el.y + pts[3];

  // Draw line
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Draw arrowhead at end
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = Math.max(el.strokeWidth * 3, 12);
  drawArrowhead(ctx, x2, y2, angle, headLen, el.color);

  // Optionally draw arrowhead at start
  if (el.pointerAtStart) {
    const angleBack = Math.atan2(y1 - y2, x1 - x2);
    drawArrowhead(ctx, x1, y1, angleBack, headLen, el.color);
  }
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  angle: number, len: number, color: string
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - len * Math.cos(angle - Math.PI / 6), y - len * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - len * Math.cos(angle + Math.PI / 6), y - len * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderRectangle(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  if (el.filled) {
    ctx.fillRect(el.x, el.y, w, h);
  } else {
    ctx.strokeRect(el.x, el.y, w, h);
  }
}

function renderCircle(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  const cx = el.x + w / 2;
  const cy = el.y + h / 2;
  const rx = Math.abs(w / 2);
  const ry = Math.abs(h / 2);

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (el.filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function renderText(ctx: CanvasRenderingContext2D, el: AnnotationElement): void {
  if (!el.text) return;
  const size = el.fontSize ?? 24;
  const family = el.fontFamily ?? 'Arial';
  ctx.font = `${size}px ${family}`;
  ctx.textBaseline = 'top';

  if (el.bgColor) {
    const metrics = ctx.measureText(el.text);
    const padding = 4;
    ctx.save();
    ctx.fillStyle = el.bgColor;
    ctx.fillRect(
      el.x - padding, el.y - padding,
      metrics.width + padding * 2, size + padding * 2
    );
    ctx.restore();
  }

  ctx.fillStyle = el.color;
  ctx.fillText(el.text, el.x, el.y);
}

function renderBlur(
  ctx: CanvasRenderingContext2D,
  el: AnnotationElement,
  state: AnnotationState
): void {
  const w = el.width ?? 0;
  const h = el.height ?? 0;
  if (w <= 0 || h <= 0) return;

  if (!screenshotImg || !state.screenshotDataUrl) {
    // No screenshot available — draw a placeholder semi-transparent rect
    ctx.save();
    ctx.fillStyle = 'rgba(128,128,128,0.5)';
    ctx.fillRect(el.x, el.y, w, h);
    ctx.restore();
    return;
  }

  // Pixelated blur: downscale then upscale
  const pixelSize = 10;
  const { selectionRect } = state;

  // The screenshot from captureVisibleTab is DPR-scaled
  // Map annotation coords (CSS pixels relative to selection rect) to screenshot pixel coords
  const dpr = window.devicePixelRatio || 1;
  const srcX = (selectionRect.x + el.x) * dpr;
  const srcY = (selectionRect.y + el.y) * dpr;
  const srcW = w * dpr;
  const srcH = h * dpr;

  const smallW = Math.max(1, Math.ceil(w / pixelSize));
  const smallH = Math.max(1, Math.ceil(h / pixelSize));

  const offscreen = document.createElement('canvas');
  offscreen.width = smallW;
  offscreen.height = smallH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  // Draw small version from screenshot (DPR-scaled source coords)
  offCtx.drawImage(screenshotImg, srcX, srcY, srcW, srcH, 0, 0, smallW, smallH);

  // Draw back scaled up with no smoothing
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, smallW, smallH, el.x, el.y, w, h);
  ctx.restore();
}

function renderImage(
  ctx: CanvasRenderingContext2D,
  el: AnnotationElement,
  pendingImages?: Map<string, HTMLImageElement>
): void {
  if (!el.imageSrc) return;
  const w = el.width ?? 200;
  const h = el.height ?? 200;

  // Try cache first
  let img = imageCache.get(el.imageSrc) ?? pendingImages?.get(el.id);
  if (img) {
    ctx.drawImage(img, el.x, el.y, w, h);
  } else {
    // Async load — will render on next paint
    loadImage(el.imageSrc).then(() => {
      // The engine will re-render
    });
    // Draw placeholder
    ctx.save();
    ctx.strokeStyle = el.color;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(el.x, el.y, w, h);
    ctx.restore();
  }
}

export async function preloadScreenshot(dataUrl: string): Promise<void> {
  await getScreenshotImage(dataUrl);
}
