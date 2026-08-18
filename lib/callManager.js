'use client';

/**
 * callManager.js
 * Manages WebRTC audio/video/screen-share calls using PeerJS's MediaConnection API.
 * Works on top of the existing DataConnection in peer.js — no new signaling server needed.
 *
 * Flow:
 *   Caller  → callPeer(peer, remoteId, stream)  → sends 'call-signal' via DataConnection
 *   Callee  → peer.on('call', ...) fires automatically (PeerJS handles signaling)
 *   Both    → on stream, attach to <video> elements
 */

/**
 * Get local media stream.
 * @param {'audio'|'video'|'screen'} type
 * @returns {Promise<MediaStream>}
 */
export async function getLocalStream(type) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera/Microphone access requires HTTPS or localhost. If you are testing on mobile over Wi-Fi, please use HTTPS (e.g. Vercel deployment) or enable insecure origins in browser flags.');
  }

  if (type === 'screen') {
    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported on this mobile device/browser.');
    }
    // Screen share — audio: true captures system audio where supported
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true,
    });
    return stream;
  }

  const constraints =
    type === 'audio'
      ? { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }
      : {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user',
          },
        };

  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Initiate a call to a remote peer.
 * @param {Peer}        peer      - Your local PeerJS Peer instance
 * @param {string}      remoteId  - Remote peer's ID (same one used in DataConnection)
 * @param {MediaStream} stream    - Your local MediaStream
 * @param {{ type: string }} metadata - { type: 'audio' | 'video' | 'screen' }
 * @returns {MediaConnection}
 */
export function callPeer(peer, remoteId, stream, metadata) {
  return peer.call(remoteId, stream, { metadata });
}

/**
 * Answer an incoming call.
 * @param {MediaConnection} call   - Incoming PeerJS MediaConnection
 * @param {MediaStream}     stream - Your local MediaStream to send back
 */
export function answerCall(call, stream) {
  call.answer(stream);
}

/**
 * Stop all tracks in a stream and close the MediaConnection.
 * @param {MediaStream|null}     stream - Local stream to stop
 * @param {MediaConnection|null} call   - Active PeerJS call to close
 */
export function endCall(stream, call) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (call) {
    try { call.close(); } catch (e) {}
  }
}

/**
 * Toggle a specific track type on/off.
 * @param {MediaStream} stream
 * @param {'audio'|'video'} trackType
 * @param {boolean} enabled
 */
export function setTrackEnabled(stream, trackType, enabled) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    if (track.kind === trackType) track.enabled = enabled;
  });
}

/**
 * Replace the video track in an active call (for screen share toggle).
 * Uses RTCPeerConnection's replaceTrack under the hood via PeerJS.
 * @param {MediaConnection} call         - Active PeerJS MediaConnection
 * @param {MediaStreamTrack} newTrack    - New video/screen track
 * @param {MediaStreamTrack} oldTrack    - Old track being replaced
 */
export async function replaceVideoTrack(call, newTrack, oldTrack) {
  if (!call?.peerConnection) return;
  const sender = call.peerConnection
    .getSenders()
    .find((s) => s.track?.kind === 'video' || s.track === oldTrack);
  if (sender) {
    await sender.replaceTrack(newTrack);
  }
}

/**
 * Request Picture-in-Picture for a video element.
 * @param {HTMLVideoElement} videoEl
 */
export async function enterPiP(videoEl) {
  if (!videoEl) return;
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else if (document.pictureInPictureEnabled) {
    await videoEl.requestPictureInPicture();
  }
}
