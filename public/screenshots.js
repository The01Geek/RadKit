(function () {
  var subtitle = document.getElementById('subtitle');
  var content = document.getElementById('content');

  var modeLabels = {
    visible: 'Visible Viewport',
    selection: 'Select Area',
    fullpage: 'Full Page',
    'visible-delayed': 'Delayed Capture',
    desktop: 'Screen / Window'
  };

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

  function downloadScreenshot(ss) {
    var timestamp = new Date(ss.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filename = 'radkit-screenshot-' + timestamp + '.png';

    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: ss.dataUrl, filename: filename, saveAs: true });
    } else {
      var a = document.createElement('a');
      a.href = ss.dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function deleteScreenshot(id, callback) {
    chrome.storage.local.get({ screenshots: [] }, function (data) {
      var screenshots = (data.screenshots || []).filter(function (s) {
        return s.id !== id;
      });
      chrome.storage.local.set({ screenshots: screenshots }, callback);
    });
  }

  function clearAll(callback) {
    chrome.storage.local.set({ screenshots: [] }, callback);
  }

  function render(screenshots) {
    var total = screenshots.length;
    var totalSize = screenshots.reduce(function (sum, s) { return sum + (s.size || 0); }, 0);

    subtitle.textContent = total === 0
      ? 'No screenshots stored.'
      : total + ' screenshot' + (total === 1 ? '' : 's') + ' \u2014 ' + formatSize(totalSize) + ' total';

    if (total === 0) {
      content.innerHTML = '<div class="empty">No screenshots yet. Capture one from the RadKit popup.</div>';
      return;
    }

    var html = '<div class="ss-list">';
    screenshots.forEach(function (ss) {
      var label = modeLabels[ss.mode] || ss.mode || 'Screenshot';
      html += '<div class="ss-card" data-id="' + ss.id + '">'
        + '<img class="ss-thumb" src="' + ss.dataUrl + '" alt="Screenshot" />'
        + '<div class="ss-info">'
        + '<div class="ss-date">' + formatDate(ss.timestamp) + '</div>'
        + '<div class="ss-meta">'
        + '<span>' + label + '</span>'
        + '<span>' + formatSize(ss.size) + '</span>'
        + '</div></div>'
        + '<div class="ss-actions">'
        + '<button class="act-btn download" data-id="' + ss.id + '">Download</button>'
        + '<button class="act-btn delete" data-id="' + ss.id + '">Delete</button>'
        + '</div></div>';
    });
    html += '</div>';

    html += '<div class="clear-all"><button id="clearAllBtn">Delete All Screenshots</button></div>';
    html += '<div class="storage-info">Screenshots are stored in your browser\'s local extension storage.</div>';

    content.innerHTML = html;

    // Wire up buttons
    content.querySelectorAll('.act-btn.download').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var ss = screenshots.find(function (s) { return s.id === id; });
        if (ss) downloadScreenshot(ss);
      });
    });

    content.querySelectorAll('.act-btn.delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        deleteScreenshot(id, function () { loadAndRender(); });
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
    chrome.storage.local.get({ screenshots: [] }, function (data) {
      render(data.screenshots || []);
    });
  }

  loadAndRender();
})();
