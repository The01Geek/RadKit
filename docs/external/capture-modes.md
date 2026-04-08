# Capture Modes

RadKit offers five screenshot capture modes and a full screen recording mode. Open the RadKit popup by clicking the toolbar icon to access all modes. The popup is organized into two tabs: **Capture** for screenshots and **Record** for video recording.

## Visible Viewport

Captures exactly what is currently displayed in your browser tab.

1. Click **Visible Viewport** in the popup
2. The screenshot is taken instantly
3. The editor opens with your capture

**Shortcut:** Press **Alt+S** to capture the visible viewport without opening the popup.

**Note:** Browser internal pages (such as `chrome://settings`) cannot be captured due to browser security restrictions.

## Select Area

Draw a custom rectangle to capture only a specific portion of the page.

1. Click **Select Area** in the popup
2. A dark overlay appears on the page
3. Click and drag to draw your selection rectangle
4. Adjust the selection by dragging the edges or corner handles
5. Click **Edit** to confirm, or **Cancel** to discard

You can also:
- **Move** the selection by dragging inside the rectangle
- **Resize** from any edge or corner using the handles
- Press **Enter** to confirm or **Escape** to cancel

## Full Page

Captures the entire scrollable page from top to bottom, not just the visible portion.

1. Click **Full Page** in the popup
2. RadKit automatically scrolls through the page and captures each section
3. The sections are stitched into a single image
4. The editor opens with the complete page capture

**Note:** Very long pages may be capped at a maximum height. Lazy-loaded content or dynamic elements that change between scrolls may produce visual inconsistencies.

## Visible After Delay

A timed variant of the Visible Viewport mode. Waits three seconds before capturing, giving you time to open menus, tooltips, hover states or other transient elements that would close when you interact with the extension.

1. Click **Visible After Delay** in the popup
2. The popup closes and a three-second countdown begins
3. Position your screen — open the menu or tooltip you want to capture
4. After three seconds the screenshot is taken automatically
5. The editor opens with your capture

**Tip:** This mode is ideal for capturing dropdown menus, context menus and hover effects.

## Screen or Window

Captures content outside the browser — your entire screen, a specific application window or a different browser tab.

1. Click **Screen / Window** in the popup
2. The browser displays a native source picker
3. Choose a screen, window or tab to capture
4. The selected source is captured and the editor opens

**Shortcut:** Press **Alt+D** to launch the screen or window picker without opening the popup.

## Screen Recording

Records your screen, a window or a browser tab as a WebM video file. All encoding happens locally — nothing is sent over the network.

1. Click the **Record** tab in the popup
2. Configure your recording settings:
   - **Frame Rate**: 15, 24, 30 or 60 fps (default: 30 fps)
   - **Audio**: Microphone, System audio, Both or None (default: Microphone)
   - **Resolution**: Source (native), 720p, 1080p or 4K (default: Source)
   - **Webcam Overlay**: Toggle on to display your webcam in a small circular window during recording
3. Click **Start Recording**
4. The browser displays a native source picker — choose a screen, window or tab
5. A compact floating control bar appears with a timer and three buttons:
   - **Pause** — pause and resume recording at any time
   - **Stop** — finish recording and open the preview
   - **Discard** — throw away the recording
6. When you stop, a preview page opens in a new browser tab where you can play back your recording
7. Click **Save Recording** to download the `.webm` file, or **Discard** to delete it

There is no duration limit — record for as long as you need.

**Tip:** If you enable the webcam overlay, a small circular camera window appears at the bottom right of your screen. You can drag it to any position across your screens. It is automatically captured as part of the screen recording.

### Audio Recording

To record system audio (for example, audio playing in a browser tab), select "System audio" or "Both" as the audio setting. When the browser's source picker appears, make sure to check the **Share audio** checkbox. If you do not check it, the recording will be video only.

### Saved Recordings

All recordings are automatically saved in your browser's local extension storage. Click **View saved recordings** in the Record tab to open a management page where you can:

- Browse all past recordings with thumbnails, dates and file sizes
- Download any recording
- Delete individual recordings or clear all at once

### Saved Screenshots

Screenshots are also saved to extension storage. Click **View saved screenshots** in the Capture tab to browse, download or delete past captures.

## See Also

- [Getting Started](getting-started.md) — installation and first capture
- [Editor Tools](editor-tools.md) — annotate your captures
- [Keyboard Shortcuts](keyboard-shortcuts.md) — quick reference
