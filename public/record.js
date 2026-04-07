(function () {
  const recordBtn = document.getElementById('recordBtn');
  const timerEl = document.getElementById('timer');
  const statusEl = document.getElementById('status');
  const fpsSelect = document.getElementById('fps');
  const durationInput = document.getElementById('duration');

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let timerInterval = null;
  let durationTimeout = null;
  let startTime = 0;
  let isRecording = false;

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    return min + ':' + sec;
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (isError ? ' error' : '');
  }

  function setControlsEnabled(enabled) {
    fpsSelect.disabled = !enabled;
    durationInput.disabled = !enabled;
  }

  function updateTimer() {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }

  function chooseMimeType() {
    var types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
  }

  function cleanup() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (durationTimeout) { clearTimeout(durationTimeout); durationTimeout = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    isRecording = false;
    recordBtn.classList.remove('recording');
    timerEl.classList.remove('recording-active');
    setControlsEnabled(true);
  }

  function sendComplete(success, error) {
    chrome.runtime.sendMessage({
      type: 'recording-complete',
      success: success,
      error: error || undefined,
    }, function () {
      if (chrome.runtime.lastError) {
        console.error('Failed to notify background:', chrome.runtime.lastError.message);
        setStatus('Recording saved. You may close this window.', false);
      }
    });
  }

  async function startRecording() {
    var fps = parseInt(fpsSelect.value, 10) || 30;
    var maxDuration = Math.min(Math.max(parseInt(durationInput.value, 10) || 30, 5), 60);
    durationInput.value = maxDuration;

    setStatus('Requesting screen access...');
    setControlsEnabled(false);
    recordBtn.disabled = true;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: fps },
        audio: false,
      });
    } catch (err) {
      cleanup();
      recordBtn.disabled = false;
      if (err.name === 'NotAllowedError') {
        setStatus('Screen access denied — please try again', true);
      } else {
        setStatus('Error: ' + err.message, true);
      }
      sendComplete(false, 'Screen access denied');
      return;
    }

    // If user stops sharing via browser UI, stop the recording
    var videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      cleanup();
      recordBtn.disabled = false;
      setStatus('No video track available', true);
      sendComplete(false, 'No video track available');
      return;
    }
    videoTrack.addEventListener('ended', function () {
      if (isRecording) stopRecording();
    });

    var mimeType = chooseMimeType();
    if (!mimeType) {
      cleanup();
      recordBtn.disabled = false;
      setStatus('WebM recording is not supported in this browser', true);
      sendComplete(false, 'WebM recording not supported');
      return;
    }

    chunks = [];
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
    } catch (err) {
      cleanup();
      recordBtn.disabled = false;
      setStatus('Failed to create recorder: ' + err.message, true);
      sendComplete(false, 'Failed to create recorder: ' + err.message);
      return;
    }

    mediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = function () {
      handleRecordingComplete();
    };

    mediaRecorder.onerror = function (e) {
      var errorMsg = e.error ? e.error.message : 'unknown recording error';
      setStatus('Recording error: ' + errorMsg, true);
      cleanup();
      recordBtn.disabled = false;
      sendComplete(false, 'Recording error: ' + errorMsg);
    };

    mediaRecorder.start(1000); // collect data every second
    isRecording = true;
    startTime = Date.now();
    recordBtn.disabled = false;
    recordBtn.classList.add('recording');
    timerEl.classList.add('recording-active');
    setStatus('Recording... click stop when done');

    timerInterval = setInterval(updateTimer, 200);

    durationTimeout = setTimeout(function () {
      if (isRecording) stopRecording();
    }, maxDuration * 1000);
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    mediaRecorder.stop();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (durationTimeout) { clearTimeout(durationTimeout); durationTimeout = null; }
    recordBtn.disabled = true;
    setStatus('Processing recording...');
  }

  function handleRecordingComplete() {
    if (chunks.length === 0) {
      cleanup();
      recordBtn.disabled = false;
      setStatus('No data recorded', true);
      sendComplete(false, 'No data recorded');
      return;
    }

    var blob = new Blob(chunks, { type: chunks[0].type || 'video/webm' });
    chunks = [];

    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filename = 'radkit-recording-' + timestamp + '.webm';
    var blobUrl = URL.createObjectURL(blob);

    setStatus('Downloading...');

    chrome.downloads.download(
      { url: blobUrl, filename: filename, saveAs: false },
      function (downloadId) {
        var lastErr = chrome.runtime.lastError;
        // Revoke blob URL after a delay to ensure download starts
        setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 5000);

        cleanup();

        if (lastErr) {
          setStatus('Download failed: ' + lastErr.message, true);
          recordBtn.disabled = false;
          sendComplete(false, lastErr.message);
        } else {
          setStatus('Recording saved!');
          sendComplete(true);
        }
      }
    );
  }

  recordBtn.addEventListener('click', function () {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
})();
