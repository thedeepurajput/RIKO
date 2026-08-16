'use client';

import { useState, useEffect } from 'react';
import { getFileIcon, getFileColor, formatFileSize, createDownloadUrl, createPreviewUrl } from '@/lib/fileTransfer';

// FIX: Removed per-message scrollIntoView — ChatRoom handles scrolling centrally.
// FIX: Capture URL refs in effect locals so cleanup always revokes the correct URLs.

export default function FileMessage({ message, isSent }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    // FIX: fileData may be null for session-restored messages (ArrayBuffer lost in JSON).
    // In that case, skip URL creation entirely — shows file card without download button.
    if (!message.fileData) return;

    const dUrl = createDownloadUrl(message.fileData, message.fileType);
    const pUrl = createPreviewUrl(message.fileData, message.fileType);

    setDownloadUrl(dUrl);
    setPreviewError(false);
    setPreviewUrl(pUrl || null);

    return () => {
      // Always revoke both — captured in closure, no intermediate leak
      URL.revokeObjectURL(dUrl);
      if (pUrl) URL.revokeObjectURL(pUrl);
    };
  }, [message.fileData, message.fileType]);

  // FIX: Guard against invalid/missing timestamp
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
        <div className="file-card">
          <div className="file-icon" style={{ background: getFileColor(message.fileType) }}>
            {getFileIcon(message.fileType)}
          </div>
          <div className="file-info">
            <span className="file-name" title={message.fileName}>{message.fileName}</span>
            <span className="file-size">{formatFileSize(message.fileSize)}</span>
          </div>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={message.fileName}
              className="file-download-btn"
              title="Download file"
              aria-label={`Download ${message.fileName}`}
            >
              ⬇️
            </a>
          ) : (
            // FIX: Session-restored file — data lost, show disabled state
            <span className="file-download-btn file-download-unavailable" title="File data not available after page refresh">
              ⚠️
            </span>
          )}
        </div>

        {previewUrl && !previewError && (
          <img
            src={previewUrl}
            alt={message.fileName}
            className="file-preview"
            onError={() => setPreviewError(true)}
          />
        )}

        {previewUrl && previewError && (
          <div className="file-preview-error">🖼️ Preview unavailable</div>
        )}

        {time && <span className="message-time">{time}</span>}
      </div>
    </div>
  );
}
