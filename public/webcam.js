(async function() {
  try {
    var stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 320 }, facingMode: 'user' },
      audio: false
    });
    document.getElementById('cam').srcObject = stream;

    // Clean up when window closes
    window.addEventListener('beforeunload', function() {
      stream.getTracks().forEach(function(t) { t.stop(); });
    });
  } catch (err) {
    document.body.style.background = '#222';
    document.body.innerHTML = '<div style="color:#888;font-size:12px;text-align:center;padding:20px;">Camera unavailable</div>';
  }
})();
