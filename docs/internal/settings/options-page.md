# Options / Settings Page

> **Status:** Not yet implemented. This document describes the current state of configurable behavior in RadKit and identifies the gaps an options page would address.

## Current State

RadKit currently has **no dedicated options/settings page**. All configuration is either hardcoded or defined at build time in `wxt.config.ts`.

### Existing Configurable Behavior

| Feature | Current behavior | Location |
|---------|-----------------|----------|
| Capture format | Hardcoded to `png` | `background.ts:104` (`captureVisibleTab({ format: 'png' })`) |
| Export format | PNG or JPEG via button; quality hardcoded to `0.9` | `Editor.tsx:1037-1047` (`handleDownload`) |
| Keyboard shortcuts | `Alt+S` (visible), `Alt+D` (desktop) — defined in manifest, no runtime override | `wxt.config.ts:19-31` |
| Image storage | Single `capturedImage` key in `browser.storage.local`; overwritten each capture | `background.ts:84` |
| Cloud/S3 upload | Not implemented — RadKit makes zero external network requests | `architecture/overview.md` (Privacy Model) |
| History/retention | No capture history; only the latest capture is stored | — |
| Per-tool editor settings | Stored in-memory via `toolSettingsRef`; lost on page close | `Editor.tsx` |

### Storage Usage

- **`browser.storage.local`** — used only for `capturedImage` (transient, one-at-a-time)
- **`browser.storage.sync`** — not used anywhere
- **Permissions** — `storage` and `unlimitedStorage` already declared in the manifest

## Gaps an Options Page Would Address

1. **S3 credentials** — endpoint, bucket, access key, secret key. Requires new permissions and breaks the current zero-network-request privacy model.
2. **Default export format** — currently PNG-only for capture, PNG/JPEG for download. WebP not offered.
3. **Default quality** — hardcoded at `0.9`; no user control.
4. **Keyboard shortcut customization** — Chrome exposes `chrome://extensions/shortcuts` but RadKit has no in-extension UI for this.
5. **History retention limits** — no history exists; implementing retention limits implies building a capture history system first.

## WXT Integration Notes

WXT supports an options page via an `entrypoints/options/` directory (similar to `entrypoints/popup/`). The manifest entry is auto-generated. See [WXT docs on options pages](https://wxt.dev/guide/entrypoints/options.html).

To register the page, add `options_page` or `options_ui` to the manifest in `wxt.config.ts`, or simply create `entrypoints/options/index.html` and WXT will detect it.
