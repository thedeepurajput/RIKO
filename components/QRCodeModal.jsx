'use client';

import { getQRCodeUrl } from '@/lib/qrGenerator';

export default function QRCodeModal({ code, onClose, expiresAt }) {
  const getInviteUrl = () => {
    if (typeof window === 'undefined') return '';
    const expiry = Number(expiresAt) || Date.now() + 60000;
    const params = new URLSearchParams({ join: code, expires: String(expiry) });
    return `${window.location.origin}/?${params.toString()}`;
  };

  const inviteUrl = getInviteUrl();
  const qrCodeSrc = getQRCodeUrl(inviteUrl);

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h3>📱 Scan to Connect</h3>
          <button className="qr-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="qr-image-container">
          <img src={qrCodeSrc} alt="Scan QR code to connect" className="qr-image" />
        </div>
        <p className="qr-hint" style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
          Scan with your phone camera to connect directly. This invite expires in 60 seconds.
        </p>
        <button className="btn-primary" onClick={onClose} style={{ width: '100%', padding: '0.85rem' }}>
          ✓ Done
        </button>
      </div>
    </div>
  );
}
