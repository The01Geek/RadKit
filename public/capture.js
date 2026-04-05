(async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
    await video.play();

    // Wait for a frame to decode (setTimeout works even when page is backgrounded,
    // unlike requestVideoFrameCallback which stalls if the window loses focus)
    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    stream.getTracks().forEach((t) => t.stop());

    chrome.runtime.sendMessage({
      type: 'desktop-capture-result',
      success: true,
      dataUrl,
    });
  } catch (err) {
    chrome.runtime.sendMessage({
      type: 'desktop-capture-result',
      success: false,
      error: err.message,
    });
  }
})();
