import React, { useState } from 'react';
import './App.css';
import { IconMonitor, IconSelection, IconFile, IconTimer, IconDesktop } from '../editor/Icons';

type CaptureMode = 'visible' | 'selection' | 'fullpage' | 'visible-delayed' | 'desktop';

function App() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState('');

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

    return (
        <div className="popup-container">
            <header className="popup-header">
                <span className="brand-name">Rad<span className="brand-accent">Kit</span></span>
                <span className="shortcut-hint">Alt+S</span>
                <button
                    className="settings-btn"
                    onClick={() => chrome.runtime.openOptionsPage()}
                    title="Settings"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>
            </header>

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
            </div>

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
