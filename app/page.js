'use client';

import { useState, useEffect } from 'react';
import { generateCode } from '@/lib/generateCode';
import { generateAnonymousName } from '@/lib/randomNames';
import ChatRoom from '@/components/ChatRoom';

export default function Home() {
  const [activeTab, setActiveTab] = useState('start');
  const [joinCode, setJoinCode] = useState('');
  // FIX: Separate username states per tab — shared state was confusing
  // (typing a name in Private tab would pre-fill Join tab)
  const [createUsername, setCreateUsername] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem('linkchat_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.code && parsed.role) {
          setActiveSession(parsed);
          return;
        }
      }

      // Auto-detect invite link with ?join=RIXXXX or ?code=RIXXXX
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const codeFromUrl = (params.get('join') || params.get('code') || '').toUpperCase().trim();
        if (codeFromUrl.length === 6) {
          setJoinCode(codeFromUrl);
          setActiveTab('join');
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
      sessionStorage.setItem('linkchat_active_session', JSON.stringify(session));
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
      sessionStorage.setItem('linkchat_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleJoinPublicLounge = () => {
    const anonName = generateAnonymousName();
    const session = { code: 'PUBLIC99', role: 'joiner', mode: 'public', username: anonName };
    try {
      sessionStorage.setItem('linkchat_active_session', JSON.stringify(session));
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
      sessionStorage.removeItem('linkchat_active_session');
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
          <h1 className="app-title">LinkChat</h1>
          <p className="app-subtitle">Ephemeral · P2P Encrypted · Auto-Vanish</p>
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
            <h3 className="feature-title">50MB Files</h3>
            <p className="feature-desc">Direct WebRTC stream</p>
          </div>
        </div>
      </div>
    </div>
  );
}
