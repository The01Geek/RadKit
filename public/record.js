(function () {
  var stream = null;
  var recorder = null;
  var chunks = [];
  var timerInterval = null;
  var elapsed = 0;
  var finished = false;
  var paused = false;
  var webcamActive = false;

  var splash = document.getElementById('splash');
  var bar = document.getElementById('bar');
  var recDot = document.getElementById('recDot');
  var timerEl = document.getElementById('timer');
  var pauseBtn = document.getElementById('pauseBtn');
  var stopBtn = document.getElementById('stopBtn');
  var discardBtn = document.getElementById('discardBtn');
  var statusEl = document.getElementById('status');

  var pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  var resumeIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateTimer() {
    if (!paused) {
      elapsed++;
      timerEl.textContent = formatTime(elapsed);
    }
  }

  function closeWebcam() {
    if (webcamActive) {
      chrome.runtime.sendMessage({ type: 'stop-webcam-overlay' }, function () {});
      webcamActive = false;
    }
  }

  function showBar() {
    splash.style.display = 'none';
    bar.classList.add('visible');
    // Resize window to a compact control bar
    chrome.windows.getCurrent(function (win) {
      if (win && win.id) {
        chrome.windows.update(win.id, { width: 340, height: 90 });
      }
    });
  }

  function finish(error) {
    if (finished) return;
    finished = true;

    clearInterval(timerInterval);
    timerInterval = null;
    closeWebcam();

    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }

    if (error) {
      bar.classList.remove('visible');
      statusEl.textContent = error;
      statusEl.classList.add('visible');
      chrome.runtime.sendMessage({ type: 'recording-result', success: false, error: error });
      return;
    }

    var blob = new Blob(chunks, { type: 'video/webm' });
    var recordingDuration = elapsed;
    var recordingSize = blob.size;
    chunks = [];

    bar.classList.remove('visible');
    statusEl.textContent = 'Preparing preview\u2026';
    statusEl.classList.add('visible');

    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var id = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var entry = {
        id: id,
        timestamp: new Date().toISOString(),
        duration: recordingDuration,
        size: recordingSize,
        dataUrl: dataUrl
      };

      chrome.storage.local.get({ recordings: [] }, function (data) {
        var recordings = data.recordings || [];
        recordings.unshift(entry);
        chrome.storage.local.set({
          recordings: recordings,
          previewRecordingId: id
        }, function () {
          chrome.runtime.sendMessage({ type: 'recording-preview-ready' });
        });
      });
    };
    reader.onerror = function () {
      statusEl.textContent = 'Failed to process recording.';
      chrome.runtime.sendMessage({ type: 'recording-result', success: false, error: 'Failed to process recording' });
    };
    reader.readAsDataURL(blob);
  }

  function discardRecording() {
    if (finished) return;
    finished = true;

    clearInterval(timerInterval);
    timerInterval = null;
    closeWebcam();

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }

    chunks = [];
    chrome.runtime.sendMessage({ type: 'recording-result', success: false, error: 'Recording discarded' });
  }

  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
      // If paused, resume briefly so onstop fires correctly
      if (recorder.state === 'paused') {
        recorder.resume();
      }
      recorder.stop();
    }
  }

  function togglePause() {
    if (!recorder || recorder.state === 'inactive') return;

    if (recorder.state === 'recording') {
      recorder.pause();
      paused = true;
      pauseBtn.innerHTML = resumeIcon;
      pauseBtn.title = 'Resume';
      recDot.classList.add('paused');
    } else if (recorder.state === 'paused') {
      recorder.resume();
      paused = false;
      pauseBtn.innerHTML = pauseIcon;
      pauseBtn.title = 'Pause';
      recDot.classList.remove('paused');
    }
  }

  function getResolutionConstraint(resolution) {
    switch (resolution) {
      case '720':  return { width: { ideal: 1280 }, height: { ideal: 720 } };
      case '1080': return { width: { ideal: 1920 }, height: { ideal: 1080 } };
      case '4k':   return { width: { ideal: 3840 }, height: { ideal: 2160 } };
      default:     return {};
    }
  }

  async function startRecording() {
    // Read settings stored by the popup
    var data = await new Promise(function (resolve) {
      chrome.storage.local.get('recordingSettings', function (d) { resolve(d); });
    });

    var settings = data.recordingSettings || {};
    var frameRate = settings.framerate || 30;
    var audioMode = settings.audioMode || 'mic';
    var resolution = settings.resolution || 'source';
    var wantSystemAudio = audioMode === 'system' || audioMode === 'both';
    var wantMic = audioMode === 'mic' || audioMode === 'both';

    var videoConstraints = Object.assign({ frameRate: frameRate }, getResolutionConstraint(resolution));

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: videoConstraints,
        audio: wantSystemAudio,
      });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        finish('Screen sharing was cancelled.');
      } else {
        finish('Could not access screen: ' + err.message);
      }
      return;
    }

    // Add microphone audio if requested
    if (wantMic) {
      try {
        var micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      } catch (err) {
        // Mic access denied — continue without it
      }
    }

    // If the user stops sharing via the browser's built-in "Stop sharing" button
    var videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', function () {
        stopRecording();
      });
    }

    // Determine supported mimeType — prefer opus for audio+video
    var hasAudio = stream.getAudioTracks().length > 0;
    var mimeType;
    if (hasAudio) {
      mimeType = 'video/webm;codecs=vp9,opus';
      if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }
    } else {
      mimeType = 'video/webm;codecs=vp9';
      if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }
    }

    chunks = [];

    try {
      recorder = new MediaRecorder(stream, { mimeType: mimeType });
    } catch (err) {
      finish('Could not start recording: ' + err.message);
      return;
    }

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = function () {
      if (!finished) {
        finish(null);
      }
    };

    recorder.onerror = function (e) {
      finish('Recording error: ' + (e.error ? e.error.message : 'Unknown'));
    };

    recorder.start(1000);

    // Open webcam overlay if enabled — inject into the recorded tab via content script
    if (settings.webcam) {
      chrome.runtime.sendMessage({ type: 'start-webcam-overlay' }, function () {});
      webcamActive = true;
    }

    // Switch to compact control bar
    showBar();

    elapsed = 0;
    timerEl.textContent = formatTime(0);
    timerInterval = setInterval(updateTimer, 1000);
  }

  pauseBtn.addEventListener('click', function () {
    togglePause();
  });

  stopBtn.addEventListener('click', function () {
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    discardBtn.disabled = true;
    stopRecording();
  });

  discardBtn.addEventListener('click', function () {
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    discardBtn.disabled = true;
    discardRecording();
  });

  // Auto-start recording when the window opens
  startRecording();
})();
