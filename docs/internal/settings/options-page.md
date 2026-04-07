# Options / Settings Page

> **Status:** Implemented. The options page is at `entrypoints/options/` and currently provides S3-compatible credential configuration for screenshot sharing.

## Overview

The options page (`entrypoints/options/Options.tsx`) is a React form that lets users configure S3-compatible storage credentials for the Share feature. It is registered automatically by WXT via the `entrypoints/options/` directory convention.

Opening the page: right-click the RadKit extension icon → **Options**, or navigate to the extension's options URL directly.

## S3 Configuration Fields

| Field | Required | Default | Storage key |
|-------|----------|---------|-------------|
| Endpoint URL | Yes | — | `s3Config.endpoint` |
| Bucket Name | Yes | — | `s3Config.bucket` |
| Region | No | `us-east-1` | `s3Config.region` |
| Access Key ID | Yes | — | `s3Config.accessKeyId` |
| Secret Access Key | Yes | — | `s3Config.secretAccessKey` |
| Path Prefix | No | `""` (root) | `s3Config.pathPrefix` |
| ACL | No | `public-read` | `s3Config.acl` |

ACL options: `public-read`, `private`, `authenticated-read`, or empty (bucket default).

## Save & Validate Flow

When the user clicks **Save & Validate**, `Options.tsx` performs these steps in order:

1. **Client-side validation** — checks that all required fields are filled and the endpoint is a valid URL.
2. **Request host permission** — calls `browser.permissions.request()` for the endpoint's origin. This is required because RadKit declares `optional_host_permissions: ['*://*/*']` rather than requesting broad network access at install time. If the user denies the permission, save is aborted.
3. **Connection validation** — calls `validateS3Connection()` (`lib/s3-client.ts`) which performs a `HEAD` request against the bucket URL using SigV4 signing.
4. **Save** — persists the config to `browser.storage.sync` via `saveS3Config()` (`lib/s3-storage.ts`). If the HEAD request fails (some providers don't support `HeadBucket`), credentials are still saved with a warning — uploads may still work.

## Credential Storage

Credentials are stored in `browser.storage.sync` under the key `s3Config` as a single `S3Config` object. Sync storage roams credentials across the user's signed-in browser instances.

- **`getS3Config()`** — returns `S3Config | null`; returns `null` if any required field is missing.
- **`saveS3Config(config)`** — writes the full config object.
- **`clearS3Config()`** — removes the key entirely.
- **`isConfigured(config)`** — type guard that checks all four required fields are non-empty.

These functions are exported from `lib/s3-storage.ts`.

## Clear Credentials

The **Clear Credentials** button calls `clearS3Config()` and resets the form to defaults. This effectively disables the Share feature in the editor since `isConfigured()` will return `false`.

## Security Notes

- The secret access key is masked in the UI after initial load (`secretMasked` state). Focusing the field clears the mask and the stored value, requiring re-entry.
- Credentials are stored in `browser.storage.sync`, which is encrypted at rest by the browser. They are never sent to any RadKit or third-party service — only to the user-configured S3 endpoint.
- Host permissions are scoped to the configured endpoint's origin, not granted globally.

## Remaining Gaps

These features are not yet implemented and may be addressed in future options page updates:

1. **Default export format** — capture is PNG-only; download supports PNG/JPEG. No user control.
2. **Default quality** — hardcoded at `0.9` in `handleDownload`.
3. **Keyboard shortcut customization** — Chrome exposes `chrome://extensions/shortcuts` but there is no in-extension UI.
4. **History retention limits** — no capture history system exists yet.
