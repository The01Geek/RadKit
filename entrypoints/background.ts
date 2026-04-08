// Background script for handling screenshot capture
export default defineBackground(() => {
  console.log('RadKit background script loaded');

  // Broadcast a cleanup message to all tabs to ensure selector is gone
  // Broadcast a cleanup message to ensure selector is gone
  async function broadcastCleanup(tabId?: number) {
    try {
      if (tabId) {
        await browser.tabs.sendMessage(tabId, { type: 'cleanup-selection' }).catch(() => { });
        return;
      }

      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await browser.tabs.sendMessage(activeTab.id, { type: 'cleanup-selection' }).catch(() => { });
      }
    } catch (e) {
      console.error('Broadcast cleanup failed:', e);
    }
  }

  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'capture') {
      handleCapture(message.mode)
        .then((result) => sendResponse(result))
        .catch((error: any) => {
          console.error('Capture error:', error);
          let errorMessage = error.message || 'Unknown error';
          if (errorMessage.includes('Cannot access') || errorMessage.includes('restricted')) {
            errorMessage = 'Browser restriction: Cannot capture internal browser pages.';
          }
          sendResponse({ success: false, error: errorMessage });
        });
      return true;
    }

    if (message.type === 'selection-complete') {
      return false; // Handled by waitForSelection
    }

    return false;
  });

  // Listen for keyboard shortcuts
  chrome.commands.onCommand.addListener(async (command) => {
    try {
      if (command === 'capture-visible') {
        await handleCapture('visible');
      } else if (command === 'capture-desktop') {
        await handleCapture('desktop');
      }
    } catch (error) {
      console.error('Keyboard shortcut capture failed:', error);
    }
  });

  // Tracks whether the last selection capture used "Done" mode (skip editor)
  let lastSelectionMode: 'done' | 'edit' | undefined;

  async function handleCapture(mode: string): Promise<{ success: boolean; error?: string }> {
    try {
      let imageDataUrl: string;
      lastSelectionMode = undefined;

      switch (mode) {
        case 'visible':
          imageDataUrl = await captureVisibleTab();
          break;
        case 'selection':
          imageDataUrl = await captureWithSelection();
          break;
        case 'fullpage':
          imageDataUrl = await captureFullPage();
          break;
        case 'visible-delayed':
          await new Promise(resolve => setTimeout(resolve, 3000));
          imageDataUrl = await captureVisibleTab();
          break;
        case 'desktop':
          imageDataUrl = await captureDesktopMedia();
          break;
        case 'recording':
          return await captureRecording();
        default:
          throw new Error('Unknown capture mode');
      }

      await browser.storage.local.set({ capturedImage: imageDataUrl });

      // Persist to screenshots history
      const entry = {
        id: 'ss_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        timestamp: new Date().toISOString(),
        mode,
        size: imageDataUrl.length,
        dataUrl: imageDataUrl,
      };
      const stored = await browser.storage.local.get({ screenshots: [] });
      const screenshots = stored.screenshots || [];
      screenshots.unshift(entry);
      await browser.storage.local.set({ screenshots });

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      // "Done" mode: save without opening editor
      if (lastSelectionMode === 'done') {
        // Download the image directly
        try {
          const filename = `radkit-screenshot-${Date.now()}.png`;
          await chrome.downloads.download({
            url: imageDataUrl,
            filename,
            saveAs: false,
          });
        } catch (e) {
          console.warn('Auto-download failed, falling back to editor:', e);
          await browser.tabs.create({ url: browser.runtime.getURL('/editor.html') });
        }
      } else {
        await browser.tabs.create({ url: browser.runtime.getURL('/editor.html') });
      }

      await broadcastCleanup(tab?.id);

      return { success: true };
    } catch (error) {
      console.error('Capture failed:', error);
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      await broadcastCleanup(tab?.id);
      throw error;
    }
  }

  async function captureVisibleTab(): Promise<string> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    return await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(
        { format: 'png' },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(dataUrl);
          }
        }
      );
    });
  }

  async function captureDesktopMedia(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // Open a small extension window — it has user activation so getDisplayMedia works
      chrome.windows.create(
        {
          url: chrome.runtime.getURL('/capture.html'),
          type: 'popup',
          width: 1024,
          height: 768,
          focused: true,
        },
        (win) => {
          const listener = (message: any) => {
            if (message.type !== 'desktop-capture-result') return;
            browser.runtime.onMessage.removeListener(listener);
            if (win?.id) chrome.windows.remove(win.id);
            if (message.success) {
              resolve(message.dataUrl);
            } else {
              reject(new Error(message.error || 'Capture failed'));
            }
          };
          browser.runtime.onMessage.addListener(listener);
        }
      );
    });
  }

  async function captureRecording(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve, reject) => {
      chrome.windows.create(
        {
          url: chrome.runtime.getURL('/record.html'),
          type: 'popup',
          width: 1024,
          height: 768,
          focused: true,
        },
        (win) => {
          if (chrome.runtime.lastError || !win) {
            reject(new Error(chrome.runtime.lastError?.message || 'Failed to open recording window'));
            return;
          }

          let settled = false;

          const cleanup = () => {
            browser.runtime.onMessage.removeListener(messageListener);
            chrome.windows.onRemoved.removeListener(windowListener);
          };

          const messageListener = (message: any) => {
            if (message.type === 'recording-preview-ready') {
              // Recording finished — close the small popup and open preview in a real tab
              if (settled) return;
              settled = true;
              cleanup();
              if (win?.id) chrome.windows.remove(win.id);
              chrome.tabs.create({ url: chrome.runtime.getURL('/preview.html') });
              resolve({ success: true });
              return;
            }

            if (message.type === 'recording-result') {
              if (settled) return;
              settled = true;
              cleanup();
              if (win?.id) chrome.windows.remove(win.id);
              if (message.success) {
                resolve({ success: true });
              } else {
                reject(new Error(message.error || 'Recording failed'));
              }
              return;
            }
          };

          const windowListener = (closedWindowId: number) => {
            if (closedWindowId !== win?.id || settled) return;
            settled = true;
            cleanup();
            reject(new Error('Recording window was closed'));
          };

          browser.runtime.onMessage.addListener(messageListener);
          chrome.windows.onRemoved.addListener(windowListener);
        }
      );
    });
  }

  interface SelectionResult {
    rect: TabRect;
    annotations?: any[];
    mode?: 'done' | 'edit';
  }

  async function captureWithSelection(): Promise<string> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    const possiblePaths = ['content-scripts/content.js', 'content.js'];
    for (const path of possiblePaths) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [path],
        });
        break;
      } catch (e) { }
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      await browser.tabs.sendMessage(tab.id, { type: 'start-selection' });
    } catch (e) {
      throw new Error('Could not connect to the page. Please refresh and try again.');
    }

    // Pre-capture screenshot for annotation blur tool
    try {
      const preCapture = await new Promise<string>((resolve, reject) => {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(dataUrl);
        });
      });
      await browser.tabs.sendMessage(tab.id, {
        type: 'annotation-screenshot-ready',
        dataUrl: preCapture,
      }).catch(() => {});
    } catch (e) {
      // Non-critical — blur tool will show placeholder
      console.warn('Pre-capture for annotation failed:', e);
    }

    const result = await waitForSelection(tab.id);
    lastSelectionMode = result.mode;
    await new Promise(resolve => setTimeout(resolve, 300));

    const fullDataUrl = await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(
        { format: 'png' },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(dataUrl);
          }
        }
      );
    });

    const croppedImage = await cropImage(fullDataUrl, result.rect, tab.id);

    // Handle annotation transfer for "Edit" mode
    if (result.annotations && result.annotations.length > 0 && result.mode === 'edit') {
      // Scale annotations by DPR for the Konva editor
      const dprResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.devicePixelRatio || 1,
      });
      // @ts-ignore
      const dpr = dprResult?.[0]?.result || 1;

      const drawingElements = result.annotations.map((el: any, index: number) => ({
        id: el.id,
        type: el.type,
        x: el.x * dpr,
        y: el.y * dpr,
        width: el.width !== undefined ? el.width * dpr : undefined,
        height: el.height !== undefined ? el.height * dpr : undefined,
        points: el.points ? el.points.map((p: number) => p * dpr) : undefined,
        text: el.text,
        color: el.color,
        strokeWidth: el.strokeWidth * dpr,
        filled: el.filled,
        visible: el.visible,
        name: el.name || `${el.type}-${index}`,
        opacity: el.opacity,
        dash: el.dash ? el.dash.map((d: number) => d * dpr) : null,
        pointerAtStart: el.pointerAtStart,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize ? el.fontSize * dpr : undefined,
        bgColor: el.bgColor,
        imageSrc: el.imageSrc,
      }));

      await browser.storage.local.set({ pendingAnnotations: drawingElements });
    }

    // Handle "Done" mode — composite annotations onto the cropped image
    if (result.annotations && result.annotations.length > 0 && result.mode === 'done') {
      const composited = await compositeAnnotations(croppedImage, result.annotations, result.rect, tab.id);
      return composited;
    }

    return croppedImage;
  }

  function waitForSelection(tabId: number): Promise<SelectionResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        browser.runtime.onMessage.removeListener(listener);
        reject(new Error('Selection timeout'));
      }, 60000);

      const listener = (message: any, sender: any) => {
        if (sender.tab?.id === tabId && message.type === 'selection-complete') {
          clearTimeout(timeout);
          browser.runtime.onMessage.removeListener(listener);
          if (message.canceled) {
            reject(new Error('Selection canceled'));
          } else {
            resolve({
              rect: message.rect,
              annotations: message.annotations,
              mode: message.mode,
            });
          }
        }
      };

      browser.runtime.onMessage.addListener(listener);
    });
  }

  async function compositeAnnotations(
    croppedDataUrl: string,
    annotations: any[],
    rect: TabRect,
    tabId: number
  ): Promise<string> {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (croppedDataUrl: string, annotations: any[]) => {
        return new Promise<string>((resolve) => {
          const img = new Image();
          img.onerror = () => {
            console.error('compositeAnnotations: Failed to load cropped image');
            resolve(croppedDataUrl);
          };
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(croppedDataUrl); return; }

            // Draw the cropped screenshot
            ctx.drawImage(img, 0, 0);

            // Scale factor: cropped image may be DPR-scaled
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.scale(dpr, dpr);

            // Replay each annotation element
            for (const el of annotations) {
              ctx.save();
              ctx.globalAlpha = el.opacity ?? 1;
              ctx.strokeStyle = el.color || '#ff0000';
              ctx.fillStyle = el.color || '#ff0000';
              ctx.lineWidth = el.strokeWidth || 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              if (el.dash && el.dash.length > 0) {
                ctx.setLineDash(el.dash);
              }

              switch (el.type) {
                case 'pencil': {
                  const pts = el.points;
                  if (pts && pts.length >= 4) {
                    ctx.beginPath();
                    ctx.moveTo(el.x + pts[0], el.y + pts[1]);
                    for (let i = 2; i < pts.length; i += 2) {
                      ctx.lineTo(el.x + pts[i], el.y + pts[i + 1]);
                    }
                    ctx.stroke();
                  }
                  break;
                }
                case 'line': {
                  const pts = el.points;
                  if (pts && pts.length >= 4) {
                    ctx.beginPath();
                    ctx.moveTo(el.x + pts[0], el.y + pts[1]);
                    ctx.lineTo(el.x + pts[2], el.y + pts[3]);
                    ctx.stroke();
                  }
                  break;
                }
                case 'arrow': {
                  const pts = el.points;
                  if (pts && pts.length >= 4) {
                    const x1 = el.x + pts[0], y1 = el.y + pts[1];
                    const x2 = el.x + pts[2], y2 = el.y + pts[3];
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    // Arrowhead
                    const angle = Math.atan2(y2 - y1, x2 - x1);
                    const headLen = Math.max(el.strokeWidth * 3, 12);
                    ctx.fillStyle = el.color;
                    ctx.beginPath();
                    ctx.moveTo(x2, y2);
                    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();
                  }
                  break;
                }
                case 'rectangle': {
                  const w = el.width ?? 0;
                  const h = el.height ?? 0;
                  if (el.filled) ctx.fillRect(el.x, el.y, w, h);
                  else ctx.strokeRect(el.x, el.y, w, h);
                  break;
                }
                case 'circle': {
                  const w = el.width ?? 0;
                  const h = el.height ?? 0;
                  ctx.beginPath();
                  ctx.ellipse(el.x + w / 2, el.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
                  if (el.filled) ctx.fill();
                  else ctx.stroke();
                  break;
                }
                case 'text': {
                  if (el.text) {
                    const size = el.fontSize ?? 24;
                    const family = el.fontFamily ?? 'Arial';
                    ctx.font = `${size}px ${family}`;
                    ctx.textBaseline = 'top';
                    if (el.bgColor) {
                      const metrics = ctx.measureText(el.text);
                      ctx.save();
                      ctx.fillStyle = el.bgColor;
                      ctx.fillRect(el.x - 4, el.y - 4, metrics.width + 8, size + 8);
                      ctx.restore();
                    }
                    ctx.fillStyle = el.color;
                    ctx.fillText(el.text, el.x, el.y);
                  }
                  break;
                }
                case 'blur': {
                  // Blur renders as a pixelated region from the underlying image
                  const w = el.width ?? 0;
                  const h = el.height ?? 0;
                  if (w > 0 && h > 0) {
                    const pixelSize = 10;
                    const smallW = Math.max(1, Math.ceil(w / pixelSize));
                    const smallH = Math.max(1, Math.ceil(h / pixelSize));
                    const offscreen = document.createElement('canvas');
                    offscreen.width = smallW;
                    offscreen.height = smallH;
                    const offCtx = offscreen.getContext('2d');
                    if (offCtx) {
                      // Read from the current canvas state (screenshot underneath)
                      offCtx.drawImage(canvas, el.x * dpr, el.y * dpr, w * dpr, h * dpr, 0, 0, smallW, smallH);
                      ctx.imageSmoothingEnabled = false;
                      ctx.drawImage(offscreen, 0, 0, smallW, smallH, el.x, el.y, w, h);
                      ctx.imageSmoothingEnabled = true;
                    }
                  }
                  break;
                }
                case 'image': {
                  // Image annotations with data URL sources — rendered asynchronously below
                  break;
                }
              }
              ctx.restore();
            }

            ctx.restore();

            // Second pass: render image annotations (async loading required)
            const imageAnnotations = annotations.filter((el: any) => el.type === 'image' && el.imageSrc);
            if (imageAnnotations.length > 0) {
              let loaded = 0;
              const tryResolve = () => {
                loaded++;
                if (loaded >= imageAnnotations.length) {
                  resolve(canvas.toDataURL('image/png'));
                }
              };
              ctx.save();
              ctx.scale(dpr, dpr);
              for (const el of imageAnnotations) {
                const annImg = new Image();
                annImg.onload = () => {
                  ctx.globalAlpha = el.opacity ?? 1;
                  ctx.drawImage(annImg, el.x, el.y, el.width ?? 200, el.height ?? 200);
                  tryResolve();
                };
                annImg.onerror = () => tryResolve();
                annImg.src = el.imageSrc;
              }
              ctx.restore();
            } else {
              resolve(canvas.toDataURL('image/png'));
            }
          };
          img.src = croppedDataUrl;
        });
      },
      args: [croppedDataUrl, annotations],
    });
    // @ts-ignore
    return results[0].result || croppedDataUrl;
  }

  interface TabRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  async function cropImage(dataUrl: string, rect: TabRect, tabId: number): Promise<string> {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (dataUrl: string, rect: TabRect) => {
        return new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            const canvas = document.createElement('canvas');
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                img,
                rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr,
                0, 0, rect.width * dpr, rect.height * dpr
              );
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(dataUrl);
            }
          };
          img.src = dataUrl;
        });
      },
      args: [dataUrl, rect],
    });
    // @ts-ignore
    return results[0].result;
  }

  async function captureFullPage(): Promise<string> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    const dimensions = await new Promise<any>((resolve) => {
      // @ts-ignore
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id! },
          func: () => ({
            scrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
            clientHeight: document.documentElement.clientHeight || window.innerHeight,
            clientWidth: document.documentElement.clientWidth || window.innerWidth,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            devicePixelRatio: window.devicePixelRatio,
          }),
        },
        // @ts-ignore
        (results) => resolve(results?.[0]?.result)
      );
    });

    if (!dimensions) throw new Error('Could not get page dimensions');

    const { scrollHeight, clientHeight, scrollX, scrollY, devicePixelRatio: dpr } = dimensions;
    const originalScrollX = scrollX;
    const originalScrollY = scrollY;

    const captures: { dataUrl: string; y: number }[] = [];
    let currentY = 0;

    try {
      let iteration = 0;
      while (currentY < scrollHeight) {
        iteration++;

        // Scroll to the next position
        const actualScrollY = await new Promise<number>((resolve) => {
          // @ts-ignore
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id! },
              func: (y: number) => {
                window.scrollTo(0, y);
                window.dispatchEvent(new Event('scroll'));
                return window.scrollY;
              },
              args: [currentY],
            },
            // @ts-ignore
            (results) => resolve(results?.[0]?.result ?? currentY)
          );
        });

        // Wait for page to settle (animations, lazy loads, and sticky transitions)
        await new Promise(resolve => setTimeout(resolve, 800));

        // On iteration 2+ we hide floating elements BEFORE we capture, in case they appeared during scroll
        if (iteration > 1) {
          await hideFloatingElements(tab.id!);
          // Small delay to ensure layout shift from hiding is complete
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Capture the visible viewport
        const dataUrl = await new Promise<string>((resolve, reject) => {
          // @ts-ignore
          chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
            // @ts-ignore
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(dataUrl);
          });
        });

        captures.push({ dataUrl, y: actualScrollY });

        // IMPORTANT: Immediately AFTER the first frame is captured, we hide fixed elements 
        // that would otherwise overlap subsequent frames.
        if (iteration === 1) {
          await hideFloatingElements(tab.id!);
          // Wait briefly after initial hide
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        currentY += clientHeight;
        if (iteration > 50) break;
      }

      if (!captures.length) throw new Error('Capture failed: No frames received');

      const stitchedDataUrl = await stitchImages(captures, {
        totalHeight: scrollHeight,
        viewportHeight: clientHeight,
        width: dimensions.clientWidth,
        dpr,
      });

      return stitchedDataUrl;
    } finally {
      // @ts-ignore
      chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: (x: number, y: number) => {
          const styleId = 'screenshot-hide-floating';
          const style = document.getElementById(styleId);
          if (style) style.remove();

          document.querySelectorAll('.wxt-screenshot-hidden').forEach(el => {
            el.classList.remove('wxt-screenshot-hidden');
            (el as HTMLElement).style.visibility = '';
            (el as HTMLElement).style.opacity = '';
            (el as HTMLElement).style.display = '';
          });
          window.scrollTo(x, y);
        },
        args: [originalScrollX, originalScrollY],
      });
    }
  }

  async function hideFloatingElements(tabId: number) {
    try {
      // @ts-ignore
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const styleId = 'screenshot-hide-floating';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
              .wxt-screenshot-hidden {
                visibility: hidden !important;
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
              }
              .wxt-screenshot-hidden * {
                visibility: hidden !important;
                display: none !important;
              }
            `;
            document.head.appendChild(style);
          }

          const tags = [
            'header', 'nav', '.navbar', '.header', '.sticky',
            '#gb', '#searchform', '.RNNXbe', '.topbar', '.navigation',
            '#appbar', '[id*="search"]', '[class*="search"]',
            '[role="banner"]', '[role="navigation"]',
            '[id*="header"]', '[id*="navbar"]', '[class*="header"]', '[class*="navbar"]',
            '.tsf'
          ];

          tags.forEach(sel => {
            try {
              document.querySelectorAll(sel).forEach(el => {
                const s = getComputedStyle(el);
                if (s.position === 'fixed' || s.position === 'sticky') {
                  el.classList.add('wxt-screenshot-hidden');
                  // Hide children recursively to prevent "leakage"
                  el.querySelectorAll('*').forEach(child => (child as HTMLElement).classList.add('wxt-screenshot-hidden'));
                }
              });
            } catch (e) { }
          });

          // Broad scan for any fixed/sticky elements or high-zindex floating items
          document.querySelectorAll('*').forEach(el => {
            const s = getComputedStyle(el);
            const pos = s.position;
            const zIndex = parseInt(s.zIndex) || 0;

            if (pos === 'fixed' || pos === 'sticky') {
              el.classList.add('wxt-screenshot-hidden');
              el.querySelectorAll('*').forEach(child => (child as HTMLElement).classList.add('wxt-screenshot-hidden'));
            } else if (zIndex >= 50 && (pos === 'absolute' || pos === 'fixed')) {
              // Heuristic for elements moved by JS to mimic sticky/fixed
              const rect = el.getBoundingClientRect();
              if (rect.top <= 10 && rect.width > window.innerWidth * 0.45) {
                el.classList.add('wxt-screenshot-hidden');
                el.querySelectorAll('*').forEach(child => (child as HTMLElement).classList.add('wxt-screenshot-hidden'));
              }
            }
          });
        }
      });
    } catch (e) {
      console.error('Hiding floating elements failed:', e);
    }
  }

  async function stitchImages(
    captures: { dataUrl: string; y: number }[],
    opts: { totalHeight: number; viewportHeight: number; width: number; dpr: number }
  ): Promise<string> {
    const bitmaps: ImageBitmap[] = [];
    for (const capture of captures) {
      const response = await fetch(capture.dataUrl);
      const blob = await response.blob();
      bitmaps.push(await createImageBitmap(blob));
    }

    const canvasWidth = bitmaps[0].width;
    const viewportPixelHeight = bitmaps[0].height;

    // Increase SAFETY CAP to 30,000px for much longer page support
    const MAX_CANVAS_HEIGHT = 30000;
    const totalPixelHeight = Math.min(Math.ceil(opts.totalHeight * opts.dpr), MAX_CANVAS_HEIGHT);

    console.log(`Stitching ${captures.length} frames into ${canvasWidth}x${totalPixelHeight} canvas...`);

    let canvas: OffscreenCanvas;
    try {
      canvas = new OffscreenCanvas(canvasWidth, totalPixelHeight);
    } catch (e) {
      console.error('Canvas creation failed. Total height:', totalPixelHeight);
      throw new Error('Image too large: The screenshot exceeds browser limits. Try capturing a smaller area.');
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create stitching canvas context');

    for (let i = 0; i < bitmaps.length; i++) {
      const bitmap = bitmaps[i];
      const scrollY = captures[i].y * opts.dpr;

      // Stop drawing if we exceed the safety cap
      if (scrollY >= MAX_CANVAS_HEIGHT) break;

      if (i === 0) {
        // First frame: draw full viewport
        const drawHeight = Math.min(viewportPixelHeight, MAX_CANVAS_HEIGHT);
        ctx.drawImage(bitmap, 0, 0, bitmap.width, drawHeight, 0, 0, bitmap.width, drawHeight);
      } else {
        // Subsequent frames: anchor exactly at the end of the previous frame
        const prevScrollY = captures[i - 1].y * opts.dpr;
        const prevEndY = Math.round(prevScrollY + viewportPixelHeight);

        // Calculate how many pixels of current frame we already captured in previous frames
        // We use Math.ceil to ensure we cover any sub-pixel gaps
        const overlap = Math.max(0, Math.ceil(prevEndY - scrollY));

        // Final coordinates must be integers to prevent blurring
        // We anchor exactly where the previous frame ended
        const drawY = prevEndY;
        const availableHeight = Math.round(viewportPixelHeight - overlap);
        const drawHeight = Math.min(availableHeight, Math.round(MAX_CANVAS_HEIGHT - drawY));

        if (drawHeight > 0) {
          ctx.drawImage(
            bitmap,
            0, overlap, bitmap.width, drawHeight,
            0, drawY, bitmap.width, drawHeight
          );
        }
      }
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return blobToDataUrl(blob);
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
});
