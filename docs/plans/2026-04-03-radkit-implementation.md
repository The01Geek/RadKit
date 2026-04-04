# RadKit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fork screenshot-editor, rebrand as RadKit, remove Google Fonts, redesign popup with dark glassmorphism cards, add Alt+S keyboard shortcut, and apply devflow-autopilot automation layer.

**Architecture:** WXT browser extension with React 19 + TypeScript. Popup is the entry point for capture mode selection, background script handles capture logic and keyboard commands, content script handles area selection overlay, editor page handles annotation. All fonts bundled locally — zero external network requests.

**Tech Stack:** WXT, React 19, TypeScript, Vite, Konva

---

### Task 1: Copy Base Project into Working Directory

**Files:**
- Copy: all files from `/tmp/screenshot-editor/` → `C:/Projects/Rad-Extension/`

**Step 1: Copy source files (excluding .git)**

Run:
```bash
cp -r /tmp/screenshot-editor/* /c/Projects/Rad-Extension/
cp /tmp/screenshot-editor/.gitignore /c/Projects/Rad-Extension/
```
Expected: All source files copied

**Step 2: Initialize git repo**

Run:
```bash
cd /c/Projects/Rad-Extension && git init
```
Expected: Initialized empty Git repository

**Step 3: Install dependencies**

Run:
```bash
cd /c/Projects/Rad-Extension && npm install
```
Expected: Dependencies installed successfully

**Step 4: Verify build works**

Run:
```bash
cd /c/Projects/Rad-Extension && npm run build
```
Expected: Build completes without errors, `.output/chrome-mv3` directory created

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize RadKit from screenshot-editor v1.2.2 fork"
```

---

### Task 2: Rebrand to RadKit

**Files:**
- Modify: `wxt.config.ts`
- Modify: `package.json`
- Modify: `entrypoints/popup/index.html`
- Modify: `entrypoints/editor/index.html`
- Modify: `entrypoints/background.ts`
- Modify: `README.md`

**Step 1: Update wxt.config.ts**

Change manifest name and description:
```typescript
manifest: {
    name: 'RadKit',
    description: 'Capture & edit screenshots with privacy-first design',
    version: '1.0.0',
    // ... rest unchanged
}
```

**Step 2: Update package.json**

Change name, description, and version:
```json
{
  "name": "radkit",
  "description": "Capture & edit screenshots with privacy-first design",
  "version": "1.0.0",
  ...
}
```

**Step 3: Update HTML titles**

In both `entrypoints/popup/index.html` and `entrypoints/editor/index.html`:
```html
<title>RadKit</title>
```

**Step 4: Update background.ts console log**

Line 3 of `entrypoints/background.ts`:
```typescript
console.log('RadKit background script loaded');
```

**Step 5: Update README.md**

Replace contents with a minimal RadKit README:
```markdown
# RadKit

Privacy-first screenshot browser extension for Chrome and Microsoft Edge.

