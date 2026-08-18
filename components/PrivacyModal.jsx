'use client';

import Link from 'next/link';

export default function PrivacyModal({ onClose }) {
  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-card" style={{ maxWidth: '640px', maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="privacy-modal-title">
            <span>🛡️</span>
            <h3>RIKO Zero-Knowledge Privacy Policy</h3>
          </div>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="privacy-modal-body" style={{ gap: '1.4rem' }}>
          <section className="privacy-section">
            <h4>1. Executive Summary & Zero-Trust Architecture</h4>
            <p>
              RIKO is built entirely on a zero-knowledge, zero-trust decentralized mesh. Traditional chat apps route and archive encrypted packets on central company servers. RIKO eliminates the central server entirely for data transmission.
            </p>
          </section>

          <section className="privacy-section">
            <h4>2. Pure WebRTC Peer-to-Peer Protocol</h4>
            <p>
              All text messages, voice notes, unlimited file transfers, and audio/video calls travel directly between browser peers via DTLS and SRTP end-to-end encryption. No message packet or media stream passes through our servers.
            </p>
          </section>

          <section className="privacy-section">
            <h4>3. Zero Server Storage & Zero Databases</h4>
            <p>
              RIKO operates with zero databases (no SQL, NoSQL, or Redis), zero message queues, and zero cloud storage buckets (no S3 or GCS). Server access logs never record room codes, participant identities, or conversation contents.
            </p>
          </section>

          <section className="privacy-section">
            <h4>4. Automatic Ephemeral Purge (60-Sec Inactivity Self-Destruct)</h4>
            <p>
              Rooms automatically self-destruct after 60 seconds of mutual inactivity or immediately upon leaving. All in-memory message arrays, decrypted binary buffers, active Web Audio context nodes, and session tokens are completely scrubbed from device memory.
            </p>
          </section>

          <section className="privacy-section">
            <h4>5. No Accounts, No Trackers, No Cookies</h4>
            <p>
              Zero registration required: no phone numbers, email addresses, usernames, or passwords. We do not use third-party analytics, tracking pixels, or advertising SDKs. Anonymous identities are randomly generated client-side.
            </p>
          </section>

          <section className="privacy-section">
            <h4>6. Zero URL Exposure & Optical QR Pairing</h4>
            <p>
              Room codes never persist in browser address bars or server logs. Client-side URL sanitization scrubs the address bar to a clean root path (/) within 0 milliseconds upon joining.
            </p>
          </section>

          <section className="privacy-section">
            <h4>7. Unlimited Direct P2P File Streams</h4>
            <p>
              Files and voice notes are streamed directly over encrypted WebRTC DataChannels with zero intermediary file servers and no file size limits.
            </p>
          </section>

          <section className="privacy-section">
            <h4>8. Open-Source Verification</h4>
            <p>
              The complete source code of RIKO is publicly available for independent security audit and review on GitHub at <a href="https://github.com/thedeepurajput/RIKO.git" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>github.com/thedeepurajput/RIKO</a>.
            </p>
          </section>
        </div>

        <div className="privacy-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/privacy"
            onClick={onClose}
            style={{
              color: '#818cf8',
              fontSize: '0.85rem',
              fontWeight: '600',
              textDecoration: 'underline',
              padding: '6px 8px'
            }}
          >
            Open Full Whitepaper Page →
          </Link>
          <button className="btn-primary" onClick={onClose} style={{ width: 'auto', padding: '0.75rem 1.75rem' }}>
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
