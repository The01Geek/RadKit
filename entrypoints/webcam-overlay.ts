export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    if ((window as any).__radkit_webcam_active) return;
    (window as any).__radkit_webcam_active = true;

    let hostElement: HTMLDivElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let videoElement: HTMLVideoElement | null = null;
    let mediaStream: MediaStream | null = null;
    const documentListeners: Array<{ event: string; handler: EventListener }> = [];

    const OVERLAY_CSS = `
      :host {
        all: initial;
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
      }

      .webcam-bubble {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1);
        cursor: grab;
        pointer-events: auto;
        user-select: none;
        transition: box-shadow 0.2s ease;
      }

      .webcam-bubble:hover {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(161, 115, 254, 0.4);
      }

      .webcam-bubble.dragging {
        cursor: grabbing;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(161, 115, 254, 0.6);
      }

      .webcam-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scaleX(-1);
        display: block;
      }

      .webcam-error {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: #1a1a2e;
        color: #ccc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        padding: 16px;
        line-height: 1.4;
      }

      .resize-handle {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 20px;
        height: 20px;
        cursor: se-resize;
        pointer-events: auto;
        border-radius: 50%;
        z-index: 1;
      }

      .resize-handle::after {
        content: '';
        position: absolute;
        bottom: 6px;
        right: 6px;
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(255, 255, 255, 0.7);
        border-bottom: 2px solid rgba(255, 255, 255, 0.7);
        border-radius: 0 0 2px 0;
      }
    `;

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'start-webcam-overlay') {
        createWebcamOverlay();
      } else if (message.type === 'stop-webcam-overlay') {
        cleanup();
      }
    });

    async function createWebcamOverlay() {
      cleanup();

      hostElement = document.createElement('div');
      hostElement.id = 'radkit-webcam-host';
      document.body.appendChild(hostElement);

      shadowRoot = hostElement.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = OVERLAY_CSS;
      shadowRoot.appendChild(style);

      const bubble = document.createElement('div');
      bubble.className = 'webcam-bubble';
      shadowRoot.appendChild(bubble);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      bubble.appendChild(resizeHandle);

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

        videoElement = document.createElement('video');
        videoElement.className = 'webcam-video';
        videoElement.srcObject = mediaStream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true;
        bubble.insertBefore(videoElement, resizeHandle);

        browser.runtime.sendMessage({ type: 'webcam-overlay-ready' });
      } catch (err) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'webcam-error';
        errorDiv.textContent = 'Camera unavailable. Check permissions and try again.';
        bubble.insertBefore(errorDiv, resizeHandle);

        browser.runtime.sendMessage({
          type: 'webcam-overlay-error',
          error: (err as Error).message,
        });
      }

      setupDrag(bubble);
      setupResize(bubble, resizeHandle);
    }

    function addDocumentListener(event: string, handler: EventListener) {
      document.addEventListener(event, handler);
      documentListeners.push({ event, handler });
    }

    function setupDrag(bubble: HTMLDivElement) {
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;

      bubble.addEventListener('mousedown', (e: MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
        e.preventDefault();
        isDragging = true;
        bubble.classList.add('dragging');

        const rect = bubble.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
      });

      addDocumentListener('mousemove', ((e: MouseEvent) => {
        if (!isDragging) return;

        const x = e.clientX - dragOffsetX;
        const y = e.clientY - dragOffsetY;

        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';
      }) as EventListener);

      addDocumentListener('mouseup', (() => {
        if (isDragging) {
          isDragging = false;
          bubble.classList.remove('dragging');
        }
      }) as EventListener);
    }

    function setupResize(bubble: HTMLDivElement, handle: HTMLDivElement) {
      let isResizing = false;
      let startX = 0;
      let startY = 0;
      let startSize = 0;

      handle.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;

        startX = e.clientX;
        startY = e.clientY;
        startSize = bubble.offsetWidth;
      });

      addDocumentListener('mousemove', ((e: MouseEvent) => {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const delta = Math.max(dx, dy);
        const newSize = Math.max(80, Math.min(600, startSize + delta));

        bubble.style.width = `${newSize}px`;
        bubble.style.height = `${newSize}px`;
      }) as EventListener);

      addDocumentListener('mouseup', (() => {
        isResizing = false;
      }) as EventListener);
    }

    function cleanup() {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }

      if (videoElement) {
        videoElement.srcObject = null;
        videoElement = null;
      }

      if (hostElement) {
        hostElement.remove();
        hostElement = null;
      }

      for (const { event, handler } of documentListeners) {
        document.removeEventListener(event, handler);
      }
      documentListeners.length = 0;

      shadowRoot = null;
    }
  },
});
