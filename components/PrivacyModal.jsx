'use client';

export default function PrivacyModal({ onClose }) {
  return (
    <div className="privacy-modal-overlay" onClick={onClose}>
      <div className="privacy-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-modal-header">
          <div className="privacy-modal-title">
            <span>🛡️</span>
            <h3>Zero-Knowledge Privacy Policy</h3>
          </div>
          <button className="privacy-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="privacy-modal-body">
          <section className="privacy-section">
            <h4>1. Zero Server Storage & Zero Databases</h4>
            <p>
              RIKO operates on a 100% serverless peer-to-peer (WebRTC) architecture. Messages, voice notes, files, and call streams travel directly between connected browser devices. No central database, cloud bucket, or chat archive exists.
            </p>
          </section>

          <section className="privacy-section">
            <h4>2. Automatic Ephemeral Purge</h4>
            <p>
              All active chat sessions are automatically purged after 1 minute of mutual inactivity or immediately upon leaving the room. Memory objects, binary buffers, and session caches are completely wiped from device memory.
            </p>
          </section>

          <section className="privacy-section">
            <h4>3. No Accounts, No Trackers, No Cookies</h4>
            <p>
              RIKO does not require sign-up, email, phone number, or passwords. We do not use advertising trackers, third-party analytics cookies, or behavioral telemetry.
            </p>
          </section>

          <section className="privacy-section">
            <h4>4. Zero URL Exposure & Silent Optical Connect</h4>
            <p>
              Room codes never persist in browser address bars or server access logs. QR code invitations execute client-side state transitions that instantly scrub the address bar to a clean root URL.
            </p>
          </section>

          <section className="privacy-section">
            <h4>5. Direct Binary P2P Stream</h4>
            <p>
              File transfers and voice notes are streamed directly over encrypted WebRTC DataChannels with zero intermediary file servers and no file size restrictions.
            </p>
          </section>
        </div>

        <div className="privacy-modal-footer">
          <button className="btn-primary" onClick={onClose}>
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
