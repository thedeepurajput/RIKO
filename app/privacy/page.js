import Link from 'next/link';

export const metadata = {
  title: 'Zero-Knowledge Privacy Policy — RIKO Ephemeral Chat',
  description: 'Comprehensive Privacy Policy, Cryptographic Architecture, and Zero-Knowledge Security Guarantee for RIKO.',
};

export default function PrivacyPage() {
  return (
    <div className="home-container" style={{ minHeight: '100vh', padding: '2.5rem 1.25rem 7rem 1.25rem' }}>
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <Link
            href="/"
            style={{
              color: '#818cf8',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.06)',
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'background 0.2s ease',
            }}
          >
            ← Back to RIKO Chat
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontWeight: '800', fontSize: '1.25rem', color: '#f8fafc', letterSpacing: '1px' }}>RIKO</span>
          </div>
        </div>

        {/* Policy Document Card */}
        <div
          style={{
            background: 'rgba(13, 18, 30, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '3rem 2.25rem',
            boxShadow: '0 25px 70px rgba(0,0,0,0.85), 0 0 35px rgba(99,102,241,0.18)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🛡️</span>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.5px' }}>
                Zero-Knowledge Privacy Policy
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '6px 0 0 0' }}>
                Official Cryptographic Whitepaper & Data Sovereignty Guarantee · Version 2.0 (2026)
              </p>
            </div>
          </div>

          {/* Body Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2rem', color: '#cbd5e1', lineHeight: '1.7' }}>
            
            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                Executive Summary & Core Security Philosophy
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                RIKO is architected from the ground up on the principle of <strong>Zero-Trust and Zero-Knowledge (Privacy by Design)</strong>. Traditional messaging applications (including cloud messengers and centralized encrypted platforms) route and store encrypted data packets through centralized company servers, maintaining metadata logs such as timestamps, IP connections, contact books, and user identifiers.
              </p>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                RIKO fundamentally eliminates this paradigm. There is no central server relaying your messages, no intermediate cloud storage bucket holding your files, and no persistent database recording your conversations. All communication exists exclusively in your device’s volatile RAM and is completely erased upon session conclusion.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                1. Pure Decentralized Peer-to-Peer (WebRTC Mesh) Protocol
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                When you initiate or join a room on RIKO, our signaling protocol facilitates an initial cryptographic exchange between your browser and your partner’s browser. Once the P2P connection handshake is established, the connection shifts entirely to direct browser-to-browser WebRTC DataChannels and MediaStreams.
              </p>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                Every text message, audio note, file payload, and voice/video call stream travels directly through an encrypted peer-to-peer tunnel using industry-standard <strong>DTLS (Datagram Transport Layer Security)</strong> and <strong>SRTP (Secure Real-time Transport Protocol)</strong>. No data packet ever touches our servers during active conversations.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                2. Absolute Zero Server Storage & Zero Databases
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                We maintain an uncompromising <strong>Zero Data Retention</strong> policy:
              </p>
              <ul style={{ paddingLeft: '1.4rem', fontSize: '0.92rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>No Database Infrastructure:</strong> We do not operate MySQL, PostgreSQL, MongoDB, Redis, or any server-side database.</li>
                <li><strong>No Message Queues:</strong> There are no message logs, backup archives, or undelivered message queues.</li>
                <li><strong>No Cloud Buckets:</strong> Shared images, voice recordings, and documents are never uploaded to Amazon S3, Google Cloud Storage, or any cloud filesystem.</li>
                <li><strong>No Access Logs:</strong> Our edge servers do not log IP-to-room mappings, participant identities, or conversation durations.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                3. Automatic Ephemeral Purge (60-Second Inactivity Self-Destruct)
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                Privacy is enforced through strict lifecycle boundaries. All active private chat rooms and public lounge sessions are governed by an automated Ephemeral Inactivity Tracker:
              </p>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                If mutual inactivity is detected for <strong>60 seconds</strong>, or if either user clicks the leave button or closes their browser tab, the room immediately self-destructs. All in-memory message arrays, decrypted binary buffers, active Web Audio context nodes, and temporary session keys are permanently destroyed from browser memory. Once purged, data is mathematically irrecoverable.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                4. Zero Accounts, No Telemetry & No Identity Tracking
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                RIKO guarantees total anonymity and friction-free usage:
              </p>
              <ul style={{ paddingLeft: '1.4rem', fontSize: '0.92rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>No Registration Required:</strong> No email addresses, mobile numbers, passwords, or Google/Apple logins are requested or accepted.</li>
                <li><strong>No Fingerprinting & Trackers:</strong> We do not include third-party tracking scripts, behavioral analytics (e.g. Google Analytics, Meta Pixel), or advertising SDKs.</li>
                <li><strong>Randomized Anon Identities:</strong> Display names are randomly generated client-side from an in-memory word dictionary and carry zero persistent linkage across sessions.</li>
              </ul>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                5. Zero URL Exposure & Optical Stealth Handshake
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                To defend against shoulder-surfing, browser history inspection, and corporate proxy surveillance, RIKO implements instant client-side URL scrubbing. Whenever a room is joined via optical camera QR scan or private invitation, the browser address bar is instantly sanitized to the clean root path (<code style={{ color: '#38bdf8' }}>/</code>) in <strong>0 milliseconds</strong> using <code style={{ color: '#38bdf8' }}>window.history.replaceState</code>. Room codes are never exposed in the URL bar, bookmarks, or web server access logs.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                6. Unlimited Direct Binary Streams (Files & Voice Notes)
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                File transfers and push-to-talk voice notes operate without arbitrary file size caps. Files are sliced into binary ArrayBuffer chunks directly on the sending device and streamed over peer-to-peer DataChannels directly into the recipient’s memory. Files are assembled into ephemeral in-memory Blobs for direct download, bypassing all intermediary storage infrastructure.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                7. Global Regulatory Compliance (GDPR, CCPA & Privacy by Design)
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                Because RIKO collects, stores, processes, and sells zero personal data, it fully complies with the European Union General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and global data privacy standards. There is literally no personal information stored to subpoena, leak, monetize, or breach.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.6rem' }}>
                8. Open-Source Verification & Auditability
              </h3>
              <p style={{ fontSize: '0.94rem', color: '#94a3b8' }}>
                Transparency is the cornerstone of cryptographic trust. The complete source code of RIKO is publicly available for independent security review and verification on GitHub at <a href="https://github.com/thedeepurajput/RIKO.git" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>github.com/thedeepurajput/RIKO</a>. Any developer or security researcher can inspect every line of code to verify that zero backdoors, tracking beacons, or data exfiltration routines exist.
              </p>
            </section>

          </div>

          {/* Footer Call to Action */}
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '700',
                padding: '1rem 2.5rem',
                borderRadius: '16px',
                fontSize: '1rem',
                boxShadow: '0 8px 30px rgba(99, 102, 241, 0.45)',
                transition: 'transform 0.15s ease',
              }}
            >
              Start 100% Anonymous Chat Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
