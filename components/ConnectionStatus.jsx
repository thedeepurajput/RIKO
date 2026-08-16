'use client';

// FIX: Replaced CSS variable references (--accent-green etc.) with hardcoded
// hex values — those variables were never defined in globals.css, causing
// colorless/invisible status badges on all connection states.

const STATUS_CONFIG = {
  connected:    { label: 'Connected',            color: '#10b981', dotClass: 'connected' },
  connecting:   { label: 'Connecting...',         color: '#f59e0b', dotClass: 'connecting' },
  waiting:      { label: 'Waiting for partner...', color: '#f59e0b', dotClass: 'connecting' },
  disconnected: { label: 'Disconnected',          color: '#ef4444', dotClass: 'disconnected' },
  error:        { label: 'Error',                 color: '#ef4444', dotClass: 'disconnected' },
};

export default function ConnectionStatus({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  return (
    <div
      className="connection-badge"
      style={{ borderColor: `${config.color}44` }}
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      <span
        className={`status-dot ${config.dotClass}`}
        style={{ background: config.color }}
      />
      <span className="status-label" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}
