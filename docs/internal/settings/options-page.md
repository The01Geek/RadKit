# Options / Settings Page

> **Status:** Implemented. The options page is available at `entrypoints/options/` and is auto-detected by WXT.

## Settings Module (`entrypoints/lib/settings.ts`)

All settings are managed through a shared module that both the options page and other components import.

### Types

```typescript
type ExportFormat = 'png' | 'jpeg' | 'webp';

interface S3Config {
  enabled: boolean;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface RadKitSettings {
  exportFormat: ExportFormat;
  exportQuality: number;
  s3: S3Config;
}
```

### Defaults

| Setting | Default |
|---------|---------|
| `exportFormat` | `'png'` |
| `exportQuality` | `0.9` |
| `s3.enabled` | `false` |
| `s3.endpoint` | `''` |
| `s3.bucket` | `''` |
| `s3.accessKeyId` | `''` |
| `s3.secretAccessKey` | `''` |

### Storage

Settings are persisted to **`browser.storage.sync`** under the key `radkit_settings`. Using `sync` (rather than `local`) means settings follow the user across devices when they are signed in to their browser.

`loadSettings()` merges stored values over `DEFAULT_SETTINGS`, so newly added settings automatically get their default value without a migration step.

### API

| Function | Description |
|----------|-------------|
| `loadSettings(): Promise<RadKitSettings>` | Load settings from sync storage, falling back to defaults |
| `saveSettings(settings: RadKitSettings): Promise<void>` | Persist full settings object to sync storage |

## Options Page UI (`entrypoints/options/Options.tsx`)

The options page is a React component rendered into `entrypoints/options/index.html`. WXT auto-detects the `entrypoints/options/` directory and registers it in the manifest.

### Sections

#### Export Format
Radio button group for `png`, `jpeg`, and `webp`. The selected format becomes the default for both capture (`background.ts`) and download (`Editor.tsx`).

**Note:** The `captureVisibleTab` API does not support `webp` directly. When the user selects `webp`, the background script captures as `png` and the editor handles the format conversion at download time.

#### Export Quality
Range slider from `0.1` to `1.0` (step `0.1`). Applies to JPEG and WebP exports. The value is passed as the `quality` parameter to both `captureVisibleTab` (in `background.ts`) and `stage.toDataURL` (in `Editor.tsx`).

#### Keyboard Shortcuts
Read-only display of current bindings (`Alt+S` for visible viewport, `Alt+D` for screen/window). Users are directed to the browser's extension shortcuts page to change these.

#### Cloud Upload (S3-Compatible)
Disabled by default with a toggle to enable. When enabled, exposes fields for endpoint URL, bucket name, access key ID, and secret access key. Credentials are stored in `browser.storage.sync` and never sent to RadKit servers.

**Privacy note:** S3 upload is opt-in. When disabled (the default), RadKit continues to make zero external network requests.

### Save Behavior
A single "Save Settings" button at the bottom calls `saveSettings()`. A brief "Saved!" confirmation appears for 2 seconds after saving.

## Integration with Other Components

### Background Script (`background.ts`)
On capture, `loadSettings()` is called to read the current export format and quality. The format is used for `captureVisibleTab({ format, quality })`, with `webp` mapped to `png` since the capture API does not support it.

### Editor (`Editor.tsx`)
On load, `loadSettings()` is called to initialize `exportFormat` and `exportQuality` state. The `handleDownload` function uses these as defaults, but still accepts an optional format override parameter.
