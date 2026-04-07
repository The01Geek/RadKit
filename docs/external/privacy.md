# Privacy

RadKit is designed with a privacy-first approach. Your screenshots and data stay entirely on your device.

## No External Requests by Default

RadKit makes no network requests by default. There are no analytics, telemetry, tracking or data collection services. Nothing is sent to external servers unless you explicitly configure sharing.

## Local Processing Only

All screenshot capture, editing and export happens within your browser:

- **Capture**: Screenshots are taken using built-in browser capabilities
- **Storage**: Captured images are stored temporarily in local browser storage
- **Editing**: All annotation and cropping is performed locally in the editor
- **Fonts**: All fonts are bundled with the extension — no external font services are used

## Optional S3 Sharing

RadKit offers an opt-in sharing feature that lets you upload screenshots to your own S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.). This feature:

- Is **disabled by default** — RadKit functions fully offline with no network activity
- Requires you to provide your own S3-compatible credentials in the extension settings
- Uploads screenshots **directly to your storage** — no data passes through any RadKit-operated service
- Requests network permissions only when you configure an endpoint, not at install time

Your S3 credentials are stored in your browser's synced extension storage and are never sent anywhere other than your configured endpoint.

## Data Handling

- Screenshots are stored in your browser's local extension storage while you are editing them
- Exported files are saved directly to your device or copied to your local clipboard
- No data persists beyond your active editing session unless you explicitly save, download, or share the file

## Permissions

RadKit requests the following browser permissions, each with a specific purpose:

| Permission | Why It Is Needed |
|------------|-----------------|
| **Active tab** | Access the current tab to capture its contents |
| **Storage** | Temporarily store captured images and S3 settings |
| **Scripting** | Enable the area selection overlay and full-page capture |

When you configure S3 sharing, RadKit will additionally request permission to access your S3 endpoint. This permission is requested dynamically and is not granted at install time.

## See Also

- [Getting Started](getting-started.md) — installation and first capture
- [Capture Modes](capture-modes.md) — how to take screenshots
