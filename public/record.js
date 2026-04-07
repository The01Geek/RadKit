(function () {
  var stream = null;
  var recorder = null;
  var chunks = [];
  var timerInterval = null;
  var durationTimeout = null;
  var elapsed = 0;

  var startBtn = document.getElementById('startBtn');
  var stopBtn = document.getElementById('stopBtn');
  var timerEl = document.getElementById('timer');
  var statusEl = document.getElementById('status');
  var optionsEl = document.getElementById('options');
  var durationSelect = document.getElementById('duration');
  var framerateSelect = document.getElementById('framerate');

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateTimer() {
    elapsed++;
    timerEl.textContent = formatTime(elapsed);
  }

  function finish(error) {
    clearInterval(timerInterval);
    clearTimeout(durationTimeout);
    timerInterval = null;
    durationTimeout = null;

    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }

    if (error) {
      statusEl.textContent = error;
      chrome.runtime.sendMessage({ type: 'recording-result', success: false, error: error });
      return;
    }

    statusEl.textContent = 'Preparing download…';

    var blob = new Blob(chunks, { type: 'video/webm' });
    var url = URL.createObjectURL(blob);
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filename = 'radkit-recording-' + timestamp + '.webm';

    // Use chrome.downloads if available, otherwise fallback to anchor click
    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: url, filename: filename, saveAs: true }, function () {
        statusEl.textContent = 'Download started!';
        chrome.runtime.sendMessage({ type: 'recording-result', success: true });
      });
    } else {
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      statusEl.textContent = 'Download started!';
      chrome.runtime.sendMessage({ type: 'recording-result', success: true });
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }

  startBtn.addEventListener('click', async function () {
    var maxDuration = parseInt(durationSelect.value, 10);
    var frameRate = parseInt(framerateSelect.value, 10);

    startBtn.disabled = true;
    statusEl.textContent = 'Requesting screen access…';

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: frameRate },
        audio: false,
      });
    } catch (err) {
      startBtn.disabled = false;
      if (err.name === 'NotAllowedError') {
        finish('Screen sharing was cancelled.');
      } else {
        finish('Could not access screen: ' + err.message);
      }
      return;
    }

    // If the user stops sharing via the browser's built-in "Stop sharing" button
    stream.getVideoTracks()[0].addEventListener('ended', function () {
      stopRecording();
    });

    // Determine supported mimeType
    var mimeType = 'video/webm;codecs=vp9';
    if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: mimeType });

    recorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = function () {
      finish(null);
    };

    recorder.onerror = function (e) {
      finish('Recording error: ' + (e.error ? e.error.message : 'Unknown'));
    };

    recorder.start(1000); // collect data every second

    // Update UI
    startBtn.style.display = 'none';
    stopBtn.style.display = '';
    optionsEl.style.display = 'none';
    timerEl.classList.add('recording-active');
    statusEl.innerHTML = '<span class="pulse"></span>Recording…';

    elapsed = 0;
    timerEl.textContent = formatTime(0);
    timerInterval = setInterval(updateTimer, 1000);

    durationTimeout = setTimeout(function () {
      stopRecording();
    }, maxDuration * 1000);
  });

  stopBtn.addEventListener('click', function () {
    stopBtn.disabled = true;
    stopRecording();
  });
})();
