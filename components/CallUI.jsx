'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  endCall,
  setTrackEnabled,
  replaceVideoTrack,
  getLocalStream,
  enterPiP,
} from '@/lib/callManager';

/**
 * CallUI — Floating call overlay.
 *
 * Props:
 *   callState    : 'idle' | 'incoming' | 'outgoing' | 'active'
 *   callType     : 'audio' | 'video' | 'screen'
 *   remoteStream : MediaStream | null  (remote peer's audio/video)
 *   localStream  : MediaStream | null  (your camera/mic)
 *   callerName   : string              (remote user's display name)
 *   activeCall   : MediaConnection | null
 *   onAccept     : () => void
 *   onReject     : () => void
 *   onHangUp     : () => void
 *   onLocalStreamChange : (newStream) => void  (needed for screen-share swap)
 */
export default function CallUI({
  callState,
  callType,
  remoteStream,
  localStream,
  callerName,
  activeCall,
  onAccept,
  onReject,
  onHangUp,
  onLocalStreamChange,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [pipSupported] = useState(() => typeof document !== 'undefined' && !!document?.pictureInPictureEnabled);
  const [screenShareSupported] = useState(() => typeof navigator !== 'undefined' && !!navigator?.mediaDevices?.getDisplayMedia);

  // Drag state for repositioning the overlay
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  // ── Attach streams to <video> elements ──────────────────────────────────
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Call duration timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== 'active') { setCallDuration(0); return; }
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // ── Reset controls when call ends ───────────────────────────────────────
  useEffect(() => {
    if (callState === 'idle') {
      setIsMuted(false);
      setIsCamOff(false);
      setIsSharing(false);
      setIsMinimized(false);
    }
  }, [callState]);

  // ── Drag handlers (mouse & touch) ────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    e.preventDefault();
  }, [pos]);

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      const touch = e.touches[0];
      dragStart.current = { mx: touch.clientX, my: touch.clientY, ox: pos.x, oy: pos.y };
    }
  }, [pos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStart.current.mx;
      const dy = clientY - dragStart.current.my;
      setPos({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
    };
    const onUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, []);

  // ── Control handlers ─────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const next = !isMuted;
    setTrackEnabled(localStream, 'audio', !next);
    setIsMuted(next);
  }, [localStream, isMuted]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const next = !isCamOff;
    setTrackEnabled(localStream, 'video', !next);
    setIsCamOff(next);
  }, [localStream, isCamOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!activeCall) return;
    try {
      if (!isSharing) {
        // Start screen share
        const screenStream = await getLocalStream('screen');
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in the ongoing call
        if (localStream) {
          const camTrack = localStream.getVideoTracks()[0];
          await replaceVideoTrack(activeCall, screenTrack, camTrack);
        }

        // Update local preview
        const newStream = new MediaStream([
          ...(localStream?.getAudioTracks() || []),
          screenTrack,
        ]);

        // When user stops screen share via browser's native stop button
        screenTrack.onended = () => {
          setIsSharing(false);
          // Swap back to camera
          toggleScreenShare();
        };

        onLocalStreamChange?.(newStream);
        setIsSharing(true);
      } else {
        // Stop screen share → revert to camera
        const camStream = await getLocalStream('video');
        const camTrack = camStream.getVideoTracks()[0];
        const oldScreenTrack = localStream?.getVideoTracks()[0];

        await replaceVideoTrack(activeCall, camTrack, oldScreenTrack);
        if (oldScreenTrack) oldScreenTrack.stop();

        const newStream = new MediaStream([
          ...(localStream?.getAudioTracks() || []),
          camTrack,
        ]);
        onLocalStreamChange?.(newStream);
        setIsSharing(false);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [isSharing, activeCall, localStream, onLocalStreamChange]);

  const handlePiP = useCallback(async () => {
    if (remoteVideoRef.current) {
      await enterPiP(remoteVideoRef.current);
    }
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isVideo = callType === 'video' || callType === 'screen';

  // ── Nothing to show ──────────────────────────────────────────────────────
  if (callState === 'idle') return null;

  // ── Incoming call banner ─────────────────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="call-incoming-banner" role="dialog" aria-label="Incoming call">
        <div className="call-incoming-avatar">
          {callType === 'video' ? '📹' : '📞'}
        </div>
        <div className="call-incoming-info">
          <p className="call-incoming-name">{callerName}</p>
          <p className="call-incoming-label">
            Incoming {callType === 'video' ? 'video' : 'audio'} call…
          </p>
        </div>
        <div className="call-incoming-actions">
          <button
            className="call-btn call-btn-reject"
            onClick={onReject}
            aria-label="Reject call"
            title="Reject"
          >
            📵
          </button>
          <button
            className="call-btn call-btn-accept"
            onClick={onAccept}
            aria-label="Accept call"
            title="Accept"
          >
            📞
          </button>
        </div>
      </div>
    );
  }

  // ── Outgoing (ringing) ───────────────────────────────────────────────────
  if (callState === 'outgoing') {
    return (
      <div className="call-overlay call-overlay-ringing">
        <div className="call-ringing-icon">{callType === 'video' ? '📹' : '📞'}</div>
        <p className="call-ringing-name">{callerName}</p>
        <p className="call-ringing-label">Calling…</p>
        <div className="call-ringing-pulse">
          <span /><span /><span />
        </div>
        <button className="call-btn call-btn-reject call-btn-large" onClick={onHangUp}>
          End
        </button>
      </div>
    );
  }

  // ── Active call ──────────────────────────────────────────────────────────
  return (
    <div
      className={`call-overlay call-overlay-active${isMinimized ? ' call-minimized' : ''}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      role="dialog"
      aria-label="Active call"
    >
      {/* Drag handle */}
      <div
        className="call-drag-handle"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        title="Drag to reposition"
      >
        <span className="call-timer">{formatDuration(callDuration)}</span>
        <span className="call-status-label">
          {isSharing ? '🖥️ Sharing screen' : callType === 'video' ? '📹 Video call' : '📞 Voice call'}
        </span>
        <button
          className="call-minimize-btn"
          onClick={() => setIsMinimized((v) => !v)}
          aria-label={isMinimized ? 'Expand call' : 'Minimize call'}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? '⬆' : '⬇'}
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Remote video / avatar */}
          <div className="call-video-area">
            {isVideo ? (
              <video
                ref={remoteVideoRef}
                className="call-video-remote"
                autoPlay
                playsInline
              />
            ) : (
              <div className="call-audio-avatar">
                <span>{callerName?.[0]?.toUpperCase() || '?'}</span>
              </div>
            )}

            {/* Local pip preview (only for video calls) */}
            {isVideo && localStream && (
              <video
                ref={localVideoRef}
                className="call-video-local"
                autoPlay
                playsInline
                muted
              />
            )}
          </div>

          {/* Controls */}
          <div className="call-controls">
            <button
              className={`call-ctrl-btn${isMuted ? ' active' : ''}`}
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎙️'}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {isVideo && (
              <button
                className={`call-ctrl-btn${isCamOff ? ' active' : ''}`}
                onClick={toggleCamera}
                aria-label={isCamOff ? 'Camera on' : 'Camera off'}
                title={isCamOff ? 'Camera on' : 'Camera off'}
              >
                {isCamOff ? '📷' : '📸'}
                <span>{isCamOff ? 'Cam on' : 'Cam off'}</span>
              </button>
            )}

            {isVideo && screenShareSupported && (
              <button
                className={`call-ctrl-btn${isSharing ? ' active' : ''}`}
                onClick={toggleScreenShare}
                aria-label={isSharing ? 'Stop sharing' : 'Share screen'}
                title={isSharing ? 'Stop sharing' : 'Share screen'}
              >
                🖥️
                <span>{isSharing ? 'Stop share' : 'Share'}</span>
              </button>
            )}

            {isVideo && pipSupported && (
              <button
                className="call-ctrl-btn"
                onClick={handlePiP}
                aria-label="Picture in Picture"
                title="Picture in Picture"
              >
                📺
                <span>PiP</span>
              </button>
            )}

            <button
              className="call-ctrl-btn call-ctrl-end"
              onClick={onHangUp}
              aria-label="End call"
              title="End call"
            >
              📵
              <span>End</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
