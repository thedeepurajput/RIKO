'use client';

// Keep PeerJS loading lazy so this module remains safe in Next.js client bundles.
export async function loadPeer() {
  const module = await import('peerjs');
  return module.default;
}

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

function getIceServers() {
  const servers = [...DEFAULT_ICE_SERVERS];
  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  if (turnUrls.length) {
    const turnServer = { urls: turnUrls };
    if (process.env.NEXT_PUBLIC_TURN_USERNAME) {
      turnServer.username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    }
    if (process.env.NEXT_PUBLIC_TURN_CREDENTIAL) {
      turnServer.credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    }
    servers.push(turnServer);
  }

  return servers;
}

function getPeerOptions() {
  return {
    debug: 0,
    config: { iceServers: getIceServers() },
  };
}

export async function createPeer(customId) {
  const PeerClass = await loadPeer();
  return new Promise((resolve, reject) => {
    let settled = false;
    const peer = customId
      ? new PeerClass(customId, getPeerOptions())
      : new PeerClass(getPeerOptions());

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { peer.destroy(); } catch (e) {}
      reject(new Error('Connection timed out. Please try again.'));
    }, 30000);

    peer.on('open', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(peer);
    });

    peer.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { peer.destroy(); } catch (e) {}
      if (err.type === 'unavailable-id') {
        reject(new Error('This code is already active. Please generate a new code.'));
      } else if (err.type === 'peer-unavailable') {
        reject(new Error('Room not found. Please make sure the creator is online and code is correct.'));
      } else {
        reject(err);
      }
    });
  });
}

export async function connectToPeer(peer, remoteId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const conn = peer.connect(remoteId, { reliable: true });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { conn.close(); } catch (e) {}
      reject(new Error('Room not found or creator is offline. Please check the code.'));
    }, 30000);

    conn.on('open', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(conn);
    });

    conn.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { conn.close(); } catch (e) {}
      reject(err);
    });
  });
}