Forked from [raakkan/screenshot-editor](https://github.com/raakkan/screenshot-editor) (MIT License).

## Features

- Visible viewport, selected area, and full page capture
- Annotation editor: arrows, text, shapes, blur, crop, pencil, lines
- Export as PNG, JPEG, or clipboard
- Alt+S keyboard shortcut for instant visible capture
- Zero external network requests — fully offline

## Development

```bash
npm install
npm run dev        # Dev mode with hot reload
npm run build      # Build for Chrome/Edge
```

## License

MIT — see [LICENSE](LICENSE) for details.
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add wxt.config.ts package.json entrypoints/popup/index.html entrypoints/editor/index.html entrypoints/background.ts README.md
git commit -m "chore: rebrand to RadKit"
```

---

### Task 3: Generate RK Placeholder Icons

**Files:**
- Modify: `public/icon/16.png`
- Modify: `public/icon/32.png`
- Modify: `public/icon/48.png`
- Modify: `public/icon/96.png`
- Modify: `public/icon/128.png`

**Step 1: Create a Node script to generate icons**

Create a temporary script `generate-icons.js` that uses the `canvas` npm package (or inline SVG-to-PNG) to render "RK" text in white on a purple (`#a173fe`) rounded-rect background at sizes 16, 32, 48, 96, 128.

Alternative: Use an inline SVG data URI converted to PNG via a build-time script, or manually create simple icons.

Since we're in a Node environment without `canvas` native bindings, the simplest approach is:

1. Create an SVG string with "RK" text on purple background
2. Use the browser's built-in rendering (or a simple online tool) to convert to PNGs
3. Or use `sharp` npm package if available

The pragmatic approach: create SVG icons and convert them. If native image generation is difficult in this environment, create SVG-based icons as a placeholder and note they can be replaced later.

**Step 2: Verify icons appear in build**

Run: `npm run build`
Check: `.output/chrome-mv3/icon/` contains all 5 sizes

**Step 3: Commit**

```bash
git add public/icon/
git commit -m "chore: add RK placeholder icons"
```

---

### Task 4: Bundle Inter Font Locally

**Files:**
- Create: `assets/fonts/inter.css`
- Create: `assets/fonts/Inter-Regular.woff2`
- Create: `assets/fonts/Inter-Medium.woff2`
- Create: `assets/fonts/Inter-SemiBold.woff2`
- Create: `assets/fonts/Inter-Bold.woff2`
- Modify: `entrypoints/popup/App.css` (line 2 — remove Google Fonts import)
- Modify: `entrypoints/editor/editor.css` (line 2 — remove Google Fonts import)

**Step 1: Download Inter woff2 files**

Download Inter font files (Regular 400, Medium 500, SemiBold 600, Bold 700) in woff2 format from Google Fonts CDN or the Inter GitHub releases. Save to `assets/fonts/`.

**Step 2: Create @font-face CSS file**

Create `assets/fonts/inter.css`:
```css
@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('./Inter-Regular.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('./Inter-Medium.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('./Inter-SemiBold.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('./Inter-Bold.woff2') format('woff2');
}
```

**Step 3: Remove Google Fonts imports**

In `entrypoints/popup/App.css` line 2, remove:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
```
Replace with:
```css
@import '../../assets/fonts/inter.css';
```

In `entrypoints/editor/editor.css` line 2, same replacement.

**Step 4: Remove dynamic Google Fonts loading from Editor.tsx**

In `entrypoints/editor/Editor.tsx` around line 410-430, replace the dynamic Google Fonts link injection with a no-op or local font loading. The `loadFont` logic currently creates a `<link>` element pointing to `fonts.googleapis.com`. Change this to simply check if the font is available locally via `document.fonts.load()` without creating the external link.

Replace the block that creates the Google Fonts link:
```typescript
if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';
    link.onload = processLoad;
    link.onerror = () => activeFontLoads.current.delete(fontName);
    document.head.appendChild(link);
} else {
    processLoad();
}
```

With:
```typescript
// Fonts are bundled locally — just trigger the load check
processLoad();
```

**Step 5: Trim AVAILABLE_FONTS to bundled fonts only**

Since we're only bundling Inter locally, reduce the font list to just Inter (and system fonts as fallbacks). Or bundle a few more key fonts (Roboto, Fira Code) if desired. For now, keep it to Inter and system fallbacks:

```typescript
const AVAILABLE_FONTS = [
    { name: 'Inter', category: 'sans-serif' },
    { name: 'Arial', category: 'sans-serif' },
    { name: 'Georgia', category: 'serif' },
    { name: 'Times New Roman', category: 'serif' },
    { name: 'Courier New', category: 'monospace' },
    { name: 'Verdana', category: 'sans-serif' },
];
```

These are all system fonts that don't need downloading.

**Step 6: Verify no external requests**

Run: `npm run build`
Then grep the built output for any remaining Google Fonts references:
```bash
grep -r "googleapis" .output/
```
Expected: No results

**Step 7: Commit**

```bash
git add assets/fonts/ entrypoints/popup/App.css entrypoints/editor/editor.css entrypoints/editor/Editor.tsx
git commit -m "feat: bundle Inter font locally, remove all Google Fonts dependencies"
```

---

### Task 5: Redesign Popup — Dark Glassmorphism Cards

**Files:**
- Modify: `entrypoints/popup/App.tsx`
- Modify: `entrypoints/popup/App.css`

**Step 1: Rewrite App.css with dark glassmorphism theme**

Replace entire contents of `entrypoints/popup/App.css`:

```css
@import '../../assets/fonts/inter.css';

:root {
    --bg-dark: #0f0f14;
    --card-bg: rgba(255, 255, 255, 0.06);
    --card-border: rgba(255, 255, 255, 0.08);
    --card-hover-bg: rgba(255, 255, 255, 0.10);
    --card-hover-border: rgba(161, 115, 254, 0.4);
    --accent: #a173fe;
    --accent-glow: rgba(161, 115, 254, 0.15);
    --text-primary: #f0f0f5;
    --text-secondary: #8a8a9a;
    --radius: 14px;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg-dark);
    color: var(--text-primary);
    min-width: 320px;
    overflow: hidden;
}

.popup-container {
    padding: 20px;
    background: var(--bg-dark);
    position: relative;
}

.popup-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 0;
}

.popup-header {
    position: relative;
    z-index: 1;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.brand-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
}

.brand-accent {
    color: var(--accent);
}

.shortcut-hint {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.05);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
}

.capture-modes {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.capture-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--card-border);
    border-radius: var(--radius);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    width: 100%;
    outline: none;
}

