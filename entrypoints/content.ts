import './selection.css';

const SELECTION_CSS = `
.screenshot-selection-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: transparent !important;
  z-index: 2147483640 !important;
  cursor: crosshair !important;
}
.screenshot-selection-box {
  position: fixed !important;
  border: 2px dashed #0066ff !important;
  background: transparent !important;
  z-index: 2147483645 !important;
  pointer-events: auto !important;
  cursor: move !important;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3) !important;
}
.screenshot-selection-size {
  position: fixed !important;
  background: #333 !important;
  color: #fff !important;
  padding: 4px 10px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  z-index: 2147483646 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
}
.screenshot-selection-handle {
  position: absolute !important;
  width: 12px !important;
  height: 12px !important;
  background: #fff !important;
  border: 2px solid #0066ff !important;
  z-index: 2147483647 !important;
  pointer-events: auto !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}
.screenshot-selection-handle:hover {
  transform: scale(1.2) !important;
  background: #0066ff !important;
}
.screenshot-selection-handle.nw { top: -7px; left: -7px; cursor: nw-resize; }
.screenshot-selection-handle.n  { top: -7px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.screenshot-selection-handle.ne { top: -7px; right: -7px; cursor: ne-resize; }
.screenshot-selection-handle.e  { top: 50%; right: -7px; transform: translateY(-50%); cursor: e-resize; }
.screenshot-selection-handle.se { bottom: -7px; right: -7px; cursor: se-resize; }
.screenshot-selection-handle.s  { bottom: -7px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.screenshot-selection-handle.sw { bottom: -7px; left: -7px; cursor: sw-resize; }
.screenshot-selection-handle.w  { top: 50%; left: -7px; transform: translateY(-50%); cursor: w-resize; }

.screenshot-selection-actions {
  position: absolute !important;
  bottom: -50px !important;
  right: 0 !important;
  display: flex !important;
  gap: 10px !important;
  z-index: 2147483647 !important;
  padding: 8px !important;
  background: #fff !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
  pointer-events: auto !important;
}
.screenshot-selection-btn {
  padding: 8px 16px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  border: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  transition: all 0.2s !important;
}
.screenshot-selection-btn.confirm { background: #0066ff !important; color: white !important; }
.screenshot-selection-btn.confirm:hover { background: #0052cc !important; }
.screenshot-selection-btn.cancel { background: #f1f1f2 !important; color: #333 !important; }
.screenshot-selection-btn.cancel:hover { background: #e2e2e4 !important; }
`;

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Use a global flag to prevent multiple listeners
    if ((window as any).__screenshot_selection_active) return;
    (window as any).__screenshot_selection_active = true;

    let overlay: HTMLDivElement | null = null;
    let selectionBox: HTMLDivElement | null = null;
    let sizeLabel: HTMLDivElement | null = null;
    let hint: HTMLDivElement | null = null;
    let styleElement: HTMLStyleElement | null = null;
    let actions: HTMLDivElement | null = null;

    let isSelecting = false;
    let isResizing = false;
    let isMoving = false;
    let activeHandle: string | null = null;

    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let selectRect = { x: 0, y: 0, w: 0, h: 0 };

    function applyStyles() {
      let existingStyle = document.getElementById('screenshot-selection-styles');
      if (!existingStyle) {
        styleElement = document.createElement('style');
        styleElement.id = 'screenshot-selection-styles';
        styleElement.textContent = SELECTION_CSS;
        document.head.appendChild(styleElement);
      } else {
        styleElement = existingStyle as HTMLStyleElement;
      }
    }

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'start-selection') {
        applyStyles();
        createSelectionOverlay();
      } else if (message.type === 'cleanup-selection') {
        cleanup();
      } else if (message.type === 'start-webcam-overlay') {
        startWebcamOverlay();
      } else if (message.type === 'stop-webcam-overlay') {
        stopWebcamOverlay();
      }
    });

    function createSelectionOverlay() {
      cleanup();

      overlay = document.createElement('div');
      overlay.className = 'screenshot-selection-overlay';
      overlay.id = 'screenshot-selection-root';
      document.body.appendChild(overlay);

      hint = document.createElement('div');
      hint.className = 'screenshot-selection-hint';
      hint.textContent = 'Drag to select area. Drag box to move. Use handles to resize.';
      overlay.appendChild(hint);

      overlay.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);
    }

    function createHandles() {
      if (!selectionBox) return;
      const types = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
      types.forEach(type => {
        const handle = document.createElement('div');
        handle.className = `screenshot-selection-handle ${type}`;
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          isResizing = true;
          activeHandle = type;
        });
        selectionBox!.appendChild(handle);
      });
    }

    function createActions() {
      if (!selectionBox || actions) return;
      actions = document.createElement('div');
      actions.className = 'screenshot-selection-actions';
      actions.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent moving when clicking buttons

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'screenshot-selection-btn confirm';
      confirmBtn.textContent = '✓ Edit';
      confirmBtn.onclick = (e) => {
        console.log('Edit button clicked');
        e.stopPropagation();
        const rect = { x: selectRect.x, y: selectRect.y, width: selectRect.w, height: selectRect.h };
        cleanup();
        browser.runtime.sendMessage({ type: 'selection-complete', rect });
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'screenshot-selection-btn cancel';
      cancelBtn.textContent = '✕ Cancel';
      cancelBtn.onclick = (e) => {
        console.log('Cancel button clicked');
        e.stopPropagation();
        cleanup();
        browser.runtime.sendMessage({ type: 'selection-complete', canceled: true });
      };

      actions.appendChild(confirmBtn);
      actions.appendChild(cancelBtn);
      selectionBox.appendChild(actions);
    }

    function handleMouseDown(e: MouseEvent) {
      if (actions) return; // Don't restart if we already have a selection
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;

      selectionBox = document.createElement('div');
      selectionBox.className = 'screenshot-selection-box';
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      overlay?.appendChild(selectionBox);

      // Add listener to selectionBox for moving later
      selectionBox.addEventListener('mousedown', (e) => {
        if (actions && !isResizing) {
          e.stopPropagation();
          isMoving = true;
          offsetX = e.clientX - selectRect.x;
          offsetY = e.clientY - selectRect.y;
        }
      });

      sizeLabel = document.createElement('div');
      sizeLabel.className = 'screenshot-selection-size';
      overlay?.appendChild(sizeLabel);

      if (hint) hint.style.setProperty('display', 'none', 'important');
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isSelecting && !isResizing && !isMoving) return;
      if (!selectionBox || !sizeLabel) return;

      if (isSelecting) {
        const curX = e.clientX;
        const curY = e.clientY;
        selectRect.x = Math.min(startX, curX);
        selectRect.y = Math.min(startY, curY);
        selectRect.w = Math.max(1, Math.abs(curX - startX));
        selectRect.h = Math.max(1, Math.abs(curY - startY));
      } else if (isResizing && activeHandle) {
        const curX = e.clientX;
        const curY = e.clientY;
        const r = { ...selectRect };

        if (activeHandle.includes('w')) { r.w += r.x - curX; r.x = curX; }
        if (activeHandle.includes('e')) { r.w = curX - r.x; }
        if (activeHandle.includes('n')) { r.h += r.y - curY; r.y = curY; }
        if (activeHandle.includes('s')) { r.h = curY - r.y; }

        if (r.w < 1) { r.x += r.w - 1; r.w = 1; }
        if (r.h < 1) { r.y += r.h - 1; r.h = 1; }

        selectRect = r;
      } else if (isMoving) {
        selectRect.x = e.clientX - offsetX;
        selectRect.y = e.clientY - offsetY;
      }

      selectionBox.style.left = `${selectRect.x}px`;
      selectionBox.style.top = `${selectRect.y}px`;
      selectionBox.style.width = `${selectRect.w}px`;
      selectionBox.style.height = `${selectRect.h}px`;

      sizeLabel.textContent = `${Math.round(selectRect.w)} × ${Math.round(selectRect.h)}`;
      sizeLabel.style.left = `${selectRect.x}px`;
      sizeLabel.style.top = `${selectRect.y + selectRect.h + 8}px`;
    }

    function handleMouseUp() {
      if (isSelecting) {
        isSelecting = false;
        if (selectRect.w > 5 && selectRect.h > 5) {
          createHandles();
          createActions();
        } else {
          cleanup();
        }
      }
      isResizing = false;
      isMoving = false;
      activeHandle = null;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        browser.runtime.sendMessage({ type: 'selection-complete', canceled: true });
      } else if (e.key === 'Enter' && actions) {
        const rect = { x: selectRect.x, y: selectRect.y, width: selectRect.w, height: selectRect.h };
        cleanup();
        browser.runtime.sendMessage({ type: 'selection-complete', rect });
      }
    }

    // ── Webcam overlay ──────────────────────────────────────────────
    let webcamHost: HTMLDivElement | null = null;
    let webcamStream: MediaStream | null = null;

    function startWebcamOverlay() {
      // Prevent duplicates
      if (webcamHost) return;

      const CAM_SIZE = 200;
      const Z_INDEX = 2147483641;

      // Create Shadow DOM host
      webcamHost = document.createElement('div');
      webcamHost.id = 'radkit-webcam-host';
      webcamHost.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: ${CAM_SIZE}px !important;
        height: ${CAM_SIZE}px !important;
        z-index: ${Z_INDEX} !important;
        border: none !important;
        background: none !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: auto !important;
      `;
      document.body.appendChild(webcamHost);

      const shadow = webcamHost.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial !important;
        }
        .radkit-webcam-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(255,255,255,0.3);
          background: #111;
          cursor: grab;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          user-select: none;
        }
        .radkit-webcam-container:active {
          cursor: grabbing;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
          display: block;
          border-radius: 50%;
        }
        .radkit-webcam-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 20px;
          height: 20px;
          cursor: nwse-resize;
          background: transparent;
          z-index: 1;
        }
        .radkit-webcam-resize-handle::after {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          border-right: 2px solid rgba(255,255,255,0.5);
          border-bottom: 2px solid rgba(255,255,255,0.5);
          border-radius: 0 0 3px 0;
        }
        .radkit-webcam-error {
          color: #888;
          font-size: 12px;
          text-align: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
      `;
      shadow.appendChild(style);

      const container = document.createElement('div');
      container.className = 'radkit-webcam-container';
      shadow.appendChild(container);

      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      container.appendChild(video);

      // Resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'radkit-webcam-resize-handle';
      container.appendChild(resizeHandle);

      // Start camera
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 320 }, facingMode: 'user' },
        audio: false
      }).then((stream) => {
        webcamStream = stream;
        video.srcObject = stream;
      }).catch(() => {
        container.innerHTML = '';
        const errorEl = document.createElement('div');
        errorEl.className = 'radkit-webcam-error';
        errorEl.textContent = 'Camera unavailable';
        container.appendChild(errorEl);
      });

      // ── Dragging ──
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;

      container.addEventListener('mousedown', (e: MouseEvent) => {
        // Ignore if clicking the resize handle
        if (e.target === resizeHandle) return;
        isDragging = true;
        const rect = webcamHost!.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        e.preventDefault();
      });

      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragUp);

      function onDragMove(e: MouseEvent) {
        if (!isDragging || !webcamHost) return;
        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;
        // Switch from bottom/right to top/left positioning for drag
        webcamHost.style.bottom = 'auto';
        webcamHost.style.right = 'auto';
        webcamHost.style.left = `${Math.max(0, Math.min(x, window.innerWidth - webcamHost.offsetWidth))}px`;
        webcamHost.style.top = `${Math.max(0, Math.min(y, window.innerHeight - webcamHost.offsetHeight))}px`;
      }

      function onDragUp() {
        isDragging = false;
      }

      // ── Resizing ──
      let isResizingWebcam = false;
      let resizeStartX = 0;
      let resizeStartY = 0;
      let resizeStartW = 0;
      let resizeStartH = 0;

      resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
        isResizingWebcam = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartW = webcamHost!.offsetWidth;
        resizeStartH = webcamHost!.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);

      function onResizeMove(e: MouseEvent) {
        if (!isResizingWebcam || !webcamHost) return;
        const dx = e.clientX - resizeStartX;
        const dy = e.clientY - resizeStartY;
        // Keep it square — use the larger delta
        const delta = Math.max(dx, dy);
        const newSize = Math.max(80, Math.min(resizeStartW + delta, 500));
        webcamHost.style.width = `${newSize}px`;
        webcamHost.style.height = `${newSize}px`;
      }

      function onResizeUp() {
        isResizingWebcam = false;
      }

      // Store cleanup handlers for removal
      (webcamHost as any)._cleanupHandlers = { onDragMove, onDragUp, onResizeMove, onResizeUp };
    }

    function stopWebcamOverlay() {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
      }
      if (webcamHost) {
        // Remove document-level event listeners
        const handlers = (webcamHost as any)._cleanupHandlers;
        if (handlers) {
          document.removeEventListener('mousemove', handlers.onDragMove);
          document.removeEventListener('mouseup', handlers.onDragUp);
          document.removeEventListener('mousemove', handlers.onResizeMove);
          document.removeEventListener('mouseup', handlers.onResizeUp);
        }
        webcamHost.remove();
        webcamHost = null;
      }
    }

    // ── Selection overlay ────────────────────────────────────────────
    function cleanup() {
      console.log('Running robust cleanup...');

      // Remove via ID-based root first
      const root = document.getElementById('screenshot-selection-root');
      if (root) {
        root.remove();
        console.log('Removed selection root');
      }

      // Remove style tag by ID
      const style = document.getElementById('screenshot-selection-styles');
      if (style) {
        style.remove();
        console.log('Removed selection styles');
      }

      // Fallback: Remove anything with our class prefix
      const strayElements = document.querySelectorAll(
        '[class*="screenshot-selection-"]'
      );
      if (strayElements.length > 0) {
        console.log(`Cleaning up ${strayElements.length} stray elements`);
        strayElements.forEach(el => el.remove());
      }

      // Reset variables
      overlay = null;
      selectionBox = null;
      sizeLabel = null;
      hint = null;
      styleElement = null;
      actions = null;

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);

      isSelecting = false;
      isResizing = false;
      isMoving = false;
      activeHandle = null;

      console.log('Cleanup complete');
    }
  },
});
