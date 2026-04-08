(function () {
  var video = document.getElementById('video');
  var loading = document.getElementById('loading');
  var actionsWrap = document.getElementById('actionsWrap');
  var saveBtn = document.getElementById('saveBtn');
  var discardBtn = document.getElementById('discardBtn');
  var statusEl = document.getElementById('status');

  var currentId = null;

  function findRecording(recordings, id) {
    for (var i = 0; i < recordings.length; i++) {
      if (recordings[i].id === id) return recordings[i];
    }
    return null;
  }

  chrome.storage.local.get(['previewRecordingId', 'recordings'], function (data) {
    var id = data.previewRecordingId;
    var recordings = data.recordings || [];

    if (!id) {
      loading.textContent = 'No recording found.';
      return;
    }

    var rec = findRecording(recordings, id);
    if (!rec) {
      loading.textContent = 'Recording not found.';
      return;
    }

    currentId = id;
    video.src = rec.dataUrl;
    video.style.display = '';
    actionsWrap.style.display = '';
    loading.style.display = 'none';

    // Clean up the preview pointer
    chrome.storage.local.remove('previewRecordingId');
  });

  saveBtn.addEventListener('click', function () {
    saveBtn.disabled = true;
    statusEl.textContent = '';

    chrome.storage.local.get({ recordings: [] }, function (data) {
      var rec = findRecording(data.recordings || [], currentId);
      if (!rec) {
        statusEl.textContent = 'Recording data is no longer available.';
        saveBtn.disabled = false;
        return;
      }

      var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var filename = 'radkit-recording-' + timestamp + '.webm';

      if (chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url: rec.dataUrl, filename: filename, saveAs: true }, function () {
          if (chrome.runtime.lastError) {
            statusEl.textContent = 'Download failed: ' + chrome.runtime.lastError.message;
            saveBtn.disabled = false;
          } else {
            statusEl.textContent = 'Saved! Recording also kept in storage.';
            chrome.runtime.sendMessage({ type: 'recording-result', success: true });
          }
        });
      } else {
        var a = document.createElement('a');
        a.href = rec.dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        statusEl.textContent = 'Saved! Recording also kept in storage.';
        chrome.runtime.sendMessage({ type: 'recording-result', success: true });
      }
    });
  });

  discardBtn.addEventListener('click', function () {
    chrome.storage.local.get({ recordings: [] }, function (data) {
      var recordings = (data.recordings || []).filter(function (r) {
        return r.id !== currentId;
      });
      chrome.storage.local.set({ recordings: recordings }, function () {
        video.src = '';
        video.style.display = 'none';
        actionsWrap.style.display = 'none';
        statusEl.textContent = 'Recording discarded.';
        chrome.runtime.sendMessage({ type: 'recording-result', success: false, error: 'Recording discarded' });
      });
    });
  });
})();
