import React, { useState } from 'react';
import './App.css';
import { IconMonitor, IconSelection, IconFile, IconTimer } from '../editor/Icons';

type CaptureMode = 'visible' | 'selection' | 'fullpage' | 'visible-delayed';

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
