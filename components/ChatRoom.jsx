'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPeer, connectToPeer } from '@/lib/peer';
import { InactivityTracker } from '@/lib/inactivityTracker';
import { validateFile, prepareFileForSending } from '@/lib/fileTransfer';
import MessageBubble from './MessageBubble';
import FileMessage from './FileMessage';
import ConnectionStatus from './ConnectionStatus';
import CodeDisplay from './CodeDisplay';

const SEEN_IDS_MAX = 500;
const SEEN_IDS_TRIM = 100;

// FIX: Crypto-based unique ID generator for messages — replaces Math.random()
// which could theoretically collide when two messages are sent in the same ms.
function generateMsgId(prefix) {
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  return `${prefix}_${Date.now()}_${arr[0].toString(36)}${arr[1].toString(36)}`;
}

export default function ChatRoom({ code, role, mode, username, onLeave }) {
  const [messages, setMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem('linkchat_msgs_' + code);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      // Strip fileData — ArrayBuffer doesn't survive JSON serialization
      return parsed.map((msg) =>
        msg.type === 'file' ? { ...msg, fileData: null } : msg
      );
    } catch (e) {
      return [];
    }
  });

  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(
    role === 'creator' ? 'waiting' : 'connecting'
  );
  const [onlineCount, setOnlineCount] = useState(1);
  const [inactivityWarning, setInactivityWarning] = useState({ active: false, seconds: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState(null);
  // FIX: Track copy feedback for room code in header
  const [codeCopied, setCodeCopied] = useState(false);

  const peerRef = useRef(null);
  const connectionsRef = useRef([]);
  const seenMessageIds = useRef(new Set());
  const peerIdentityMap = useRef(new Map());
  const trackerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // FIX: Track peers that are currently typing, with disconnect cleanup
  const typingPeerTimers = useRef({});
  const isSetupRef = useRef(false);

  // Keep URL clean
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Persist messages — strip fileData before saving
  useEffect(() => {
    try {
      const serializable = messages.map((msg) =>
        msg.type === 'file' ? { ...msg, fileData: null } : msg
      );
      sessionStorage.setItem('linkchat_msgs_' + code, JSON.stringify(serializable));
    } catch (e) {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, code]);

  // iOS keyboard — visualViewport resize listener
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty(
        '--keyboard-offset',
        `${Math.max(0, offsetBottom)}px`
      );
    };
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
    };
  }, []);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const floodBroadcast = useCallback((data, sourceConn = null) => {
    connectionsRef.current.forEach((conn) => {
      if (conn && conn !== sourceConn && conn.open) {
        try { conn.send(data); } catch (err) {
          console.error('Relay send error:', err);
        }
      }
    });
  }, []);

  const trackMessageId = useCallback((id) => {
    if (seenMessageIds.current.size >= SEEN_IDS_MAX) {
      const entries = Array.from(seenMessageIds.current);
      seenMessageIds.current = new Set(entries.slice(SEEN_IDS_TRIM));
    }
    seenMessageIds.current.add(id);
  }, []);

  // FIX: Clear typing state for a peer when they disconnect
  const clearTypingForPeer = useCallback((peerId) => {
    const name = peerIdentityMap.current.get(peerId);
    if (!name) return;
    // Clear any auto-clear timer for this user
    if (typingPeerTimers.current[name]) {
      clearTimeout(typingPeerTimers.current[name]);
      delete typingPeerTimers.current[name];
    }
    setTypingUsers((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleIncomingData = useCallback(
    (data, sourceConn) => {
      if (trackerRef.current) {
        trackerRef.current.recordRemoteActivity();
      }

      // HANDSHAKE — register direct peer identity only (no relay)
      if (data.type === 'handshake') {
        const peerId = sourceConn?.peer;
        if (peerId && data.senderName) {
          if (!peerIdentityMap.current.has(peerId)) {
            peerIdentityMap.current.set(peerId, data.senderName);
          }
        }
        return; // Never relay handshakes
      }

      // IDENTITY VERIFICATION — drop spoofed senderNames
      if (data.senderName && sourceConn) {
        const peerId = sourceConn.peer;
        const registeredName = peerIdentityMap.current.get(peerId);
        if (registeredName && registeredName !== data.senderName) {
          console.warn(
            `[LinkChat] Spoof blocked from ${peerId}: ` +
            `claimed "${data.senderName}", registered "${registeredName}"`
          );
          return;
        }
      }

      // PRESENCE
      if (data.type === 'presence') {
        if (typeof data.count === 'number') {
          const localCount = connectionsRef.current.filter((c) => c && c.open).length + 1;
          setOnlineCount(data.count > localCount ? data.count : localCount);
        }
        floodBroadcast(data, sourceConn);
        return;
      }

      // TYPING
      if (data.type === 'typing') {
        const who = data.senderName || 'Partner';
        setTypingUsers((prev) => ({ ...prev, [who]: Boolean(data.isTyping) }));

        // FIX: Auto-clear typing indicator after 4s in case the stop signal
        // never arrives (e.g. peer disconnects mid-typing)
        if (data.isTyping) {
          if (typingPeerTimers.current[who]) {
            clearTimeout(typingPeerTimers.current[who]);
          }
          typingPeerTimers.current[who] = setTimeout(() => {
            setTypingUsers((prev) => {
              if (!prev[who]) return prev;
              const next = { ...prev };
              delete next[who];
              return next;
            });
            delete typingPeerTimers.current[who];
          }, 4000);
        } else {
          if (typingPeerTimers.current[who]) {
            clearTimeout(typingPeerTimers.current[who]);
            delete typingPeerTimers.current[who];
          }
        }

        floodBroadcast(data, sourceConn);
        return;
      }

      // DEDUPLICATION
      if (data.id && seenMessageIds.current.has(data.id)) return;
      if (data.id) trackMessageId(data.id);

      floodBroadcast(data, sourceConn);

      if (data.type === 'text') {
        // Clear typing when message arrives
        if (data.senderName) {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.senderName];
            return next;
          });
          if (typingPeerTimers.current[data.senderName]) {
            clearTimeout(typingPeerTimers.current[data.senderName]);
            delete typingPeerTimers.current[data.senderName];
          }
        }
        addMessage({
          id: data.id || generateMsgId('rx'),
          type: 'text',
          content: data.content,
          senderName: data.senderName || 'Partner',
          timestamp: data.timestamp,
          sender: 'remote',
        });
      } else if (data.type === 'file') {
        addMessage({
          id: data.id || generateMsgId('rxf'),
          type: 'file',
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          fileData: data.fileData,
          senderName: data.senderName || 'Partner',
          timestamp: data.timestamp,
          sender: 'remote',
        });
      }
    },
    [addMessage, floodBroadcast, trackMessageId]
  );

  const exitRoom = useCallback(() => {
    try {
      sessionStorage.removeItem('linkchat_active_session');
      sessionStorage.removeItem('linkchat_msgs_' + code);
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
    if (onLeave) {
      onLeave();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [onLeave, code]);

  useEffect(() => {
    if (isSetupRef.current) return;
    isSetupRef.current = true;

    let destroyed = false;
    const cleanCode = (code || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    function startInactivityTracker() {
      if (trackerRef.current) return;
      const tracker = new InactivityTracker({
        timeout: 60000,
        onTimeout: () => {
          addMessage({
            id: generateMsgId('sys'),
            type: 'system',
            content: '⏰ Chat ended due to 1 minute of mutual inactivity. Session purged.',
            timestamp: new Date().toISOString(),
            sender: 'system',
          });
          cleanup();
          setTimeout(() => exitRoom(), 2500);
        },
        onWarning: (seconds, active) => {
          setInactivityWarning({ active, seconds });
        },
      });
      tracker.start();
      trackerRef.current = tracker;
    }

    function startPresenceBroadcast() {
      if (presenceIntervalRef.current) return;
      presenceIntervalRef.current = setInterval(() => {
        const count = connectionsRef.current.filter((c) => c && c.open).length + 1;
        setOnlineCount(count);
        floodBroadcast({ type: 'presence', count });
      }, 2000);
    }

    function cleanup() {
      // Reset so Strict Mode second mount can re-initialize
      isSetupRef.current = false;

      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // FIX: Clear all stale typing timers on cleanup
      Object.values(typingPeerTimers.current).forEach(clearTimeout);
      typingPeerTimers.current = {};

      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
      connectionsRef.current.forEach((conn) => {
        try { conn.close(); } catch (e) {}
      });
      connectionsRef.current = [];
      peerIdentityMap.current.clear();
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (e) {}
        peerRef.current = null;
      }
    }

    const sendHandshake = (conn) => {
      try {
        conn.send({ type: 'handshake', senderName: username });
      } catch (e) {
        console.error('Handshake send error:', e);
      }
    };

    const attachConnection = (conn) => {
      const onOpen = () => {
        if (destroyed) return;
        if (!connectionsRef.current.includes(conn)) {
          connectionsRef.current.push(conn);
        }
        setConnectionStatus('connected');
        sendHandshake(conn);
        const count = connectionsRef.current.filter((c) => c && c.open).length + 1;
        setOnlineCount(count);
        floodBroadcast({ type: 'presence', count });
        startInactivityTracker();
        startPresenceBroadcast();
      };

      if (conn.open) onOpen();
      else conn.on('open', onOpen);

      conn.on('data', (data) => {
        if (!destroyed) handleIncomingData(data, conn);
      });

      conn.on('close', () => {
        if (destroyed) return;
        // FIX: Clear typing indicator for disconnected peer
        clearTypingForPeer(conn.peer);

        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        peerIdentityMap.current.delete(conn.peer);
        const count = connectionsRef.current.filter((c) => c && c.open).length + 1;
        setOnlineCount(count);
        floodBroadcast({ type: 'presence', count });
        if (connectionsRef.current.length === 0 && mode !== 'public') {
          setConnectionStatus('disconnected');
        }
      });

      conn.on('error', (err) => console.error('Peer connection error:', err));
    };

    async function init() {
      try {
        if (mode === 'public') {
          const publicLobbyId = 'linkchat-public-room-hub-v5';
          let peer;
          try {
            peer = await createPeer(publicLobbyId);
            if (destroyed) { peer.destroy(); return; }
            peerRef.current = peer;
            setConnectionStatus('connected');
            setOnlineCount(1);
            startInactivityTracker();
            startPresenceBroadcast();
            peer.on('connection', (conn) => {
              attachConnection(conn);
              conn.on('open', () => {
                addMessage({
                  id: generateMsgId('sys'),
                  type: 'system',
                  content: '👋 A new user entered the Public Lounge!',
                  timestamp: new Date().toISOString(),
                  sender: 'system',
                });
              });
            });
          } catch (e) {
            const jitter = Math.floor(Math.random() * 800);
            await new Promise((res) => setTimeout(res, 200 + jitter));
            if (destroyed) return;

            const guestId = 'linkchat-guest-' + generateMsgId('g');
            peer = await createPeer(guestId);
            if (destroyed) { peer.destroy(); return; }
            peerRef.current = peer;
            setConnectionStatus('connecting');
            peer.on('connection', (conn) => attachConnection(conn));

            const lobbyConn = await connectToPeer(peer, publicLobbyId);
            if (destroyed) { peer.destroy(); return; }
            attachConnection(lobbyConn);
            startInactivityTracker();
            startPresenceBroadcast();
            addMessage({
              id: generateMsgId('sys'),
              type: 'system',
              content: `🎉 Joined Public Lounge as ${username}`,
              timestamp: new Date().toISOString(),
              sender: 'system',
            });
          }
        } else if (role === 'creator') {
          const peerTargetId = 'linkchat-room-' + cleanCode;
          const peer = await createPeer(peerTargetId);
          if (destroyed) { peer.destroy(); return; }
          peerRef.current = peer;
          setConnectionStatus('waiting');
          // FIX: Start inactivity tracker for creator too — uses local-only
          // idle logic until a peer connects (peerEverConnected flag in tracker)
          startInactivityTracker();
          peer.on('connection', (conn) => {
            attachConnection(conn);
            conn.on('open', () => {
              addMessage({
                id: generateMsgId('sys'),
                type: 'system',
                content: '🎉 Partner joined! Secure connection active.',
                timestamp: new Date().toISOString(),
                sender: 'system',
              });
            });
          });
        } else {
          const peerTargetId = 'linkchat-room-' + cleanCode;
          const peer = await createPeer(null);
          if (destroyed) { peer.destroy(); return; }
          peerRef.current = peer;
          setConnectionStatus('connecting');
          peer.on('connection', (conn) => attachConnection(conn));

          const conn = await connectToPeer(peer, peerTargetId);
          if (destroyed) { peer.destroy(); return; }
          attachConnection(conn);
          addMessage({
            id: generateMsgId('sys'),
            type: 'system',
            content: '🎉 Connected to partner room!',
            timestamp: new Date().toISOString(),
            sender: 'system',
          });
        }
      } catch (err) {
        if (!destroyed) {
          setError(err.message || 'Connection error. Please try again.');
          setConnectionStatus('error');
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [code, role, mode, addMessage, handleIncomingData, floodBroadcast, exitRoom, username, clearTypingForPeer]);

  const recordActivity = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.recordLocalActivity();
    }
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);
    recordActivity();

    if (connectionStatus === 'connected') {
      floodBroadcast({ type: 'typing', isTyping: true, senderName: username });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        floodBroadcast({ type: 'typing', isTyping: false, senderName: username });
      }, 1500);
    }
  };

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // FIX: Guard broadcast — only send if actually connected
    if (connectionStatus === 'connected') {
      floodBroadcast({ type: 'typing', isTyping: false, senderName: username });
    }

    const msgId = generateMsgId('msg');
    trackMessageId(msgId);

    const msg = {
      id: msgId,
      type: 'text',
      content: text,
      senderName: username,
      timestamp: new Date().toISOString(),
    };

    floodBroadcast(msg);
    addMessage({ ...msg, sender: 'local' });
    setInputText('');
    recordActivity();
    // FIX: requestAnimationFrame is more reliable than a magic 10ms timeout —
    // fires after the browser has completed the current render cycle
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputText, username, floodBroadcast, addMessage, recordActivity, trackMessageId]);

  const sendFile = useCallback(async (file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      addMessage({
        id: generateMsgId('sys'),
        type: 'system',
        content: '⚠️ ' + validation.error,
        timestamp: new Date().toISOString(),
        sender: 'system',
      });
      return;
    }
    try {
      const prepared = await prepareFileForSending(file);
      // FIX: Crypto-based file message ID
      const fileMsgId = generateMsgId('file');
      trackMessageId(fileMsgId);
      const msg = {
        id: fileMsgId,
        type: 'file',
        fileName: prepared.name,
        fileSize: prepared.size,
        fileType: prepared.type,
        fileData: prepared.data,
        senderName: username,
        timestamp: new Date().toISOString(),
      };
      floodBroadcast(msg);
      addMessage({ ...msg, sender: 'local' });
      recordActivity();
    } catch (err) {
      addMessage({
        id: generateMsgId('sys'),
        type: 'system',
        content: '❌ Failed to send file: ' + err.message,
        timestamp: new Date().toISOString(),
        sender: 'system',
      });
    }
  }, [floodBroadcast, username, addMessage, recordActivity, trackMessageId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { sendFile(file); e.target.value = ''; }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) sendFile(file);
  };

  // FIX: Unified copy helper with user feedback (was inconsistent between
  // ChatRoom header copy and CodeDisplay copy — now both use same logic)
  const copyToClipboard = useCallback(async (text) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch (e) { /* fall through */ }
    }
    if (!success) {
      const ta = document.createElement('textarea');
      ta.value = text;
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
    return success;
  }, []);

  const handleCopyCode = useCallback(async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [code, copyToClipboard]);

  const activeTypers = Object.keys(typingUsers).filter(
    (user) => typingUsers[user] && user !== username
  );

  let formattedTypingText = '';
  if (activeTypers.length === 1) {
    formattedTypingText = `${activeTypers[0]} is typing`;
  } else if (activeTypers.length === 2) {
    formattedTypingText = `${activeTypers[0]} and ${activeTypers[1]} are typing`;
  } else if (activeTypers.length === 3) {
    formattedTypingText = `${activeTypers[0]}, ${activeTypers[1]} and ${activeTypers[2]} are typing`;
  } else if (activeTypers.length > 3) {
    formattedTypingText = `${activeTypers[0]}, ${activeTypers[1]} and ${activeTypers.length - 2} others are typing`;
  }

  // --- Error screen ---
  if (error && messages.length === 0) {
    return (
      <div className="chat-container">
        <div className="waiting-screen">
          <div className="code-display" style={{ borderColor: '#ef4444' }}>
            <span className="code-label" style={{ color: '#ef4444' }}>⚠️ Notice</span>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginTop: '0.75rem', lineHeight: '1.5' }}>
              {error}
            </p>
            <button onClick={exitRoom} className="btn-primary" style={{ marginTop: '1.25rem', padding: '0.8rem' }}>
              ← Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Waiting for partner ---
  if (connectionStatus === 'waiting' && messages.length === 0 && mode !== 'public') {
    return (
      <div className="chat-container">
        <CodeDisplay code={code} onBack={exitRoom} copyToClipboard={copyToClipboard} />
      </div>
    );
  }

  // --- Connecting screen (joiner) ---
  if (connectionStatus === 'connecting' && messages.length === 0 && role === 'joiner' && mode !== 'public') {
    return (
      <div className="chat-container">
        <div className="waiting-screen">
          <div className="code-display">
            <span className="code-label">Connecting to Room</span>
            <div className="code-value">{code}</div>
            <div className="waiting-pulse">
              <span className="pulse-text">Establishing P2P connection</span>
              <div className="pulse-dots">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
            <button
              onClick={exitRoom}
              className="copy-code-btn"
              style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}
            >
              ← Cancel & Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main chat UI ---
  return (
    <div
      className="chat-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={recordActivity}
      onClick={recordActivity}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📁</span>
            <span className="drag-text">Drop file to send</span>
          </div>
        </div>
      )}

      <header className="chat-header">
        <div className="header-left">
          <button onClick={exitRoom} className="back-btn" title="Leave room">←</button>
          <div className="header-room-info">
            <span className="room-label">{mode === 'public' ? 'Lounge' : 'Room'}</span>
            {/* Copy feedback: use class instead of inline color to avoid
                -webkit-text-fill-color overriding the green on Safari/Chrome */}
            <span
              className={`room-code${codeCopied ? ' room-code-copied' : ''}`}
              onClick={handleCopyCode}
              title={codeCopied ? 'Copied!' : 'Click to copy'}
            >
              {mode === 'public' ? '🌐 Public' : codeCopied ? '✅ Copied' : code}
            </span>
            <span className="username-badge">{username}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'public' && (
            <span className="online-count-badge">👥 {onlineCount} Online</span>
          )}
          <ConnectionStatus status={connectionStatus} />
        </div>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && connectionStatus === 'connected' && (
          <div className="empty-chat">
            <span className="empty-icon">💬</span>
            <p>{mode === 'public' ? 'Public Lounge is live! Say hello to everyone!' : 'No messages yet. Say hello!'}</p>
          </div>
        )}

        {messages.map((msg) =>
          msg.type === 'file' ? (
            <FileMessage key={msg.id} message={msg} isSent={msg.sender === 'local'} />
          ) : (
            <MessageBubble key={msg.id} message={msg} isSent={msg.sender === 'local'} />
          )
        )}

        {activeTypers.length > 0 && (
          <div className="typing-indicator-wrapper">
            <span className="typing-label">{formattedTypingText}</span>
            <div className="typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {inactivityWarning.active && (
        <div className="inactivity-banner">
          <span>⚠️ Chat will end in </span>
          <span className="inactivity-timer">{inactivityWarning.seconds}s</span>
          <span> due to inactivity</span>
        </div>
      )}

      <div className="chat-input-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
        <button
          className="file-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Send file"
          aria-label="Attach file"
        >
          📎
        </button>
        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder={`Type as ${username}...`}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          id="message-input"
          autoComplete="off"
          autoFocus
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim()}
          title="Send"
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