.capture-card:hover:not(:disabled) {
    background: var(--card-hover-bg);
    border-color: var(--card-hover-border);
    box-shadow: 0 0 20px var(--accent-glow), 0 4px 16px rgba(0, 0, 0, 0.3);
    transform: scale(1.02);
}

.capture-card:active:not(:disabled) {
    transform: scale(0.98);
}

.capture-card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.capture-card .icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(161, 115, 254, 0.1);
    border-radius: 10px;
    color: var(--accent);
    flex-shrink: 0;
    transition: all 0.25s ease;
}

.capture-card:hover:not(:disabled) .icon-wrap {
    background: var(--accent);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(161, 115, 254, 0.4);
}

.capture-card .card-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.capture-card .card-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.capture-card .card-desc {
    font-size: 12px;
    color: var(--text-secondary);
}

.status-bar {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
    padding: 10px;
    background: rgba(161, 115, 254, 0.08);
    border: 1px solid rgba(161, 115, 254, 0.15);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: var(--accent);
}

.pulse-dot {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
}
```

**Step 2: Rewrite App.tsx with new card-based UI**

Replace entire contents of `entrypoints/popup/App.tsx`:

```tsx
import React, { useState } from 'react';
import './App.css';
import { IconMonitor, IconSelection, IconFile } from '../editor/Icons';

type CaptureMode = 'visible' | 'selection' | 'fullpage';

function App() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState('');

    const handleCapture = async (mode: CaptureMode) => {
        setIsCapturing(true);
        setStatus('Capturing...');

        try {
            const response = await browser.runtime.sendMessage({
                type: 'capture',
                mode: mode,
            });

            if (response?.success) {
                setStatus('Opening editor...');
                setTimeout(() => window.close(), 500);
            } else {
                setStatus(response?.error || 'Capture failed');
                setIsCapturing(false);
            }
        } catch (error) {
            setStatus('Error: ' + (error as Error).message);
            setIsCapturing(false);
        }
    };

    return (
        <div className="popup-container">
            <header className="popup-header">
                <span className="brand-name">Rad<span className="brand-accent">Kit</span></span>
                <span className="shortcut-hint">Alt+S</span>
            </header>

            <div className="capture-modes">
                <button
                    className="capture-card"
                    onClick={() => handleCapture('visible')}
                    disabled={isCapturing}
                >
                    <span className="icon-wrap"><IconMonitor /></span>
                    <div className="card-content">
                        <span className="card-label">Visible Viewport</span>
                        <span className="card-desc">Capture what's on screen</span>
                    </div>
                </button>

                <button
                    className="capture-card"
                    onClick={() => handleCapture('selection')}
                    disabled={isCapturing}
                >
                    <span className="icon-wrap"><IconSelection /></span>
                    <div className="card-content">
                        <span className="card-label">Select Area</span>
                        <span className="card-desc">Draw a custom rectangle</span>
                    </div>
                </button>

                <button
                    className="capture-card"
                    onClick={() => handleCapture('fullpage')}
                    disabled={isCapturing}
                >
                    <span className="icon-wrap"><IconFile /></span>
                    <div className="card-content">
                        <span className="card-label">Full Page</span>
                        <span className="card-desc">Capture top to bottom</span>
                    </div>
                </button>
            </div>

            {status && (
                <div className="status-bar">
                    {isCapturing && <span className="pulse-dot" />}
                    {status}
                </div>
            )}
        </div>
    );
}

export default App;
```

**Step 3: Remove logo import (no longer used)**

The old App.tsx imported `logo.png`. The new version uses text branding instead. The logo file can stay in assets for future use but is no longer imported.

**Step 4: Verify build and test visually**

Run: `npm run build`
Expected: Build succeeds. Load unpacked in Chrome to verify dark glassmorphism popup appears.

**Step 5: Commit**

```bash
git add entrypoints/popup/App.tsx entrypoints/popup/App.css
git commit -m "feat: redesign popup with dark glassmorphism card UI"
```

---

### Task 6: Add Alt+S Keyboard Shortcut

**Files:**
- Modify: `wxt.config.ts`
- Modify: `entrypoints/background.ts`

**Step 1: Add commands to wxt.config.ts manifest**

Add a `commands` section to the manifest in `wxt.config.ts`:

```typescript
export default defineConfig({
    modules: ['@wxt-dev/module-react'],
    manifest: {
        name: 'RadKit',
        description: 'Capture & edit screenshots with privacy-first design',
        version: '1.0.0',
        icons: {
            16: 'icon/16.png',
            32: 'icon/32.png',
            48: 'icon/48.png',
            96: 'icon/96.png',
            128: 'icon/128.png',
        },
        permissions: ['activeTab', 'storage', 'scripting', 'unlimitedStorage'],
        commands: {
            'capture-visible': {
                suggested_key: {
                    default: 'Alt+S',
                },
                description: 'Capture visible viewport',
            },
        },
    },
});
```

**Step 2: Add command listener in background.ts**

Add this inside the `defineBackground(() => { ... })` block, after the `browser.runtime.onMessage.addListener(...)` section:

```typescript
// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'capture-visible') {
        try {
            await handleCapture('visible');
        } catch (error) {
            console.error('Keyboard shortcut capture failed:', error);
        }
    }
});
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. After loading unpacked, check `chrome://extensions/shortcuts` — should show "Capture visible viewport: Alt+S".

