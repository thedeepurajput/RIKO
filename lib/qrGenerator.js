'use client';

/**
 * Build a QR image URL for an invite. The invite itself is encoded in the
 * query string, so scanning it opens the same app and auto-joins the room.
 */
export function getQRCodeUrl(text) {
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodedText}&bgcolor=12-18-30&color=241-245-249&margin=10`;
}
