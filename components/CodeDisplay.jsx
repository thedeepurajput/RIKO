'use client';

import { useState } from 'react';
import QRCodeModal from './QRCodeModal';
import { triggerHaptic } from '@/lib/haptics';

export default function CodeDisplay({ code, onBack, copyToClipboard }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    let success = false;

    if (copyToClipboard) {
      success = await copyToClipboard(code);
    } else {
      if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(code); success = true; } catch (e) {}
      }
      if (!success) {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { success = document.execCommand('copy'); } catch (e) { success = false; }
        finally { document.body.removeChild(ta); }
      }
    }

    if (success) {
      triggerHaptic('light');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="waiting-screen">
      {showQR && (
        <QRCodeModal
          code={code}
          onClose={() => setShowQR(false)}
          copyToClipboard={copyToClipboard}
        />
      )}

      <div className="code-display">
        <span className="code-label">Your Private Room Code</span>
        <div className="code-value" aria-label={`Room code: ${code}`}>{code}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={handleCopy} style={{ padding: '0.85rem' }}>
            {copied ? '✅ Code Copied!' : '📋 Copy Room Code'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowQR(true)}
            style={{
              padding: '0.85rem',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#818cf8',
              borderRadius: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📱 Scan QR Code to Connect
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="copy-code-btn"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}
            >
              ← Cancel & Back to Home
            </button>
          )}
        </div>
      </div>

      <div className="waiting-pulse">
        <span className="pulse-text">Waiting for your partner to enter code</span>
        <div className="pulse-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </div>
    </div>
  );
}
