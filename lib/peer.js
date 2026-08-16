'use client';

// FIX: loadPeer is now a pure async function — no module-level mutable singleton.
// The previous `let Peer` variable could hold a stale class reference after
// Next.js HMR re-evaluates the module, causing subtle dev-mode bugs.
export async function loadPeer() {
  const module = await import('peerjs');
  return module.default;
}

export async function createPeer(customId) {
  const PeerClass = await loadPeer();
  return new Promise((resolve, reject) => {
    let settled = false; // FIX: Prevent double rejection

    const peer = customId
      ? new PeerClass(customId, {
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
            ],
          },
        })
      : new PeerClass({
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });

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

    // FIX: Store timer reference so it can be cleared on open/error
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { peer.destroy(); } catch (e) {}
      reject(new Error('Connection timed out. Please try again.'));
    }, 15000);
  });
}

export async function connectToPeer(peer, remoteId) {
  return new Promise((resolve, reject) => {
    let settled = false; // FIX: Prevent double rejection
    const conn = peer.connect(remoteId, { reliable: true });

    conn.on('open', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); // FIX: Cancel timeout so it doesn't linger in memory
      resolve(conn);
    });

    conn.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { conn.close(); } catch (e) {}
      reject(err);
    });

    // FIX: Close dangling connection + cancel timer reference properly
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { conn.close(); } catch (e) {}
      reject(new Error('Room not found or creator is offline. Please check the code.'));
    }, 12000);
  });
}
