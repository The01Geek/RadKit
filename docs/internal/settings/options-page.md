# Options / Settings Page

The options page (`entrypoints/options/`) is a full React page where users configure RadKit preferences. It is accessible via the gear icon in the popup header or through the browser's built-in extension settings.

## Entry Point

WXT auto-detects `entrypoints/options/index.html` and registers it as the extension's options page. The React app mounts in `main.tsx` and renders the `Options` component.

| File | Purpose |
|------|---------|
| `entrypoints/options/index.html` | HTML shell |
| `entrypoints/options/main.tsx` | React entry point |
| `entrypoints/options/Options.tsx` | Main settings component |
| `entrypoints/options/options.css` | All options page styles |

## Settings Utility (`utils/settings.ts`)

All settings logic is centralized in `utils/settings.ts`, which exports:

- **`UserSettings`** — TypeScript interface defining the full settings shape
- **`DEFAULT_SETTINGS`** — Fallback values used when no stored settings exist
- **`loadSettings()`** — Reads from both `browser.storage.sync` and `browser.storage.local`, merges with defaults, and validates
- **`saveSettings(settings)`** — Splits settings across sync and local storage

### Storage Strategy

Settings are split across two storage areas:

| Storage area | Keys | Rationale |
|-------------|------|-----------|
| `browser.storage.sync` (roams across devices) | `exportFormat`, `exportQuality`, `s3Enabled`, `s3Endpoint`, `s3Bucket` | Non-sensitive preferences |
| `browser.storage.local` (device-only) | `s3AccessKey`, `s3SecretKey` | Credentials that must not leave the device |

Sync data is stored under the `userSettings` key; local credentials under `userCredentials`.

### Validation

`loadSettings()` validates incoming values before merging:
- `exportFormat` must be one of `png`, `jpeg`, `webp` — invalid values fall back to the default (`png`)
- `exportQuality` must be a finite number between `0.1` and `1.0` — invalid values fall back to the default (`0.9`)

### Defaults

```typescript
{
  exportFormat: 'png',
  exportQuality: 0.9,
  s3Enabled: false,
  s3Endpoint: '',
  s3Bucket: '',
  s3AccessKey: '',
  s3SecretKey: '',
}
```

## Options Page Sections

### Default Export Format

Radio button group offering **PNG**, **JPEG**, and **WebP**. The selected format is used by the editor's download function when no explicit format is passed.

### Default Export Quality

Range slider from `0.1` to `1.0` (step `0.1`). Affects JPEG and WebP exports. PNG is always lossless regardless of this setting.

### Keyboard Shortcuts

Read-only display of the two extension shortcuts (`Alt+S` for visible viewport, `Alt+D` for screen/window). These are configured via the browser's extension shortcut settings and cannot be changed from within RadKit.

### Cloud Upload (S3-Compatible)

Optional integration with S3-compatible storage. Disabled by default — no network requests are made unless the user explicitly enables this toggle.

When enabled, the following fields appear:
- **Endpoint URL** — e.g., `https://s3.amazonaws.com`
- **Bucket Name**
- **Access Key ID**
- **Secret Access Key** (password input)

A warning banner clarifies that credentials are stored locally only and are never sent to RadKit servers.

## Auto-Save Behavior

The options page uses debounced auto-save (400ms delay). After each setting change:
1. The local React state updates immediately
2. After 400ms of inactivity, `saveSettings()` persists to storage
3. A "Saved" indicator appears briefly on success; "Save failed" on error

## Error Handling

- **Load failure**: The page shows defaults with a "Could not load saved settings" banner
- **Save failure**: A red "Save failed" indicator appears for 3 seconds

## Design

The options page follows the same dark glassmorphism design as the popup:
- Background: `#0f0f14`
- Card sections with `rgba(255,255,255,0.06)` background
- Accent color: `#a173fe` (purple)
- Font: Inter (bundled)
- Max width: 600px, centered
