(function () {
  var subtitle = document.getElementById('subtitle');
  var content = document.getElementById('content');

  function formatDuration(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    }) + ' at ' + d.toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
  }

  function downloadRecording(rec) {
    var timestamp = new Date(rec.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filename = 'radkit-recording-' + timestamp + '.webm';

    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: rec.dataUrl, filename: filename, saveAs: true });
    } else {
      var a = document.createElement('a');
      a.href = rec.dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function deleteRecording(id, callback) {
    chrome.storage.local.get({ recordings: [] }, function (data) {
      var recordings = (data.recordings || []).filter(function (r) {
        return r.id !== id;
      });
      chrome.storage.local.set({ recordings: recordings }, callback);
    });
  }

  function clearAll(callback) {
    chrome.storage.local.set({ recordings: [] }, callback);
  }

  function render(recordings) {
    var total = recordings.length;
    var totalSize = recordings.reduce(function (sum, r) { return sum + (r.size || 0); }, 0);

    subtitle.textContent = total === 0
      ? 'No recordings stored.'
      : total + ' recording' + (total === 1 ? '' : 's') + ' \u2014 ' + formatSize(totalSize) + ' total';

    if (total === 0) {
      content.innerHTML = '<div class="empty">No recordings yet. Start a screen recording from the RadKit popup.</div>';
      return;
    }

    var html = '<div class="rec-list">';
    recordings.forEach(function (rec) {
      html += '<div class="rec-card" data-id="' + rec.id + '">'
        + '<video class="rec-thumb" src="' + rec.dataUrl + '" muted preload="metadata"></video>'
        + '<div class="rec-info">'
        + '<div class="rec-date">' + formatDate(rec.timestamp) + '</div>'
        + '<div class="rec-meta">'
        + '<span>' + formatDuration(rec.duration) + '</span>'
        + '<span>' + formatSize(rec.size) + '</span>'
        + '</div></div>'
        + '<div class="rec-actions">'
        + '<button class="act-btn download" data-id="' + rec.id + '">Download</button>'
        + '<button class="act-btn delete" data-id="' + rec.id + '">Delete</button>'
        + '</div></div>';
    });
    html += '</div>';

    html += '<div class="clear-all"><button id="clearAllBtn">Delete All Recordings</button></div>';
    html += '<div class="storage-info">Recordings are stored in your browser\'s local extension storage.</div>';

    content.innerHTML = html;

    // Seek thumbnails to 1s so they show a frame instead of black
    content.querySelectorAll('.rec-thumb').forEach(function (v) {
      v.addEventListener('loadedmetadata', function () { v.currentTime = 1; });
    });

    // Wire up buttons
    content.querySelectorAll('.act-btn.download').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var rec = recordings.find(function (r) { return r.id === id; });
        if (rec) downloadRecording(rec);
      });
    });

    content.querySelectorAll('.act-btn.delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        deleteRecording(id, function () { loadAndRender(); });
      });
    });

    var clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearAll(function () { loadAndRender(); });
      });
    }
  }

  function loadAndRender() {
    chrome.storage.local.get({ recordings: [] }, function (data) {
      render(data.recordings || []);
    });
  }

  loadAndRender();
})();
