/**
 * RadKit Screen Recording
 *
 * Flow:
 *   1. getDisplayMedia() picker opens — user selects a source.
 *   2. MediaRecorder is constructed from the stream.
 *   3. A short delay (PRE_RECORD_DELAY_MS) gives the user time to prepare.
 *   4. recorder.start() begins capturing.
 *   5. Control bar provides pause / resume / stop / discard.
 *   6. On stop the recorded webm blob is sent back to the extension.
 */

// Delay (ms) between the screen-picker closing and recording starting.
// Gives the user time to switch windows or arrange their workspace.
const PRE_RECORD_DELAY_MS = 500;

(async () => {
  // --- DOM refs ---
  const countdownOverlay = document.getElementById('countdown-overlay');
  const controlBar = document.getElementById('control-bar');
  const recDot = document.getElementById('rec-dot');
  const timerEl = document.getElementById('timer');
  const btnPause = document.getElementById('btn-pause');
  const btnStop = document.getElementById('btn-stop');
  const btnDiscard = document.getElementById('btn-discard');

  // --- Timer state ---
  let timerStart = 0;
  let timerPausedAt = 0;
  let timerOffset = 0; // accumulated pause time
  let timerRAF = 0;

  function updateTimer() {
    const elapsed = (timerPausedAt || Date.now()) - timerStart - timerOffset;
    const totalSec = Math.floor(elapsed / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    timerEl.textContent = min + ':' + String(sec).padStart(2, '0');
    timerRAF = requestAnimationFrame(updateTimer);
  }

  function startTimer() {
    timerStart = Date.now();
    timerOffset = 0;
    timerPausedAt = 0;
    updateTimer();
  }

  function stopTimer() {
    cancelAnimationFrame(timerRAF);
  }

  // --- Helper: send result back to extension ---
  function sendResult(payload) {
    chrome.runtime.sendMessage({ type: 'recording-result', ...payload });
  }

  try {
    // 1. Open the screen picker
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    // 2. Construct the MediaRecorder
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // Handle the stream ending externally (e.g. user clicks browser "Stop sharing")
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    });

    // 3. Pre-record delay — let the user prepare
    await new Promise((resolve) => setTimeout(resolve, PRE_RECORD_DELAY_MS));

    // 4. Start recording
    recorder.start(1000); // request data every 1 s

    // Switch UI: hide countdown, show control bar
    countdownOverlay.classList.add('hidden');
    controlBar.style.display = 'flex';
    startTimer();

    // --- Control-bar interactions ---

    btnPause.addEventListener('click', () => {
      if (recorder.state === 'recording') {
        recorder.pause();
        timerPausedAt = Date.now();
        btnPause.textContent = 'Resume';
        recDot.classList.add('paused');
      } else if (recorder.state === 'paused') {
        timerOffset += Date.now() - timerPausedAt;
        timerPausedAt = 0;
        recorder.resume();
        btnPause.textContent = 'Pause';
        recDot.classList.remove('paused');
      }
    });

    btnStop.addEventListener('click', () => {
      recorder.stop();
    });

    btnDiscard.addEventListener('click', () => {
      // Stop without saving
      recorder.ondataavailable = null;
      chunks.length = 0;
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      stopTimer();
      sendResult({ success: true, discarded: true });
    });

    // 5. When recording finishes, package the blob and send it back
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      stopTimer();

      if (chunks.length === 0) {
        // Discarded — result already sent from the discard handler
        return;
      }

      const blob = new Blob(chunks, { type: recorder.mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        sendResult({ success: true, dataUrl: reader.result, mimeType: recorder.mimeType });
      };
      reader.readAsDataURL(blob);
    };
  } catch (err) {
    sendResult({ success: false, error: err.message });
  }
})();
