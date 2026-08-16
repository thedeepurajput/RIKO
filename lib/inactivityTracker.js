export class InactivityTracker {
  constructor({ timeout = 60000, onTimeout, onWarning }) {
    this.timeout = timeout;
    // Warn 15 seconds before timeout
    this.warningThreshold = timeout - 15000;
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;
    this.localLastActivity = Date.now();
    this.remoteLastActivity = Date.now();
    // FIX: Track whether a remote peer has EVER connected.
    // If no peer ever joins, we should NOT timeout based on remote idle —
    // that would never fire because remoteLastActivity never updates.
    // Instead, use a separate "peer ever connected" flag.
    this.peerEverConnected = false;
    this.checkInterval = null;
    this.isWarning = false;
    this.remainingSeconds = 0;
  }

  start() {
    this.localLastActivity = Date.now();
    this.remoteLastActivity = Date.now();
    this.isWarning = false;

    this.checkInterval = setInterval(() => {
      const now = Date.now();
      const localIdle = now - this.localLastActivity;
      const remoteIdle = now - this.remoteLastActivity;

      let idleTime;
      if (this.peerEverConnected) {
        // Both peers have been present — use the minimum idle time.
        // Math.min means: timeout fires only when BOTH sides are idle.
        // This is correct "mutual inactivity" behaviour.
        idleTime = Math.min(localIdle, remoteIdle);
      } else {
        // No peer has ever connected (creator waiting alone).
        // Use local idle only — if the creator is idle for 60 s with
        // nobody joining, end the session to free resources.
        idleTime = localIdle;
      }

      if (idleTime >= this.timeout) {
        this.stop();
        if (this.onTimeout) this.onTimeout();
        return;
      }

      if (idleTime >= this.warningThreshold) {
        this.isWarning = true;
        this.remainingSeconds = Math.ceil((this.timeout - idleTime) / 1000);
        if (this.onWarning) this.onWarning(this.remainingSeconds, true);
      } else if (this.isWarning) {
        this.isWarning = false;
        this.remainingSeconds = 0;
        if (this.onWarning) this.onWarning(0, false);
      }
    }, 1000);
  }

  recordLocalActivity() {
    this.localLastActivity = Date.now();
  }

  recordRemoteActivity() {
    // FIX: Mark that a peer has connected at least once
    this.peerEverConnected = true;
    this.remoteLastActivity = Date.now();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  destroy() {
    this.stop();
    // FIX: Reset all state flags on destroy so a re-used instance starts clean
    this.peerEverConnected = false;
    this.isWarning = false;
    this.remainingSeconds = 0;
    this.onTimeout = null;
    this.onWarning = null;
  }
}
