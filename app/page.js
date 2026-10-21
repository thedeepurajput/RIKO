'use client';

import { useState, useEffect } from 'react';
import { generateCode } from '@/lib/generateCode';
import { generateAnonymousName } from '@/lib/randomNames';
import ChatRoom from '@/components/ChatRoom';
import PrivacyModal from '@/components/PrivacyModal';
import InstallPWA from '@/components/InstallPWA';

const ROOM_TTL_MS = 60 * 1000;

function getJoinInvite() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const rawCode = (
    params.get('join') || params.get('code') || params.get('r') || ''
  ).toUpperCase().trim();
  const code = rawCode.replace(/[^A-Z0-9]/g, '');
  const rawExpires = Number(params.get('expires'));

  if (code.length !== 6) return null;
  if (!Number.isFinite(rawExpires) || rawExpires <= Date.now()) {
    return { expired: true };
  }

  return { code, expiresAt: rawExpires };
}

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
      let invite = null;
      if (window.location.search) {
        invite = getJoinInvite();
      } else if (window.location.hash) {
        const hashCode = window.location.hash
          .replace(/^#/, '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase();
        if (hashCode.length === 6) {
          invite = { code: hashCode, expiresAt: Date.now() + ROOM_TTL_MS };
        }
      }

      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, '', window.location.pathname || '/');
      }

      if (invite?.expired) {
        setError('This room QR/code has expired. Please create a new room.');
        return;
      }

      if (invite?.code) {
        const session = {
          code: invite.code,
          expiresAt: invite.expiresAt,
          role: 'joiner',
          mode: 'private',
          username: generateAnonymousName(),
        };
        sessionStorage.setItem('riko_active_session', JSON.stringify(session));
        setActiveSession(session);
        return;
      }

      const savedSession = sessionStorage.getItem('riko_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const expiresAt = Number(parsed?.expiresAt);
        if (parsed?.code && parsed?.role && (!expiresAt || expiresAt > Date.now())) {
          setActiveSession(parsed);
        } else {
          sessionStorage.removeItem('riko_active_session');
          setError('This room has expired. Please create a new room.');
        }
      }
    } catch (e) {
      // Invalid invite/session data should not prevent the home screen rendering.
    }
  }, []);

  const resolveUsername = (custom, fallback) => {
    const trimmed = custom.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 20) : fallback;
  };

  const handleStartPrivate = () => {
    const code = generateCode();
    const expiresAt = Date.now() + ROOM_TTL_MS;
    const session = {
      code,
      expiresAt,
      role: 'creator',
      mode: 'private',
      username: resolveUsername(createUsername, generateAnonymousName()),
    };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleJoinPrivate = () => {
    const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }
    setError('');
    const session = {
      code: cleaned,
      role: 'joiner',
      mode: 'private',
      username: resolveUsername(joinUsername, generateAnonymousName()),
    };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleJoinPublicLounge = () => {
    const session = {
      code: 'PUBLIC99',
      role: 'joiner',
      mode: 'public',
      username: generateAnonymousName(),
    };
    try {
      sessionStorage.setItem('riko_active_session', JSON.stringify(session));
    } catch (e) {}
    setActiveSession(session);
  };

  const handleCodeInput = (e) => {
    setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    setError('');
  };

  const handleLeaveSession = () => {
    try { sessionStorage.removeItem('riko_active_session'); } catch (e) {}
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
        expiresAt={activeSession.expiresAt}
        onLeave={handleLeaveSession}
      />
    );
  }

  return (
    <div className="home-container">
      <div className="bg-orbs"><div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" /></div>
      <div className="home-content">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <h1 className="app-title">RIKO</h1>
          <p className="app-subtitle">Ephemeral · P2P Encrypted · Auto-Vanish</p>
          <div style={{ marginTop: '0.65rem' }}>
            <button type="button" className="privacy-policy-link" onClick={() => setShowPrivacy(true)}>🛡️ Zero-Knowledge Privacy Policy & Security Guarantee</button>
          </div>
        </div>
        <InstallPWA variant="banner" />
        <div className="action-card">
          <div className="action-tabs">
            <button className={activeTab === 'start' ? 'tab-btn active' : 'tab-btn'} onClick={() => { setActiveTab('start'); setError(''); }}>✨ Private</button>
            <button className={activeTab === 'join' ? 'tab-btn active' : 'tab-btn'} onClick={() => { setActiveTab('join'); setError(''); }}>🔑 Enter Code</button>
            <button className={activeTab === 'public' ? 'tab-btn active' : 'tab-btn'} onClick={() => { setActiveTab('public'); setError(''); }}>🌐 Public</button>
          </div>
          {activeTab === 'start' && <div className="tab-content"><p className="tab-description">Generate an end-to-end encrypted 1-to-1 secret room.</p><input type="text" className="username-input" placeholder="Your display name (optional)" value={createUsername} onChange={(e) => setCreateUsername(e.target.value.slice(0, 20))} maxLength={20} autoComplete="off" /><button className="btn-primary" onClick={handleStartPrivate}>Create Private Room →</button></div>}
          {activeTab === 'join' && <div className="tab-content"><p className="tab-description">Enter your partner's 6-character room code.</p><input type="text" className="username-input" placeholder="Your display name (optional)" value={joinUsername} onChange={(e) => setJoinUsername(e.target.value.slice(0, 20))} maxLength={20} autoComplete="off" /><div className="code-input-group"><input type="text" className="code-input" placeholder="RIXXXX" value={joinCode} onChange={handleCodeInput} onKeyDown={(e) => e.key === 'Enter' && handleJoinPrivate()} maxLength={6} autoFocus /></div>{error && <p className="input-error">{error}</p>}<button className="btn-primary" onClick={handleJoinPrivate} disabled={joinCode.length !== 6}>Join Private Room →</button></div>}
          {activeTab === 'public' && <div className="tab-content"><p className="tab-description">Hop into the global anonymous lounge. You will get a random identity.</p><button className="btn-primary" onClick={handleJoinPublicLounge}>Join Public Lounge 🌐</button></div>}
        </div>
        <footer className="home-footer"><button type="button" className="privacy-policy-link" onClick={() => setShowPrivacy(true)}>🛡️ Zero-Knowledge Privacy Policy & Security Guarantee</button></footer>
        {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      </div>
    </div>
  );
}
