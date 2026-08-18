'use client';

import { useState } from 'react';
import { getQRCodeUrl } from '@/lib/qrGenerator';

export default function QRCodeModal({ code, onClose, copyToClipboard }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const getInviteUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?join=${code}`;
  };

  const inviteUrl = getInviteUrl();
  const qrCodeSrc = getQRCodeUrl(inviteUrl);

  const handleCopyLink = async () => {
    let ok = false;
    if (copyToClipboard) {
      ok = await copyToClipboard(inviteUrl);
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(inviteUrl); ok = true; } catch (e) {}
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my LinkChat Private Room',
          text: `Join my encrypted private chat room on LinkChat. Code: ${code}`,
          url: inviteUrl,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h3>📱 Scan to Join Room</h3>
          <button className="qr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="qr-image-container">
          <img
            src={qrCodeSrc}
            alt={`QR code for room ${code}`}
            className="qr-image"
          />
        </div>

        <div className="qr-code-pill">
          <span className="qr-code-label">Room Code:</span>
          <span className="qr-code-text">{code}</span>
        </div>

        <p className="qr-hint">Scan with any mobile camera to connect instantly without typing.</p>

        <div className="qr-actions">
          <button className="btn-secondary" onClick={handleCopyLink}>
            {copied ? '✅ Link Copied!' : '🔗 Copy Invite Link'}
          </button>
          <button className="btn-primary" onClick={handleNativeShare}>
            {shared ? '✅ Shared!' : '📤 Share via WhatsApp / Apps'}
          </button>
        </div>
      </div>
    </div>
  );
}
