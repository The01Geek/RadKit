import React, { useEffect, useState } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type RadKitSettings, type ExportFormat } from '../lib/settings';

function Options() {
  const [settings, setSettings] = useState<RadKitSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof RadKitSettings>(key: K, value: RadKitSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updateS3 = <K extends keyof RadKitSettings['s3']>(key: K, value: RadKitSettings['s3'][K]) => {
    setSettings((prev) => ({ ...prev, s3: { ...prev.s3, [key]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="options-container"><p className="loading-text">Loading settings...</p></div>;
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Rad<span className="brand-accent">Kit</span> Settings</h1>
      </header>

      <div className="options-content">
        {/* Export Format */}
        <section className="settings-section">
          <h2>Export Format</h2>
          <p className="section-desc">Choose the default file format for downloaded screenshots.</p>
          <div className="format-options">
            {(['png', 'jpeg', 'webp'] as ExportFormat[]).map((fmt) => (
              <label key={fmt} className={`format-option ${settings.exportFormat === fmt ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="exportFormat"
                  value={fmt}
                  checked={settings.exportFormat === fmt}
                  onChange={() => update('exportFormat', fmt)}
                />
                <span className="format-label">{fmt.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Export Quality */}
        <section className="settings-section">
          <h2>Export Quality</h2>
          <p className="section-desc">
            Adjust the quality parameter for exported images (applies to JPEG and WebP).
          </p>
          <div className="quality-control">
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={settings.exportQuality}
              onChange={(e) => update('exportQuality', parseFloat(e.target.value))}
            />
            <span className="quality-value">{settings.exportQuality.toFixed(1)}</span>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="settings-section">
          <h2>Keyboard Shortcuts</h2>
          <p className="section-desc">Current shortcut bindings (read-only). To change shortcuts, visit your browser's extension shortcuts page.</p>
          <div className="shortcuts-list">
            <div className="shortcut-row">
              <span className="shortcut-action">Capture Visible Viewport</span>
              <kbd>Alt+S</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-action">Capture Screen / Window</span>
              <kbd>Alt+D</kbd>
            </div>
          </div>
        </section>

        {/* S3 Upload */}
        <section className="settings-section">
          <h2>Cloud Upload (S3-Compatible)</h2>
          <p className="section-desc">
            Optionally upload screenshots to an S3-compatible storage service. Disabled by default — no network requests are made unless you enable and configure this section.
          </p>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.s3.enabled}
              onChange={(e) => updateS3('enabled', e.target.checked)}
            />
            <span>Enable S3 upload</span>
          </label>

          {settings.s3.enabled && (
            <div className="s3-fields">
              <div className="field-group">
                <label>Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://s3.amazonaws.com"
                  value={settings.s3.endpoint}
                  onChange={(e) => updateS3('endpoint', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>Bucket Name</label>
                <input
                  type="text"
                  placeholder="my-screenshots"
                  value={settings.s3.bucket}
                  onChange={(e) => updateS3('bucket', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>Access Key ID</label>
                <input
                  type="text"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={settings.s3.accessKeyId}
                  onChange={(e) => updateS3('accessKeyId', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>Secret Access Key</label>
                <input
                  type="password"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={settings.s3.secretAccessKey}
                  onChange={(e) => updateS3('secretAccessKey', e.target.value)}
                />
              </div>
              <p className="s3-note">
                Credentials are stored locally in your browser's sync storage and are never sent to RadKit servers.
              </p>
            </div>
          )}
        </section>

        {/* Save Button */}
        <div className="save-bar">
          <button className="btn-save" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Options;
