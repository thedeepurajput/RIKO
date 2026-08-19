// RIKO — Mobile Haptic Feedback Engine using Web Vibration API

export function triggerHaptic(type = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) {
    return false;
  }

  try {
    switch (type) {
      case 'light': // Button click, code copied, UI tap
        navigator.vibrate(12);
        break;

      case 'medium': // Mic button press, modal open
        navigator.vibrate(30);
        break;

      case 'success': // Message sent, voice note dispatched
        navigator.vibrate([15, 35, 25]);
        break;

      case 'incoming': // Message received
        navigator.vibrate([20, 50, 20]);
        break;

      case 'ringtone': // Incoming call pulse
        navigator.vibrate([200, 100, 200, 100, 400]);
        break;

      case 'warning': // Error, call end, disconnect
        navigator.vibrate([40, 60, 40]);
        break;

      default:
        navigator.vibrate(15);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function stopHaptic() {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}
