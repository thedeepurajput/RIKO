'use client';

import { useState, useRef, useEffect } from 'react';

export default function VoiceMessage({ message, isSent }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!message.audioData) return;
    const blob = new Blob([message.audioData], { type: message.mimeType || 'audio/webm' });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [message.audioData, message.mimeType]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.error('Audio play error:', e));
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && (!duration || duration === 0)) {
      setDuration(Math.round(audioRef.current.duration) || message.duration || 0);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const tsDate = message.timestamp ? new Date(message.timestamp) : null;
  const time =
    tsDate && !isNaN(tsDate.getTime())
      ? tsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <span className="message-sender-label">
          {message.senderName || 'Partner'}
        </span>
      )}
      <div className={`message-bubble voice-message-bubble ${isSent ? 'sent' : 'received'}`}>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
            preload="metadata"
          />
        )}

        <div className="voice-player">
          <button
            type="button"
            className="voice-play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="voice-body">
            <div className="voice-waveform">
              <div className="waveform-bars">
                {[40, 70, 90, 60, 100, 50, 80, 45, 95, 65, 85, 40].map((h, i) => (
                  <span
                    key={i}
                    className={`bar ${isPlaying ? 'animating' : ''}`}
                    style={{
                      height: `${h}%`,
                      animationDelay: `${(i % 5) * 0.15}s`,
                      backgroundColor: progressPercent >= (i / 12) * 100 ? '#ffffff' : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </div>
              <input
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="voice-scrubber"
                aria-label="Seek voice note"
              />
            </div>
            <div className="voice-meta">
              <span className="voice-duration">
                🎙️ {isPlaying ? formatTime(currentTime) : formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {time && <span className="message-time">{time}</span>}
      </div>
    </div>
  );
}
