# Privacy

RadKit is designed with a privacy-first approach. Your screenshots and data stay entirely on your device.

## Zero External Requests

RadKit makes no network requests of any kind. There are no analytics, telemetry, tracking or data collection services. Nothing is sent to external servers.

## Local Processing Only

All capture, editing, recording and export happens within your browser:

- **Screenshots**: Captured using built-in browser APIs, stored in local extension storage, and edited entirely on your device
- **Screen recordings**: Assembled into WebM video files locally — audio (microphone/system) and webcam overlays are processed on-device and never transmitted
- **Editing**: All annotation and cropping is performed locally in the editor
- **Fonts**: All fonts are bundled with the extension — no external font services are used

## Data Handling

- Screenshots and recordings are stored in your browser's local extension storage
- Exported files are saved directly to your device via the downloads API or copied to your local clipboard
- Capture history persists in local storage until you explicitly delete it

## Permissions

RadKit requests the following browser permissions, each with a specific purpose:

| Permission | Why It Is Needed |
|------------|-----------------|
| **activeTab** | Access the current tab to capture its contents |
| **storage** | Store captured screenshots and recordings locally in the browser |
| **unlimitedStorage** | Allow larger recordings and capture history without hitting browser quota limits |
| **scripting** | Inject the area-selection overlay and full-page capture scripts into the active tab |
| **downloads** | Save exported images and recordings to your device |

## See Also

- [Getting Started](getting-started.md) — installation and first capture
- [Capture Modes](capture-modes.md) — how to take screenshots
