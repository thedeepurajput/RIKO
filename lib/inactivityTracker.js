export class InactivityTracker {
  constructor({ timeout = 60000, onTimeout, onWarning }) {
    this.timeout = timeout;
    this.warningThreshold = timeout - 15000;
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;
    this.localLastActivity = Date.now();
    this.remoteLastActivity = Date.now();
    this.peerEverConnected = false;
    this.checkInterval = null;
    this.isWarning = false;
    this.remainingSeconds = 0;
  }

  start() {
    this.stop();
    this.localLastActivity = Date.now();
    this.remoteLastActivity = Date.now();
    this.isWarning = false;

    this.checkInterval = setInterval(() => {
      const now = Date.now();
      const localIdle = now - this.localLastActivity;
      const remoteIdle = now - this.remoteLastActivity;

      // Waiting creators are not subject to the normal chat inactivity timer.
      if (!this.peerEverConnected) return;

      const idleTime = Math.min(localIdle, remoteIdle);
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
    this.peerEverConnected = false;
    this.isWarning = false;
    this.remainingSeconds = 0;
    this.onTimeout = null;
    this.onWarning = null;
  }
}
