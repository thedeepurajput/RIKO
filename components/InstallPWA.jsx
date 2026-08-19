'use client';

import { useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/haptics';

export default function InstallPWA({ variant = 'banner' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkStandalone();

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Listen for Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.debug('SW reg failed:', err));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic('medium');

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback hint for desktop or other browsers
      alert('To install RIKO: Open your browser menu (⋮ or ...) and select "Install app" or "Add to Home screen".');
    }
  };

  // If already running standalone, hide install button
  if (isStandalone) return null;

  return (
    <>
      {variant === 'button' ? (
        <button
          type="button"
          className="install-pwa-btn"
          onClick={handleInstallClick}
          title="Install RIKO as a native app"
          aria-label="Install RIKO app"
        >
          📲 Install App
        </button>
      ) : (
        <div className="install-pwa-banner" onClick={handleInstallClick}>
          <div className="install-banner-left">
            <span className="install-banner-icon">📲</span>
            <div className="install-banner-text">
              <strong>Install RIKO App</strong>
              <span>Add to Home Screen for instant 1-tap access</span>
            </div>
          </div>
          <button type="button" className="install-banner-action">
            Install
          </button>
        </div>
      )}

      {/* iOS Safari Instructions Modal */}
      {showIOSModal && (
        <div className="privacy-modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="privacy-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="privacy-modal-header">
              <div className="privacy-modal-title">
                <span>📲</span>
                <h3>Install on iPhone / iPad</h3>
              </div>
              <button className="privacy-modal-close" onClick={() => setShowIOSModal(false)}>✕</button>
            </div>
            <div className="privacy-modal-body" style={{ gap: '1.2rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>1️⃣</span>
                <p style={{ fontSize: '0.92rem', color: '#cbd5e1' }}>
                  Tap the <strong>Share button (⎋)</strong> at the bottom of Safari.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>2️⃣</span>
                <p style={{ fontSize: '0.92rem', color: '#cbd5e1' }}>
                  Scroll down and select <strong>'Add to Home Screen' (⊞)</strong>.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>3️⃣</span>
                <p style={{ fontSize: '0.92rem', color: '#cbd5e1' }}>
                  Tap <strong>'Add'</strong> in the top-right corner.
                </p>
              </div>
            </div>
            <div className="privacy-modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowIOSModal(false)}
                style={{ width: '100%' }}
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
