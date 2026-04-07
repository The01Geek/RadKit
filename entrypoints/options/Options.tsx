import React, { useEffect, useState } from 'react';
import { loadS3Config, saveS3Config, clearS3Config, isConfigured, maskSecretKey, requestEndpointPermission, type StoredS3Config } from '../../lib/storage';
import { validateS3Connection, type S3Config } from '../../lib/s3';

type Status = { type: 'idle' } | { type: 'saving' } | { type: 'validating' } | { type: 'success'; message: string } | { type: 'error'; message: string };

export default function Options() {
  const [config, setConfig] = useState<StoredS3Config>({
    endpoint: '',
    bucket: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    pathPrefix: '',
    acl: 'public-read',
  });
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [loaded, setLoaded] = useState(false);
  const [secretMasked, setSecretMasked] = useState(false);
  const [savedSecretKey, setSavedSecretKey] = useState('');

  useEffect(() => {
    loadS3Config().then((saved) => {
      setConfig(saved);
      if (saved.secretAccessKey) {
        setSavedSecretKey(saved.secretAccessKey);
        setSecretMasked(true);
      }
      setLoaded(true);
    });
  }, []);

  const handleChange = (field: keyof StoredS3Config, value: string) => {
    if (field === 'secretAccessKey' && secretMasked) {
      setSecretMasked(false);
    }
    setConfig((prev) => ({ ...prev, [field]: value }));
    setStatus({ type: 'idle' });
  };

  const handleSave = async () => {
    // Restore the real secret key if it was masked and not changed
    const configToSave = { ...config };
    if (secretMasked && savedSecretKey) {
      configToSave.secretAccessKey = savedSecretKey;
    }

    if (!configToSave.endpoint || !configToSave.bucket || !configToSave.accessKeyId || !configToSave.secretAccessKey) {
      setStatus({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    // Request host permission for the endpoint
    setStatus({ type: 'saving' });
    const granted = await requestEndpointPermission(configToSave.endpoint);
    if (!granted) {
      setStatus({ type: 'error', message: 'Host permission denied. The extension needs access to your S3 endpoint to upload screenshots.' });
      return;
    }

    // Validate connection
    setStatus({ type: 'validating' });
    try {
      const s3Config: S3Config = {
        endpoint: configToSave.endpoint,
        bucket: configToSave.bucket,
        region: configToSave.region,
        accessKeyId: configToSave.accessKeyId,
        secretAccessKey: configToSave.secretAccessKey,
        pathPrefix: configToSave.pathPrefix || undefined,
        acl: configToSave.acl || undefined,
      };
      await validateS3Connection(s3Config);
    } catch (err) {
      setStatus({ type: 'error', message: `Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
      return;
    }

    // Save
    await saveS3Config(configToSave);
    setSavedSecretKey(configToSave.secretAccessKey);
    setSecretMasked(true);
    setConfig((prev) => ({ ...prev, secretAccessKey: configToSave.secretAccessKey }));
    setStatus({ type: 'success', message: 'Settings saved and connection verified.' });
  };

  const handleClear = async () => {
    await clearS3Config();
    setConfig({
      endpoint: '',
      bucket: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      pathPrefix: '',
      acl: 'public-read',
    });
    setSavedSecretKey('');
    setSecretMasked(false);
    setStatus({ type: 'success', message: 'Settings cleared.' });
  };

  if (!loaded) return null;

  const configured = isConfigured(secretMasked ? { ...config, secretAccessKey: savedSecretKey } : config);

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Rad<span className="brand-accent">Kit</span> Settings</h1>
      </header>

      <main className="options-main">
        <section className="options-section">
          <h2>S3 Sharing</h2>
          <p className="section-description">
            Configure an S3-compatible storage provider to enable the Share button in the editor.
            Your screenshots will be uploaded directly to your own storage — RadKit does not send data anywhere else.
          </p>

          <div className="form-group">
            <label htmlFor="endpoint">Endpoint URL <span className="required">*</span></label>
            <input
              id="endpoint"
              type="url"
              placeholder="https://s3.amazonaws.com"
              value={config.endpoint}
              onChange={(e) => handleChange('endpoint', e.target.value)}
            />
            <span className="hint">AWS S3, Cloudflare R2, MinIO, or any S3-compatible endpoint</span>
          </div>

          <div className="form-group">
            <label htmlFor="bucket">Bucket Name <span className="required">*</span></label>
            <input
              id="bucket"
              type="text"
              placeholder="my-screenshots"
              value={config.bucket}
              onChange={(e) => handleChange('bucket', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="region">Region <span className="required">*</span></label>
            <input
              id="region"
              type="text"
              placeholder="us-east-1"
              value={config.region}
              onChange={(e) => handleChange('region', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="accessKeyId">Access Key ID <span className="required">*</span></label>
            <input
              id="accessKeyId"
              type="text"
              placeholder="AKIA..."
              value={config.accessKeyId}
              onChange={(e) => handleChange('accessKeyId', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="secretAccessKey">Secret Access Key <span className="required">*</span></label>
            <input
              id="secretAccessKey"
              type="password"
              placeholder={secretMasked ? maskSecretKey(savedSecretKey) : 'Enter secret key'}
              value={secretMasked ? '' : config.secretAccessKey}
              onChange={(e) => handleChange('secretAccessKey', e.target.value)}
              onFocus={() => {
                if (secretMasked) {
                  setSecretMasked(false);
                  setConfig((prev) => ({ ...prev, secretAccessKey: savedSecretKey }));
                }
              }}
            />
            {secretMasked && <span className="hint">Key is saved. Click to edit.</span>}
          </div>

          <div className="form-divider"></div>

          <div className="form-group">
            <label htmlFor="pathPrefix">Path Prefix (optional)</label>
            <input
              id="pathPrefix"
              type="text"
              placeholder="screenshots/"
              value={config.pathPrefix}
              onChange={(e) => handleChange('pathPrefix', e.target.value)}
            />
            <span className="hint">Folder prefix for uploaded files (e.g., "screenshots/")</span>
          </div>

          <div className="form-group">
            <label htmlFor="acl">ACL (optional)</label>
            <select
              id="acl"
              value={config.acl}
              onChange={(e) => handleChange('acl', e.target.value)}
            >
              <option value="public-read">public-read</option>
              <option value="private">private</option>
              <option value="bucket-owner-full-control">bucket-owner-full-control</option>
              <option value="">None</option>
            </select>
            <span className="hint">Access control for uploaded files. Use "public-read" for shareable links.</span>
          </div>

          {status.type === 'error' && (
            <div className="status-message status-error">{status.message}</div>
          )}
          {status.type === 'success' && (
            <div className="status-message status-success">{status.message}</div>
          )}

          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={status.type === 'saving' || status.type === 'validating'}
            >
              {status.type === 'saving'
                ? 'Requesting permission...'
                : status.type === 'validating'
                  ? 'Validating connection...'
                  : 'Save & Validate'}
            </button>
            {configured && (
              <button className="btn-secondary" onClick={handleClear}>
                Clear Settings
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
