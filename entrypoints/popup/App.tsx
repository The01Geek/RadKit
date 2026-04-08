import React, { useState } from 'react';
import './App.css';
import { IconMonitor, IconSelection, IconFile, IconTimer, IconDesktop, IconRecord } from '../editor/Icons';

type CaptureMode = 'visible' | 'selection' | 'fullpage' | 'visible-delayed' | 'desktop';
type Tab = 'capture' | 'record';

function App() {
    const [activeTab, setActiveTab] = useState<Tab>('capture');
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState('');

    // Recording settings
    const [framerate, setFramerate] = useState('30');
    const [audioMode, setAudioMode] = useState('mic');
    const [resolution, setResolution] = useState('source');
    const [webcam, setWebcam] = useState(false);

    const handleCapture = async (mode: CaptureMode) => {
        setIsCapturing(true);
        setStatus('Capturing...');

        try {
            const response = await browser.runtime.sendMessage({
                type: 'capture',
                mode: mode,
            });

            if (response?.success) {
                setStatus('Opening editor...');
                setTimeout(() => window.close(), 500);
            } else {
                setStatus(response?.error || 'Capture failed');
                setIsCapturing(false);
            }
        } catch (error) {
            setStatus('Error: ' + (error as Error).message);
            setIsCapturing(false);
        }
    };

    const handleRecord = async () => {
        setIsCapturing(true);
        setStatus('Starting recording...');

        try {
            // Save settings so record.html can read them
            await browser.storage.local.set({
                recordingSettings: {
                    framerate: parseInt(framerate, 10),
                    audioMode,
                    resolution,
                    webcam,
                },
            });

            const response = await browser.runtime.sendMessage({
                type: 'capture',
                mode: 'recording',
            });

            if (response?.success) {
                setStatus('Recording complete!');
                setTimeout(() => window.close(), 500);
            } else {
                setStatus(response?.error || 'Recording failed');
                setIsCapturing(false);
            }
        } catch (error) {
            setStatus('Error: ' + (error as Error).message);
            setIsCapturing(false);
        }
    };

    return (
        <div className="popup-container">
            <header className="popup-header">
                <span className="brand-name">Rad<span className="brand-accent">Kit</span></span>
                <span className="shortcut-hint">Alt+S</span>
            </header>

            <div className="tab-bar">
                <button
                    className={`tab-btn ${activeTab === 'capture' ? 'active' : ''}`}
                    onClick={() => setActiveTab('capture')}
                >
                    Capture
                </button>
                <button
                    className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
                    onClick={() => setActiveTab('record')}
                >
                    Record
                </button>
            </div>

            {activeTab === 'capture' && (
                <div className="capture-modes">
                    <button
                        className="capture-card"
                        onClick={() => handleCapture('visible')}
                        disabled={isCapturing}
                    >
                        <span className="icon-wrap"><IconMonitor /></span>
                        <div className="card-content">
                            <span className="card-label">Visible Viewport</span>
                            <span className="card-desc">Capture what's on screen</span>
                        </div>
                    </button>

                    <button
                        className="capture-card"
                        onClick={() => handleCapture('selection')}
                        disabled={isCapturing}
                    >
                        <span className="icon-wrap"><IconSelection /></span>
                        <div className="card-content">
                            <span className="card-label">Select Area</span>
                            <span className="card-desc">Draw a custom rectangle</span>
                        </div>
                    </button>

                    <button
                        className="capture-card"
                        onClick={() => handleCapture('fullpage')}
                        disabled={isCapturing}
                    >
                        <span className="icon-wrap"><IconFile /></span>
                        <div className="card-content">
                            <span className="card-label">Full Page</span>
                            <span className="card-desc">Capture top to bottom</span>
                        </div>
                    </button>

                    <button
                        className="capture-card"
                        onClick={() => handleCapture('visible-delayed')}
                        disabled={isCapturing}
                    >
                        <span className="icon-wrap"><IconTimer /></span>
                        <div className="card-content">
                            <span className="card-label">Visible After Delay</span>
                            <span className="card-desc">3-second countdown</span>
                        </div>
                    </button>

                    <button
                        className="capture-card"
                        onClick={() => handleCapture('desktop')}
                        disabled={isCapturing}
                    >
                        <span className="icon-wrap"><IconDesktop /></span>
                        <div className="card-content">
                            <span className="card-label">Screen / Window</span>
                            <span className="card-desc">Capture screen or app window</span>
                        </div>
                    </button>

                    <a
                        className="recordings-link"
                        href={browser.runtime.getURL('/screenshots.html')}
                        target="_blank"
                        rel="noopener"
                    >
                        View saved screenshots
                    </a>
                </div>
            )}

            {activeTab === 'record' && (
                <div className="record-panel">
                    <div className="settings-grid">
                        <div className="setting-row">
                            <label className="setting-label">Frame Rate</label>
                            <select
                                className="setting-select"
                                value={framerate}
                                onChange={(e) => setFramerate(e.target.value)}
                                disabled={isCapturing}
                            >
                                <option value="15">15 fps</option>
                                <option value="24">24 fps</option>
                                <option value="30">30 fps</option>
                                <option value="60">60 fps</option>
                            </select>
                        </div>

                        <div className="setting-row">
                            <label className="setting-label">Audio</label>
                            <select
                                className="setting-select"
                                value={audioMode}
                                onChange={(e) => setAudioMode(e.target.value)}
                                disabled={isCapturing}
                            >
                                <option value="mic">Microphone</option>
                                <option value="system">System audio</option>
                                <option value="both">Both</option>
                                <option value="none">None</option>
                            </select>
                        </div>

                        <div className="setting-row">
                            <label className="setting-label">Resolution</label>
                            <select
                                className="setting-select"
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                disabled={isCapturing}
                            >
                                <option value="source">Source (native)</option>
                                <option value="720">720p</option>
                                <option value="1080">1080p</option>
                                <option value="4k">4K</option>
                            </select>
                        </div>

                        <div className="setting-row">
                            <label className="setting-label">Webcam Overlay</label>
                            <label className="toggle">
                                <input
                                    type="checkbox"
                                    checked={webcam}
                                    onChange={(e) => setWebcam(e.target.checked)}
                                    disabled={isCapturing}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </div>

                    <button
                        className="record-btn"
                        onClick={handleRecord}
                        disabled={isCapturing}
                    >
                        <span className="record-dot" />
                        Start Recording
                    </button>

                    <a
                        className="recordings-link"
                        href={browser.runtime.getURL('/recordings.html')}
                        target="_blank"
                        rel="noopener"
                    >
                        View saved recordings
                    </a>
                </div>
            )}

            {status && (
                <div className="status-bar">
                    {isCapturing && <span className="pulse-dot" />}
                    {status}
                </div>
            )}
        </div>
    );
}

export default App;
