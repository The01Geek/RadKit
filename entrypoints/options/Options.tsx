import React, { useEffect, useState } from 'react';
import { type UserSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../utils/settings';

type ExportFormat = UserSettings['exportFormat'];

function Options() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  if (loading) {
    return (
      <div className="options-container">
        <p className="options-loading">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Rad<span className="brand-accent">Kit</span> Settings</h1>
        {saved && <span className="save-indicator">Saved</span>}
      </header>

      {/* Export Format */}
      <section className="options-section">
        <h2>Default Export Format</h2>
        <p className="section-desc">Choose the default image format when downloading from the editor.</p>
        <div className="format-options">
          {(['png', 'jpeg', 'webp'] as ExportFormat[]).map((fmt) => (
            <label key={fmt} className={`format-option${settings.exportFormat === fmt ? ' selected' : ''}`}>
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
      <section className="options-section">
        <h2>Default Export Quality</h2>
        <p className="section-desc">
          Adjust the quality for JPEG and WebP exports. PNG is always lossless.
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
      <section className="options-section">
        <h2>Keyboard Shortcuts</h2>
        <p className="section-desc">
          These shortcuts are configured in your browser's extension settings and cannot be changed here.
        </p>
        <div className="shortcuts-list">
          <div className="shortcut-row">
            <span className="shortcut-action">Capture visible viewport</span>
            <kbd>Alt+S</kbd>
          </div>
          <div className="shortcut-row">
            <span className="shortcut-action">Capture screen / window</span>
            <kbd>Alt+D</kbd>
          </div>
        </div>
      </section>

      {/* S3 Upload Configuration */}
      <section className="options-section">
        <h2>Cloud Upload (S3-Compatible)</h2>
        <p className="section-desc">
          Optionally upload screenshots to an S3-compatible storage service. Disabled by default &mdash;
          no network requests are made unless you enable this.
        </p>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.s3Enabled}
            onChange={(e) => update('s3Enabled', e.target.checked)}
          />
          <span>Enable S3 upload</span>
        </label>

        {settings.s3Enabled && (
          <div className="s3-fields">
            <p className="s3-warning">
              Credentials are stored locally in your browser's sync storage.
              They are never sent to RadKit servers.
            </p>
            <label className="field-group">
              <span>Endpoint URL</span>
              <input
                type="url"
                placeholder="https://s3.amazonaws.com"
                value={settings.s3Endpoint}
                onChange={(e) => update('s3Endpoint', e.target.value)}
              />
            </label>
            <label className="field-group">
              <span>Bucket Name</span>
              <input
                type="text"
                placeholder="my-screenshots"
                value={settings.s3Bucket}
                onChange={(e) => update('s3Bucket', e.target.value)}
              />
            </label>
            <label className="field-group">
              <span>Access Key ID</span>
              <input
                type="text"
                placeholder="AKIA..."
                value={settings.s3AccessKey}
                onChange={(e) => update('s3AccessKey', e.target.value)}
              />
            </label>
            <label className="field-group">
              <span>Secret Access Key</span>
              <input
                type="password"
                placeholder="Enter secret key"
                value={settings.s3SecretKey}
                onChange={(e) => update('s3SecretKey', e.target.value)}
              />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

export default Options;
