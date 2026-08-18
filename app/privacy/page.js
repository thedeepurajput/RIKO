import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — RIKO Ephemeral Chat',
  description: 'RIKO Zero-Knowledge Privacy Policy and Security Guarantee.',
};

export default function PrivacyPage() {
  return (
    <div className="home-container" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>
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
              gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            ← Back to RIKO
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#f8fafc', letterSpacing: '1px' }}>RIKO</span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(13, 18, 30, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(99,102,241,0.15)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>Zero-Knowledge Privacy Policy</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Last Updated: 2026 · End-to-End Cryptographic Security</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', color: '#cbd5e1', lineHeight: '1.65' }}>
            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                1. Zero Server Storage & Zero Databases
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
                RIKO operates entirely on a serverless Peer-to-Peer (WebRTC) mesh architecture. Your messages, voice notes, files, audio/video calls, and room data travel directly between browser peers. We do not operate any message databases, cloud storage buckets, or chat archive servers.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                2. Automatic Ephemeral Purge (1-Minute Inactivity)
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
                All room communication is strictly ephemeral. When both participants are inactive for 60 seconds, or when any participant leaves the chat room, all memory objects, binary audio buffers, and temporary session tokens are completely purged and deleted forever.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                3. No Accounts, No Trackers, No Telemetry
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
                RIKO requires zero authentication — no phone numbers, email addresses, usernames, or passwords. We do not use third-party analytics trackers, advertising cookies, or behavioral profiling cookies.
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                4. Zero URL Exposure & Silent Optical Connect
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
                Room codes are never exposed in browser address bars or stored in server access logs. QR code invitations execute client-side state transitions that instantly scrub the address bar to a clean root URL (<code style={{ color: '#38bdf8' }}>/</code>).
              </p>
            </section>

            <section>
              <h3 style={{ color: '#818cf8', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                5. Direct Binary P2P Stream for Files & Voice Notes
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
                All file transfers and voice notes are streamed directly over encrypted WebRTC DataChannels with zero intermediary file servers and no file size limits.
              </p>
            </section>
          </div>

          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '700',
                padding: '0.85rem 2rem',
                borderRadius: '14px',
                fontSize: '0.95rem',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              Start Anonymous Chat →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
