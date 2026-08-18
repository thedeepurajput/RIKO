'use client';

import { useState, useEffect } from 'react';
import { generateCode } from '@/lib/generateCode';
import { generateAnonymousName } from '@/lib/randomNames';
import ChatRoom from '@/components/ChatRoom';
import PrivacyModal from '@/components/PrivacyModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState('start');
  const [joinCode, setJoinCode] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    try {
      // 1. Auto-detect invite from hash #RIXXXX or search query
      let codeFromUrl = '';
      if (typeof window !== 'undefined') {
        if (window.location.hash) {
          const hashClean = window.location.hash.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
          if (hashClean.length === 6) {
            codeFromUrl = hashClean;
          }
        }
        if (!codeFromUrl && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const rawCode = (params.get('join') || params.get('code') || params.get('r') || '').toUpperCase().trim();
          if (rawCode.length === 6) {
            codeFromUrl = rawCode;
          }
        }

        // IMMEDIATELY clean the address bar so the browser URL ALWAYS stays strictly '/'
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname || '/');
        }
      }

      // If invite code was scanned or opened, auto-connect directly into private room
      if (codeFromUrl) {
        const anonName = generateAnonymousName();
        const session = { code: codeFromUrl, role: 'joiner', mode: 'private', username: anonName };
        try {
          sessionStorage.setItem('riko_active_session', JSON.stringify(session));
        } catch (e) {}
        setActiveSession(session);
        return;
      }

      // Check existing saved session
      const savedSession = sessionStorage.getItem('riko_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.code && parsed.role) {
          setActiveSession(parsed);
          return;
        }
      }
    } catch (e) {}
  }, []);

  // Returns trimmed custom name if provided, else fallback (random anon name)
  const resolveUsername = (custom, fallback) => {
    const trimmed = custom.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 20) : fallback;
  };

  const handleStartPrivate = () => {
    const code = generateCode();
    const username = resolveUsername(createUsername, generateAnonymousName());
    const session = { code, role: 'creator', mode: 'private', username };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleJoinPrivate = () => {
    // FIX: Validate exactly 6 characters — codes are always 6 chars,
    // accepting 4-5 caused silent 12s timeout failures
    const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }
    setError('');
    const username = resolveUsername(joinUsername, generateAnonymousName());
    const session = { code: cleaned, role: 'joiner', mode: 'private', username };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleJoinPublicLounge = () => {
    const anonName = generateAnonymousName();
    const session = { code: 'PUBLIC99', role: 'joiner', mode: 'public', username: anonName };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleCodeInput = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinCode(val);
    setError('');
  };

  const handleLeaveSession = () => {
    try {
      sessionStorage.removeItem('riko_active_session');
    } catch (e) {}
    setActiveSession(null);
    setJoinCode('');
    setCreateUsername('');
    setJoinUsername('');
  };

  if (activeSession) {
    return (
      <ChatRoom
        code={activeSession.code}
        role={activeSession.role}
        mode={activeSession.mode || 'private'}
        username={activeSession.username || generateAnonymousName()}
        onLeave={handleLeaveSession}
      />
    );
  }

  return (
    <div className="home-container">
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="home-content">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <h1 className="app-title">RIKO</h1>
          <p className="app-subtitle">Ephemeral · P2P Encrypted · Auto-Vanish</p>
          <div style={{ marginTop: '0.65rem' }}>
            <button
              type="button"
              className="privacy-policy-link"
              onClick={() => setShowPrivacy(true)}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                fontSize: '0.82rem',
                fontWeight: '600',
                padding: '5px 14px',
                borderRadius: '20px'
              }}
            >
              🛡️ Zero-Knowledge Privacy Policy & Security Guarantee
            </button>
          </div>
        </div>

        <div className="action-card">
          <div className="action-tabs">
            <button
              className={activeTab === 'start' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => { setActiveTab('start'); setError(''); }}
              id="tab-start"
            >
              ✨ Private
            </button>
            <button
              className={activeTab === 'join' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => { setActiveTab('join'); setError(''); }}
              id="tab-join"
            >
              🔑 Enter Code
            </button>
            <button
              className={activeTab === 'public' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => { setActiveTab('public'); setError(''); }}
              id="tab-public"
            >
              🌐 Public
            </button>
          </div>

          {activeTab === 'start' && (
            <div className="tab-content">
              <p className="tab-description">
                Generate an end-to-end encrypted 1-to-1 secret room.
              </p>
              <input
                type="text"
                className="username-input"
                placeholder="Your display name (optional)"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value.slice(0, 20))}
                maxLength={20}
                autoComplete="off"
                id="start-username-input"
              />
              <button
                className="btn-primary"
                onClick={handleStartPrivate}
                id="start-chat-btn"
              >
                Create Private Room →
              </button>
            </div>
          )}

          {activeTab === 'join' && (
            <div className="tab-content">
              <p className="tab-description">
                Enter your partner's 6-character room code.
              </p>
              <input
                type="text"
                className="username-input"
                placeholder="Your display name (optional)"
                value={joinUsername}
                onChange={(e) => setJoinUsername(e.target.value.slice(0, 20))}
                maxLength={20}
                autoComplete="off"
                id="join-username-input"
              />
              <div className="code-input-group">
                <input
                  type="text"
                  className="code-input"
                  placeholder="RIXXXX"
                  value={joinCode}
                  onChange={handleCodeInput}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinPrivate()}
                  maxLength={6}
                  autoFocus
                  id="join-code-input"
                />
              </div>
              {error && <p className="input-error">{error}</p>}
              <button
                className="btn-primary"
                onClick={handleJoinPrivate}
                disabled={joinCode.length !== 6}
                id="join-chat-btn"
              >
                Join Private Room →
              </button>
            </div>
          )}

          {activeTab === 'public' && (
            <div className="tab-content">
              <p className="tab-description">
                Hop into the global anonymous lounge. You will get a random identity.
              </p>
              <button
                className="btn-primary"
                onClick={handleJoinPublicLounge}
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)' }}
                id="join-public-btn"
              >
                Join Public Lounge 🌐
              </button>
            </div>
          )}
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <h3 className="feature-title">Direct P2P</h3>
            <p className="feature-desc">Zero server storage</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⏱️</span>
            <h3 className="feature-title">Auto Purge</h3>
            <p className="feature-desc">Wiped after 1 min idle</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <h3 className="feature-title">Unlimited Files</h3>
            <p className="feature-desc">Direct WebRTC stream</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📞</span>
            <h3 className="feature-title">Voice & Video</h3>
            <p className="feature-desc">Encrypted HD calls</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎙️</span>
            <h3 className="feature-title">Voice Notes</h3>
            <p className="feature-desc">Push-to-talk waveforms</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <h3 className="feature-title">Silent QR</h3>
            <p className="feature-desc">Optical scan, 100% clean URL</p>
          </div>
        </div>

        <footer className="home-footer">
          <button
            type="button"
            className="privacy-policy-link"
            onClick={() => setShowPrivacy(true)}
          >
            🛡️ Zero-Knowledge Privacy Policy & Security Guarantee
          </button>
        </footer>

        {showPrivacy && (
          <PrivacyModal onClose={() => setShowPrivacy(false)} />
        )}
      </div>
    </div>
  );
}
