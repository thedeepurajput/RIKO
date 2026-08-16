'use client';

import { useEffect, useState } from 'react';

export default function SecurityGuard() {
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 1. Block Context Menu on Desktop
    const handleContextMenu = (e) => {
      if (!isTouchDevice) {
        e.preventDefault();
        return false;
      }
    };

    // 2. Block DevTools, Print & Screen Capture Shortcuts
    const handleKeyDown = (e) => {
      // F12 or Inspect (Ctrl+Shift+I/J/C) or View Source (Ctrl+U)
      if (
        e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Print / Save PDF (Ctrl + P)
      if (e.ctrlKey && (e.keyCode === 80 || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Intercept PrintScreen (PrtScn)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        setIsProtected(true);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
        setTimeout(() => setIsProtected(false), 2000);
      }
    };

    // 3. Anti-Snipping Tool: Screen Blackout on Window Blur / App Switch
    const handleBlur = () => {
      setIsProtected(true);
    };

    const handleFocus = () => {
      setIsProtected(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsProtected(true);
      } else {
        setIsProtected(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isProtected) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#080b14',
        backdropFilter: 'blur(30px)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: 'sans-serif',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.5rem' }}>
        Privacy Shield Active
      </div>
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Screen capture and background viewing are restricted.
      </div>
    </div>
  );
}