'use client';

/**
 * voiceRecorder.js
 * Manages audio recording for P2P Voice Notes with MediaRecorder API.
 */

export class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.startTime = 0;
    this.timerInterval = null;
    this.onProgress = null;
  }

  async start(onProgressCallback) {
    this.onProgress = onProgressCallback;
    this.audioChunks = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access not available in this browser context.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
    ];

    let selectedMimeType = '';
    for (const mime of mimeTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }

    const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);
    this.startTime = Date.now();

    if (this.onProgress) {
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.onProgress(elapsed);
      }, 500);
    }
  }

  async stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.cleanup();
      return null;
    }

    return new Promise((resolve, reject) => {
      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
      const durationSecs = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          this.cleanup();
          resolve({
            audioData: arrayBuffer,
            mimeType,
            duration: durationSecs,
            size: blob.size,
          });
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    this.cleanup();
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
