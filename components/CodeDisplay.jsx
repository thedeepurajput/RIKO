'use client';

import { useState } from 'react';

// FIX: Accepts shared copyToClipboard helper from ChatRoom so both the header
// code click and this button use the same implementation — no more two divergent
// fallback copy approaches in the codebase.
export default function CodeDisplay({ code, onBack, copyToClipboard }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let success = false;

    if (copyToClipboard) {
      success = await copyToClipboard(code);
    } else {
      // Standalone fallback if used without the prop
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="waiting-screen">
      <div className="code-display">
        <span className="code-label">Your Private Room Code</span>
        <div className="code-value" aria-label={`Room code: ${code}`}>{code}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={handleCopy} style={{ padding: '0.85rem' }}>
            {copied ? '✅ Code Copied!' : '📋 Copy Room Code'}
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