**Step 4: Commit**

```bash
git add wxt.config.ts entrypoints/background.ts
git commit -m "feat: add Alt+S keyboard shortcut for instant visible capture"
```

---

### Task 7: Apply devflow-autopilot Automation Layer

**Files:**
- Create: `.claude/settings.json`
- Create: `.claude/agents/checklist-generator.md`
- Create: `.claude/agents/checklist-verifier.md`
- Create: `.claude/agents/github-issue-creator.md`
- Create: `.claude/skills/implement/SKILL.md`
- Create: `.claude/skills/review/SKILL.md`
- Create: `.claude/skills/review-and-fix/SKILL.md`
- Create: `.claude/skills/create-issue/SKILL.md`
- Create: `.claude/skills/pr-description/SKILL.md`
- Create: `.claude/skills/docs/SKILL.md`
- Create: `.claude/skills/docs-sync-internal/SKILL.md`
- Create: `.claude/skills/docs-sync-external/SKILL.md`
- Create: `.claude/skills/docs-release-notes/SKILL.md`
- Create: `.claude/skills/docs-verify/SKILL.md`
- Create: `.claude/skills/docs-bootstrap-internal/SKILL.md`
- Create: `.claude/skills/docs-bootstrap-external/SKILL.md`
- Create: `.github/project-config.yml`
- Create: `.github/workflows/claude.yml`
- Create: `.github/workflows/WikiWizard.yml`
- Create: `.github/workflows/comment-on-draft-issues.yml`
- Create: `.github/workflows/move-to-in-progress.yml`
- Create: `.github/workflows/sync-pr-status-to-issue.yml`
- Create: `.github/workflows/close-released-items.yml`
- Create: `docs/internal/.gitkeep`
- Create: `docs/external/.gitkeep`
- Modify: `CLAUDE.md`

**Step 1: Copy automation files from devflow-autopilot**

```bash
cp -r /tmp/devflow-autopilot/.claude/* /c/Projects/Rad-Extension/.claude/
cp -r /tmp/devflow-autopilot/.github/* /c/Projects/Rad-Extension/.github/
cp /tmp/devflow-autopilot/CLAUDE.md /c/Projects/Rad-Extension/CLAUDE.md
mkdir -p docs/internal docs/external
touch docs/internal/.gitkeep docs/external/.gitkeep
```

**Step 2: Update project-config.yml**

Edit `.github/project-config.yml` to set the correct project details for RadKit (project number, base branch, etc.). These will need the user's GitHub project number once the repo is created.

**Step 3: Update CLAUDE.md**

Uncomment relevant sections and fill in RadKit-specific conventions:
- Environment: Node.js, WXT, React 19, TypeScript
- Architecture: Browser extension (popup, background, content script, editor)
- Directory structure overview

**Step 4: Verify nothing breaks**

Run: `npm run build`
Expected: Build succeeds (automation files don't affect the extension build)

**Step 5: Commit**

```bash
git add .claude/ .github/ docs/ CLAUDE.md
git commit -m "chore: apply devflow-autopilot automation layer"
```

---

### Task 8: Final Verification

**Step 1: Clean build**

```bash
rm -rf .output node_modules
npm install
npm run build
```
Expected: Build succeeds

**Step 2: Grep for any remaining external URLs**

```bash
grep -r "googleapis\|google.*font\|analytics\|tracking" .output/ --include="*.js" --include="*.css" --include="*.html"
```
Expected: No results

**Step 3: Verify manifest in built output**

```bash
cat .output/chrome-mv3/manifest.json
```
Expected: Name is "RadKit", commands section includes `capture-visible` with `Alt+S`

**Step 4: Load in Chrome and test**

1. Go to `chrome://extensions`, enable Developer mode
2. Click "Load unpacked", select `.output/chrome-mv3`
3. Verify: popup shows dark glassmorphism cards
4. Verify: Alt+S captures visible viewport
5. Verify: all 3 capture modes work
6. Verify: editor opens with annotation tools
7. Check `chrome://extensions/shortcuts` for keyboard shortcut

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```
