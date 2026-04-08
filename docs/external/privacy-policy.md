# RadKit Privacy Policy

**Effective date:** April 7, 2026

RadKit is a free, open-source browser extension for capturing screenshots and recording your screen. It is designed from the ground up to keep your data on your device.

## Data Collection

RadKit does **not** collect, transmit, or store any personal data, browsing history, analytics, telemetry, or usage statistics. The extension makes zero network requests. There are no servers, no accounts, and no third-party services.

## How Your Data Is Handled

All processing happens locally inside your browser:

- **Screenshots** are captured using built-in browser APIs and stored in your browser's local extension storage until you export or delete them.
- **Screen recordings** are captured and assembled into WebM video files entirely within your browser. Recordings are stored in local extension storage until you download or delete them.
- **Webcam overlays** (optional during recording) are rendered locally and never transmitted.
- **Audio capture** (microphone or system audio, if you enable it) is processed locally as part of the recording and is never sent anywhere.
- **Exported files** are saved directly to your device via the browser's download API or copied to your local clipboard. No file ever leaves your machine unless you choose to share it yourself.

## Permissions

RadKit requests the minimum permissions needed to function:

| Permission | Purpose |
|------------|---------|
| **activeTab** | Access the current tab's content to capture a screenshot |
| **storage** | Store captured screenshots and recordings locally in the browser |
| **unlimitedStorage** | Allow larger recordings and capture history without hitting browser quota limits |
| **scripting** | Inject the area-selection overlay and full-page capture scripts into the active tab |
| **downloads** | Save exported images and recordings to your device |

## Third-Party Services

None. RadKit does not integrate with, send data to, or load resources from any external service. All fonts and assets are bundled with the extension.

## Open Source

RadKit is open source under the MIT License. You can inspect the full source code at any time to verify these claims:
https://github.com/The01Geek/Rad-Extension

## Changes to This Policy

If this policy changes, the updated version will be published in the extension's repository and the effective date above will be updated.

## Contact

If you have questions about this policy, please open an issue on the GitHub repository:
https://github.com/The01Geek/Rad-Extension/issues
