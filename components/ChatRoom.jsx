'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPeer, connectToPeer } from '@/lib/peer';
import { InactivityTracker } from '@/lib/inactivityTracker';
import { validateFile, prepareFileForSending } from '@/lib/fileTransfer';
import { getLocalStream, callPeer, answerCall, endCall } from '@/lib/callManager';
import { VoiceRecorder } from '@/lib/voiceRecorder';
import { triggerHaptic, stopHaptic } from '@/lib/haptics';
import {
  playMessageReceivedSound,
  playMessageSentSound,
  startIncomingCallRingtone,
  stopRingtone,
  playCallEndSound,
  playWarningTick,
  setSoundMuted,
  isSoundMuted,
} from '@/lib/soundEffects';
import MessageBubble from './MessageBubble';
import FileMessage from './FileMessage';
import VoiceMessage from './VoiceMessage';
import ConnectionStatus from './ConnectionStatus';
import CodeDisplay from './CodeDisplay';
import CallUI from './CallUI';
import QRCodeModal from './QRCodeModal';

const SEEN_IDS_MAX = 500;
const SEEN_IDS_TRIM = 100;

function generateMsgId(prefix) {
  const arr = new Uint32Array(2);
  crypto.getRandomValues(arr);
  return `${prefix}_${Date.now()}_${arr[0].toString(36)}${arr[1].toString(36)}`;
}

