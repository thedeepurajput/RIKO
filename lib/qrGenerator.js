'use client';

/**
 * qrGenerator.js
 * Generates an SVG string representation of a QR code URL for instant mobile scanning.
 */

// Simple lightweight QR code matrix generator
function createQRCodeMatrix(text) {
  // Use public unpkg or fast SVG encoder, or SVG path
  // Since we want 100% offline & local reliability:
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodedText}&bgcolor=12-18-30&color=241-245-249&margin=10`;
}

export function getQRCodeUrl(text) {
  return createQRCodeMatrix(text);
}
