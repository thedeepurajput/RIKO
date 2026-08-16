'use client';

export default function MessageBubble({ message, isSent }) {
  if (message.type === 'system') {
    return (
      <div className="system-message">
        {message.content}
      </div>
    );
  }

  // FIX: Guard against invalid/missing timestamp — was showing "Invalid Date"
  const tsDate = message.timestamp ? new Date(message.timestamp) : null;
  const time =
    tsDate && !isNaN(tsDate.getTime())
      ? tsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <span className="message-sender-label">
          {message.senderName || 'Partner'}
        </span>
      )}
      <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
        <p className="message-text">{message.content}</p>
        {time && <span className="message-time">{time}</span>}
      </div>
    </div>
  );
}