export default function ChatRoom({ code, role, mode, username, onLeave }) {
  const [messages, setMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem('riko_msgs_' + code);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      return parsed.map((msg) =>
        msg.type === 'file' || msg.type === 'voice' ? { ...msg, fileData: null, audioData: null } : msg
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
  const [codeCopied, setCodeCopied] = useState(false);
  const [isMutedSound, setIsMutedSound] = useState(isSoundMuted());
  const [showQRModal, setShowQRModal] = useState(false);

  // ── Voice recording state ────────────────────────────────────────────────
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordDuration, setVoiceRecordDuration] = useState(0);
  const voiceRecorderRef = useRef(null);

  // ── Call state ───────────────────────────────────────────────────────────
  const [callState, setCallState] = useState('idle');   // 'idle'|'incoming'|'outgoing'|'active'
  const [callType, setCallType] = useState('audio');    // 'audio'|'video'|'screen'
  const [callerName, setCallerName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const activeCallRef = useRef(null);
  const pendingCallRef = useRef(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
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
  const typingPeerTimers = useRef({});
  const isSetupRef = useRef(false);

  // FIX: Store attachCallListener in a ref so the peer-setup useEffect can
  // call it without needing it in its dependency array — avoids the
  // "Cannot access before initialization" ReferenceError that happens when
  // a useCallback const is referenced in an earlier useEffect closure.
  const attachCallListenerRef = useRef(null);

  // ── Simple effects ───────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    try {
      const serializable = messages.map((msg) =>
        msg.type === 'file' || msg.type === 'voice' ? { ...msg, fileData: null, audioData: null } : msg
      );
      sessionStorage.setItem('riko_msgs_' + code, JSON.stringify(serializable));
    } catch (e) {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, code]);

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

  // ── Core callbacks ───────────────────────────────────────────────────────

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

  const clearTypingForPeer = useCallback((peerId) => {
    const name = peerIdentityMap.current.get(peerId);
    if (!name) return;
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
      if (trackerRef.current) trackerRef.current.recordRemoteActivity();

      if (data.type === 'handshake') {
        const peerId = sourceConn?.peer;
        if (peerId && data.senderName) {
          if (!peerIdentityMap.current.has(peerId)) {
            peerIdentityMap.current.set(peerId, data.senderName);
          }
        }
        return;
      }

      if (data.senderName && sourceConn) {
        const peerId = sourceConn.peer;
        const registeredName = peerIdentityMap.current.get(peerId);
        if (registeredName && registeredName !== data.senderName) {
          console.warn(`[RIKO] Spoof blocked from ${peerId}: claimed "${data.senderName}", registered "${registeredName}"`);
          return;
        }
      }

      if (data.type === 'presence') {
        if (typeof data.count === 'number') {
          const localCount = connectionsRef.current.filter((c) => c && c.open).length + 1;
          setOnlineCount(data.count > localCount ? data.count : localCount);
        }
        floodBroadcast(data, sourceConn);
        return;
      }

      if (data.type === 'typing') {
        const who = data.senderName || 'Partner';
        setTypingUsers((prev) => ({ ...prev, [who]: Boolean(data.isTyping) }));
        if (data.isTyping) {
          if (typingPeerTimers.current[who]) clearTimeout(typingPeerTimers.current[who]);
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

      if (data.id && seenMessageIds.current.has(data.id)) return;
      if (data.id) trackMessageId(data.id);

      floodBroadcast(data, sourceConn);

      if (data.type === 'text') {
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
        playMessageReceivedSound();
        triggerHaptic('incoming');
        addMessage({
          id: data.id || generateMsgId('rx'),
          type: 'text',
          content: data.content,
          senderName: data.senderName || 'Partner',
          timestamp: data.timestamp,
          sender: 'remote',
        });
      } else if (data.type === 'file') {
        playMessageReceivedSound();
        triggerHaptic('incoming');
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
      } else if (data.type === 'voice') {
        playMessageReceivedSound();
        triggerHaptic('incoming');
        addMessage({
          id: data.id || generateMsgId('rxv'),
          type: 'voice',
          audioData: data.audioData,
          duration: data.duration,
          mimeType: data.mimeType,
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
      sessionStorage.removeItem('riko_active_session');
      sessionStorage.removeItem('riko_msgs_' + code);
    } catch (e) {}
    if (typeof window !== 'undefined') window.history.replaceState({}, '', '/');
    if (onLeave) {
      onLeave();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [onLeave, code]);

  // ── Call helpers ─────────────────────────────────────────────────────────

  const cleanupCall = useCallback((callToClose) => {
    stopRingtone();
    stopHaptic();
    playCallEndSound();
    triggerHaptic('warning');
    endCall(localStream, callToClose || activeCallRef.current);
    activeCallRef.current = null;
    pendingCallRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCallerName('');
  }, [localStream]);

  // Keep a stable ref so the peer-setup useEffect (below) can always call
  // the latest version without it being a dependency.
  useEffect(() => {
    attachCallListenerRef.current = (peer) => {
      peer.on('call', (call) => {
        const remoteId = call.peer;
        const remoteName =
          peerIdentityMap.current.get(remoteId) ||
          call.metadata?.callerName ||
          'Partner';
        const type = call.metadata?.type || 'audio';

        pendingCallRef.current = call;
        setCallerName(remoteName);
        setCallType(type);
        setCallState('incoming');
        startIncomingCallRingtone();
        triggerHaptic('ringtone');

        call.on('close', () => cleanupCall(call));
        call.on('error', (err) => {
          console.error('Incoming call error:', err);
          cleanupCall(call);
        });
      });
    };
  }, [cleanupCall]);

  const startCall = useCallback(async (type) => {
    const openConns = connectionsRef.current.filter((c) => c && c.open);
    if (openConns.length === 0) return;
    try {
      const stream = await getLocalStream(type === 'screen' ? 'screen' : type);
      setLocalStream(stream);
      setCallType(type);
      setCallState('outgoing');

      const remoteId = openConns[0].peer;
      const remoteName = peerIdentityMap.current.get(remoteId) || 'Partner';
      setCallerName(remoteName);

      const call = callPeer(peerRef.current, remoteId, stream, { type, callerName: username });
      activeCallRef.current = call;

      call.on('stream', (remStream) => {
        setRemoteStream(remStream);
        setCallState('active');
      });
      call.on('close', () => cleanupCall(call));
      call.on('error', (err) => {
        console.error('Call error:', err);
        cleanupCall(call);
      });
    } catch (err) {
      console.error('Start call error:', err);
      setCallState('idle');
      addMessage({
        id: generateMsgId('sys_call_err'),
        type: 'system',
        content: `⚠️ Call failed: ${err.message || 'Camera/Microphone permission denied.'}`,
        timestamp: new Date().toISOString(),
        sender: 'system',
      });
    }
  }, [username, cleanupCall, addMessage]);

  const handleAcceptCall = useCallback(async () => {
    const call = pendingCallRef.current;
    if (!call) return;
    stopRingtone();
    stopHaptic();
    try {
      const stream = await getLocalStream(callType === 'screen' ? 'video' : callType);
      setLocalStream(stream);
      answerCall(call, stream);
      activeCallRef.current = call;
      call.on('stream', (remStream) => {
        setRemoteStream(remStream);
        setCallState('active');
      });
    } catch (err) {
      console.error('Accept call error:', err);
      cleanupCall(call);
      addMessage({
        id: generateMsgId('sys_call_err'),
        type: 'system',
        content: `⚠️ Could not answer call: ${err.message || 'Camera/Microphone permission denied.'}`,
        timestamp: new Date().toISOString(),
        sender: 'system',
      });
    }
  }, [callType, cleanupCall, addMessage]);

  const handleRejectCall = useCallback(() => {
    stopRingtone();
    stopHaptic();
    playCallEndSound();
    triggerHaptic('warning');
    const call = pendingCallRef.current;
    if (call) { try { call.close(); } catch (e) {} }
    pendingCallRef.current = null;
    setCallState('idle');
  }, []);

  const handleHangUp = useCallback(() => {
    cleanupCall(activeCallRef.current);
  }, [cleanupCall]);

  // ── Peer setup useEffect ─────────────────────────────────────────────────

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
      isSetupRef.current = false;
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      Object.values(typingPeerTimers.current).forEach(clearTimeout);
      typingPeerTimers.current = {};
      if (trackerRef.current) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
      if (activeCallRef.current) {
        try { activeCallRef.current.close(); } catch (e) {}
        activeCallRef.current = null;
      }
      if (pendingCallRef.current) {
        try { pendingCallRef.current.close(); } catch (e) {}
        pendingCallRef.current = null;
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
      try { conn.send({ type: 'handshake', senderName: username }); }
      catch (e) { console.error('Handshake send error:', e); }
    };

    const attachConnection = (conn) => {
      const onOpen = () => {
        if (destroyed) return;
        if (!connectionsRef.current.includes(conn)) connectionsRef.current.push(conn);
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

    // Use the ref so we always call the latest version without it being
    // a dependency of this effect (avoids re-running the whole setup).
    const attachCallListener = (peer) => {
      attachCallListenerRef.current?.(peer);
    };

    async function init() {
      try {
        if (mode === 'public') {
          const publicLobbyId = 'riko-public-room-hub-v5';
          let peer;
          try {
            peer = await createPeer(publicLobbyId);
            if (destroyed) { peer.destroy(); return; }
            peerRef.current = peer;
            attachCallListener(peer);
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

            const guestId = 'riko-guest-' + generateMsgId('g');
            peer = await createPeer(guestId);
            if (destroyed) { peer.destroy(); return; }
            peerRef.current = peer;
            attachCallListener(peer);
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
          const peerTargetId = 'riko-room-' + cleanCode;
          const peer = await createPeer(peerTargetId);
          if (destroyed) { peer.destroy(); return; }
          peerRef.current = peer;
          attachCallListener(peer);
          setConnectionStatus('waiting');
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
          const peerTargetId = 'riko-room-' + cleanCode;
          const peer = await createPeer(null);
          if (destroyed) { peer.destroy(); return; }
          peerRef.current = peer;
          attachCallListener(peer);
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

  // ── Activity & input handlers ────────────────────────────────────────────

  const recordActivity = useCallback(() => {
    if (trackerRef.current) trackerRef.current.recordLocalActivity();
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
    playMessageSentSound();
    triggerHaptic('success');
    setInputText('');
    recordActivity();
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
      playMessageSentSound();
      triggerHaptic('success');
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

  // ── Voice Recording Handlers ─────────────────────────────────────────────
  const startVoiceRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      await recorder.start((secs) => setVoiceRecordDuration(secs));
      voiceRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setVoiceRecordDuration(0);
      triggerHaptic('medium');
    } catch (err) {
      addMessage({
        id: generateMsgId('sys'),
        type: 'system',
        content: `⚠️ Microphone access failed: ${err.message || 'Permission denied'}`,
        timestamp: new Date().toISOString(),
        sender: 'system',
      });
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.cancel();
      voiceRecorderRef.current = null;
    }
    setIsRecordingVoice(false);
    setVoiceRecordDuration(0);
    triggerHaptic('light');
  };

  const sendVoiceRecording = async () => {
    if (!voiceRecorderRef.current) return;
    try {
      const result = await voiceRecorderRef.current.stop();
      setIsRecordingVoice(false);
      setVoiceRecordDuration(0);
      voiceRecorderRef.current = null;

      if (result && result.audioData) {
        const msgId = generateMsgId('voice');
        trackMessageId(msgId);
        const msg = {
          id: msgId,
          type: 'voice',
          audioData: result.audioData,
          duration: result.duration,
          mimeType: result.mimeType,
          senderName: username,
          timestamp: new Date().toISOString(),
        };
        floodBroadcast(msg);
        addMessage({ ...msg, sender: 'local' });
        playMessageSentSound();
        triggerHaptic('success');
        recordActivity();
      }
    } catch (err) {
      console.error('Failed to send voice recording:', err);
    }
  };

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

  const copyToClipboard = useCallback(async (text) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); success = true; }
      catch (e) { /* fall through */ }
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
      triggerHaptic('light');
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [code, copyToClipboard]);

  // ── Typing display ───────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────

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

  if (connectionStatus === 'waiting' && messages.length === 0 && mode !== 'public') {
    return (
      <div className="chat-container">
        <CodeDisplay code={code} onBack={exitRoom} copyToClipboard={copyToClipboard} />
      </div>
    );
  }

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

      {/* ── QR Code Modal ───────────────────────────────────── */}
      {showQRModal && (
        <QRCodeModal
          code={code}
          onClose={() => setShowQRModal(false)}
          copyToClipboard={copyToClipboard}
        />
      )}

      {/* ── Call UI overlay ───────────────────────────────────── */}
      <CallUI
        callState={callState}
        callType={callType}
        remoteStream={remoteStream}
        localStream={localStream}
        callerName={callerName}
        activeCall={activeCallRef.current}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onHangUp={handleHangUp}
        onLocalStreamChange={setLocalStream}
      />

      <header className="chat-header">
        <div className="header-left">
          <button onClick={exitRoom} className="back-btn" title="Leave room">←</button>
          <div className="header-room-info">
            <span className="room-label">{mode === 'public' ? 'Lounge' : 'Room'}</span>
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
          {/* Sound Mute/Unmute toggle */}
          <button
            className="call-header-btn"
            onClick={() => {
              const next = !isMutedSound;
              setSoundMuted(next);
              setIsMutedSound(next);
            }}
            title={isMutedSound ? 'Unmute audio notifications' : 'Mute audio notifications'}
            aria-label="Toggle sound notifications"
          >
            {isMutedSound ? '🔇' : '🔊'}
          </button>

          {/* QR Code Scan button in private mode */}
          {mode !== 'public' && (
            <button
              className="call-header-btn"
              onClick={() => setShowQRModal(true)}
              title="Scan QR Code to Connect"
              aria-label="Scan room QR code"
            >
              📱
            </button>
          )}

          {/* Call buttons — private mode, connected, no active call */}
          {connectionStatus === 'connected' && mode !== 'public' && callState === 'idle' && (
            <>
              <button
                className="call-header-btn"
                onClick={() => startCall('audio')}
                title="Voice call"
                aria-label="Start voice call"
              >
                📞
              </button>
              <button
                className="call-header-btn"
                onClick={() => startCall('video')}
                title="Video call"
                aria-label="Start video call"
              >
                📹
              </button>
            </>
          )}
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
          ) : msg.type === 'voice' ? (
            <VoiceMessage key={msg.id} message={msg} isSent={msg.sender === 'local'} />
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

        {isRecordingVoice ? (
          <div className="recording-bar">
            <div className="recording-indicator">
              <span className="recording-dot" />
              <span className="recording-time">
                {Math.floor(voiceRecordDuration / 60)}:{(voiceRecordDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="recording-actions">
              <button
                type="button"
                className="recording-cancel-btn"
                onClick={cancelVoiceRecording}
              >
                ✕ Cancel
              </button>
              <button
                type="button"
                className="send-btn"
                onClick={sendVoiceRecording}
                title="Send voice note"
              >
                ➤
              </button>
            </div>
          </div>
        ) : (
          <>
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
            {inputText.trim() ? (
              <button
                className="send-btn"
                onClick={sendMessage}
                title="Send"
                aria-label="Send message"
              >
                ➤
              </button>
            ) : (
              <button
                type="button"
                className="mic-btn"
                onClick={startVoiceRecording}
                title="Tap to record voice note"
                aria-label="Record voice note"
              >
                🎙️
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
