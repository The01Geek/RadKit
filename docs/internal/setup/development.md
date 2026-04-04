# Development Setup

## Prerequisites

- Node.js (LTS)
- npm

## Install

```bash
npm install
```

This also runs `wxt prepare` as a postinstall hook, which generates the `.wxt/` directory with TypeScript config and auto-imports.

## Development

```bash
npm run dev          # Chrome dev mode with hot reload
npm run dev:firefox  # Firefox dev mode
```

WXT starts a development server and launches a browser instance with the extension loaded. Changes to source files trigger hot reload.

## Build

```bash
npm run build          # Production build for Chrome
npm run build:firefox  # Production build for Firefox
npm run zip            # Build + zip for Chrome Web Store
npm run zip:firefox    # Build + zip for Firefox Add-ons
```

## Type Checking

```bash
npm run compile   # tsc --noEmit
```

## Project Origins

RadKit is forked from [raakkan/screenshot-editor](https://github.com/raakkan/screenshot-editor) (MIT license). Key changes from the fork:

1. **Rebranding** — renamed to RadKit, new icons, updated descriptions
2. **Privacy hardening** — removed all Google Fonts imports, bundled Inter font locally, zero external requests
3. **Popup redesign** — dark glassmorphism card UI replacing the original design
4. **Keyboard shortcut** — `Alt+S` for instant visible-viewport capture
5. **Automation** — GitHub Actions workflows for Claude-powered PR assistance and code review

## Configuration

- `wxt.config.ts` — WXT framework config, manifest definition, permissions, commands
- `tsconfig.json` — extends `.wxt/tsconfig.json`, enables React JSX
- `package.json` — dependencies and scripts

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `wxt` | ^0.20.6 | Extension framework |
| `react` / `react-dom` | ^19.2.3 | UI library |
| `konva` / `react-konva` | ^10.2.0 / ^19.2.2 | 2D canvas for editor |
| `@wxt-dev/module-react` | ^1.1.5 | WXT React integration |
| `typescript` | ^5.9.3 | Type checking |
| `sharp` | ^0.34.5 | Image processing (build-time icon generation) |
