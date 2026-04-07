# Screenshot History

RadKit stores every captured screenshot in an IndexedDB database, enabling users to browse, search, tag, and re-open past captures from the popup.

## Storage Layer (`entrypoints/lib/historyStore.ts`)

### Database Schema

- **Database name**: `radkit-history`
- **Object store**: `screenshots` (auto-incrementing `id` key)
- **Indexes**: `timestamp`, `tags` (multiEntry), `captureMode`

### `ScreenshotRecord` Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `fullImage` | `Blob` | Full-resolution captured image |
| `thumbnail` | `Blob` | JPEG thumbnail (max 200px, 0.7 quality) |
| `timestamp` | `string` | ISO 8601 capture time |
| `tags` | `string[]` | User-assigned tags |
| `captureMode` | `string` | Capture mode used (`visible`, `selection`, `fullpage`, `visible-delayed`, `desktop`) |
| `url` | `string` | URL of the captured page |
| `title` | `string` | Title of the captured page |

### Capacity

The store enforces a **100-record maximum** (`MAX_RECORDS`). When adding a new record would exceed this limit, the oldest records (by timestamp) are pruned in the same transaction to avoid race conditions.

### `HistoryStore` API

| Method | Description |
|--------|-------------|
| `add(record)` | Insert a new record, pruning oldest if at capacity. Returns the new ID. |
| `getById(id)` | Retrieve a single record by ID. |
| `getAll({ offset, limit })` | List records newest-first with pagination (default limit: 50). |
| `getAllMeta()` | List all records without image blobs (metadata only). |
| `getAllWithThumbnails()` | List all records with thumbnail blobs (no full images). |
| `searchWithThumbnails({ tag, dateFrom, dateTo })` | Filter records by tag substring and/or date range, returns with thumbnails. |
| `updateTags(id, tags)` | Replace the tag array for a record. |
| `delete(id)` | Remove a record. |
| `count()` | Return total record count. |
| `getFullImage(id)` | Retrieve only the full-resolution image blob for a record. |

## Thumbnail Generator (`entrypoints/lib/thumbnailGenerator.ts`)

Utility functions for image conversion used by the history feature:

| Function | Description |
|----------|-------------|
| `generateThumbnail(imageDataUrl)` | Scales a data URL image down to max 200px (preserving aspect ratio) and returns a JPEG blob at 0.7 quality. Uses `OffscreenCanvas` and `createImageBitmap`. |
| `dataUrlToBlob(dataUrl)` | Converts a data URL string to a `Blob` via `fetch`. |
| `blobToDataUrl(blob)` | Converts a `Blob` to a data URL string via `FileReader`. |

## History View (`entrypoints/popup/HistoryView.tsx`)

A React component rendered in the popup's "History" tab. Displays a grid of past captures with thumbnails.

### Features

- **Thumbnail grid**: 2-column grid showing capture thumbnails with hover overlay
- **Search**: Tag-based search with 300ms debounce
- **Tag editing**: Click tags area to enter inline edit mode; comma-separated input, saved on Enter or Save button
- **Relative timestamps**: Displays "just now", "5m ago", "2h ago", "3d ago", or a formatted date
- **Capture mode badge**: Shows which mode was used for each capture

### Card Actions

| Action | Icon | Behavior |
|--------|------|----------|
| Open in Editor | `IconExternalLink` | Opens `editor.html?screenshotId={id}` in a new tab, closes the popup |
| Copy to Clipboard | `IconCopy` | Loads the full image blob, converts to PNG if needed, copies via `navigator.clipboard.write` |
| Delete | `IconTrash` | Removes the record from IndexedDB and updates the UI |

### States

- **Loading**: Pulse dot animation with "Loading history..." text
- **Empty**: Camera icon with "No captures yet" message
- **No results**: "No matches found" when search yields nothing
- **Error**: Inline error message

## Integration Points

### Background Script

After every successful capture, `entrypoints/background.ts` saves the screenshot to IndexedDB history before opening the editor. The full image is converted to a blob, a JPEG thumbnail is generated, and both are stored with metadata (timestamp, tags, capture mode, page URL, page title). History save failures are caught and logged but do not block the capture flow.

### Editor

The editor (`entrypoints/editor/Editor.tsx`) checks for a `screenshotId` query parameter on load. If present, it loads the image from IndexedDB history via `HistoryStore.getById()` instead of `chrome.storage.local`. This enables re-opening past captures from the history view.

## Files

| File | Purpose |
|------|---------|
| `entrypoints/lib/historyStore.ts` | IndexedDB storage layer (~300 lines) |
| `entrypoints/lib/thumbnailGenerator.ts` | Thumbnail generation and blob/data URL conversion utilities |
| `entrypoints/popup/HistoryView.tsx` | History browsing UI component (~277 lines) |
