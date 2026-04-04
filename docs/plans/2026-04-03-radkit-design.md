# RadKit — Screenshot Browser Extension Design

## Overview

RadKit is a privacy-first screenshot browser extension for Chrome and Microsoft Edge, forked from [raakkan/screenshot-editor](https://github.com/raakkan/screenshot-editor) (MIT license). It captures full-page, visible viewport, and selected area screenshots with a built-in annotation editor.

## Goals

- Full privacy: zero external network requests, all processing local
- Modern dark glassmorphism popup UI
- Fast capture via Alt+S keyboard shortcut
- Works on Chrome and Microsoft Edge
- Automated development workflow via devflow-autopilot template

## Tech Stack

- WXT (web extension framework)
- React 19
- TypeScript
- Vite
- Konva (2D canvas for editor)

## Changes from Base Project

### 1. Rebranding

- Extension name: **RadKit**
- Package name: `radkit`
- All references to "Screenshot Editor Pro" replaced
- New placeholder icon with "RK" text
- Description: "Capture & edit screenshots with privacy-first design"

### 2. Google Fonts Removal

- Remove `@import url('https://fonts.googleapis.com/...')` from popup CSS
- Remove dynamic Google Fonts loading from editor text tool
- Download Inter font (woff2) and bundle in `assets/fonts/`
- Use local `@font-face` declarations instead
- Drop Outfit font (unused in UI)
- Result: zero external network requests

### 3. Popup Redesign — Dark Glassmorphism Cards

- Dark background (`#0f0f14`) with subtle noise texture
- Frosted glass cards: `rgba(255,255,255,0.06)` background, `backdrop-filter: blur(12px)`, `1px` border at `rgba(255,255,255,0.08)`
- 3 cards stacked vertically, each with icon (left) + label/description (right)
- Hover: subtle purple glow border, slight scale-up (1.02), background brightens
- Accent color: `#a173fe` (purple, carried over from base)
- Header: "RadKit" bold text
- Status: pulsing animation in accent color during capture
- Width: ~320px
- Font: Inter (bundled locally)

### 4. Keyboard Shortcut

- `Alt + S` immediately captures the visible viewport and opens the editor (bypasses popup)
- Implemented via `chrome.commands` API with a custom `capture-visible` command
- Background script listens on `chrome.commands.onCommand`
- User can remap via `chrome://extensions/shortcuts` or `edge://extensions/shortcuts`

### 5. Automation Layer

Apply devflow-autopilot template:
- `.claude/` directory: agents, skills, `settings.json`
- `.github/` directory: workflows (`claude.yml`, `WikiWizard.yml`, etc.), `project-config.yml`
- `docs/internal/` and `docs/external/` directories
- `CLAUDE.md` project conventions file

### 6. Project Structure

```
RadKit/
├── .claude/              # Claude Code config (from devflow-autopilot)
│   ├── settings.json
│   ├── agents/
│   └── skills/
├── .github/              # GitHub Actions (from devflow-autopilot)
│   ├── project-config.yml
│   └── workflows/
├── assets/
│   ├── fonts/            # Bundled Inter woff2 files
│   └── logo.png
├── docs/
│   ├── plans/            # Design docs
│   ├── internal/         # Internal technical docs
│   └── external/         # User-facing docs
├── entrypoints/
│   ├── background.ts     # Service worker + keyboard shortcut handler
│   ├── content.ts        # Area selection overlay
│   ├── selection.css
│   ├── popup/            # Redesigned glassmorphism popup
│   └── editor/           # Screenshot editor (unchanged)
├── public/icon/          # RK placeholder icons
├── wxt.config.ts         # WXT config + commands definition
├── package.json
├── CLAUDE.md
└── LICENSE               # MIT (original copyright retained)
```

## What Stays the Same

- All 3 capture modes (visible, select area, full page)
- All editor tools (arrow, text, rectangle, circle, line, pencil, blur, crop)
- Export options (PNG, JPEG, clipboard)
- Undo/redo, zoom, color picker, stroke width
- Core architecture (WXT + React + Konva)

## Out of Scope

- Custom logo design (placeholder for now)
- Additional annotation tools
- Chrome/Edge store publishing
- Editor UI redesign

## License

MIT license retained. Original copyright notice from raakkan/screenshot-editor preserved.
