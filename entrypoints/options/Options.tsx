import React, { useEffect, useState } from 'react';
import { S3Config, DEFAULT_CONFIG, getS3Config, saveS3Config, clearS3Config } from '../../lib/s3-storage';
import { validateS3Connection } from '../../lib/s3-client';

type Status = 'idle' | 'saving' | 'validating' | 'success' | 'error';

export default function Options() {
    const [config, setConfig] = useState<S3Config>(DEFAULT_CONFIG);
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');
    const [secretMasked, setSecretMasked] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getS3Config().then((saved) => {
            if (saved) {
                setConfig(saved);
                setSecretMasked(true);
            }
            setLoaded(true);
        });
    }, []);

    const updateField = (field: keyof S3Config, value: string) => {
        if (field === 'secretAccessKey' && secretMasked) {
            setSecretMasked(false);
        }
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const requestHostPermission = async (endpoint: string): Promise<boolean> => {
        try {
            const url = new URL(endpoint);
            const origin = `${url.protocol}//${url.host}/*`;
            const granted = await browser.permissions.request({
                origins: [origin],
            });
            return granted;
        } catch {
            return false;
        }
    };

    const handleSave = async () => {
        if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
            setStatus('error');
            setMessage('Please fill in all required fields.');
            return;
        }

        // Validate endpoint URL
        try {
            new URL(config.endpoint);
        } catch {
            setStatus('error');
            setMessage('Invalid endpoint URL.');
            return;
        }

        setStatus('saving');
        setMessage('');

        // Request host permission for the configured endpoint
        const granted = await requestHostPermission(config.endpoint);
        if (!granted) {
            setStatus('error');
            setMessage('Host permission denied. RadKit needs permission to connect to your S3 endpoint.');
            return;
        }

        // Validate connection
        setStatus('validating');
        setMessage('Validating connection...');

        const result = await validateS3Connection(config);
        if (!result.ok) {
            // Save anyway but warn — some providers may not support HeadBucket
            await saveS3Config(config);
            setSecretMasked(true);
            setStatus('error');
            setMessage(`Credentials saved, but connection test failed: ${result.error}. Your credentials are saved — upload may still work if the bucket accepts PutObject requests.`);
            return;
        }

        await saveS3Config(config);
        setSecretMasked(true);
        setStatus('success');
        setMessage('Credentials saved and connection validated successfully!');
    };

    const handleClear = async () => {
        await clearS3Config();
        setConfig(DEFAULT_CONFIG);
        setSecretMasked(false);
        setStatus('success');
        setMessage('Credentials cleared.');
    };

    if (!loaded) return null;

    return (
        <div className="options-container">
            <div className="options-card">
                <div className="options-header">
                    <h1>
                        Rad<span className="brand-accent">Kit</span> Settings
                    </h1>
                    <p className="options-subtitle">Configure S3-compatible storage for screenshot sharing</p>
                </div>

                <div className="options-notice">
                    Enabling sharing will send screenshot data to your configured S3 endpoint.
                    RadKit never sends data to any other external service.
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="form-group">
                        <label htmlFor="endpoint">
                            Endpoint URL <span className="required">*</span>
                        </label>
                        <input
                            id="endpoint"
                            type="url"
                            placeholder="https://s3.amazonaws.com"
                            value={config.endpoint}
                            onChange={(e) => updateField('endpoint', e.target.value)}
                        />
                        <span className="form-hint">
                            AWS S3, Cloudflare R2, MinIO, or any S3-compatible endpoint
                        </span>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="bucket">
                                Bucket Name <span className="required">*</span>
                            </label>
                            <input
                                id="bucket"
                                type="text"
                                placeholder="my-screenshots"
                                value={config.bucket}
                                onChange={(e) => updateField('bucket', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="region">Region</label>
                            <input
                                id="region"
                                type="text"
                                placeholder="us-east-1"
                                value={config.region}
                                onChange={(e) => updateField('region', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="accessKeyId">
                            Access Key ID <span className="required">*</span>
                        </label>
                        <input
                            id="accessKeyId"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value={config.accessKeyId}
                            onChange={(e) => updateField('accessKeyId', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="secretAccessKey">
                            Secret Access Key <span className="required">*</span>
                        </label>
                        <input
                            id="secretAccessKey"
                            type={secretMasked ? 'password' : 'text'}
                            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                            value={secretMasked ? '••••••••••••••••' : config.secretAccessKey}
                            onChange={(e) => updateField('secretAccessKey', e.target.value)}
                            onFocus={() => {
                                if (secretMasked) {
                                    setSecretMasked(false);
                                    updateField('secretAccessKey', '');
                                }
                            }}
                        />
                        <span className="form-hint">
                            Stored in browser sync storage. Clear credentials to revoke access.
                        </span>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="pathPrefix">Path Prefix</label>
                            <input
                                id="pathPrefix"
                                type="text"
                                placeholder="screenshots/"
                                value={config.pathPrefix}
                                onChange={(e) => updateField('pathPrefix', e.target.value)}
                            />
                            <span className="form-hint">Optional folder prefix for uploaded files</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="acl">ACL</label>
                            <select
                                id="acl"
                                value={config.acl}
                                onChange={(e) => updateField('acl', e.target.value)}
                            >
                                <option value="public-read">public-read</option>
                                <option value="private">private</option>
                                <option value="authenticated-read">authenticated-read</option>
                                <option value="">None (bucket default)</option>
                            </select>
                        </div>
                    </div>

                    {message && (
                        <div className={`form-message ${status === 'error' ? 'form-message-error' : 'form-message-success'}`}>
                            {message}
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn-save"
                            disabled={status === 'saving' || status === 'validating'}
                        >
                            {status === 'saving' ? 'Saving...' : status === 'validating' ? 'Validating...' : 'Save & Validate'}
                        </button>
                        <button
                            type="button"
                            className="btn-clear"
                            onClick={handleClear}
                        >
                            Clear Credentials
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
