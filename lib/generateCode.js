// Generate a 6-character alphanumeric code
// Excludes ambiguous characters: 0, O, I, L, 1
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 characters

export function generateCode() {
  let code = '';
  // FIX: Use rejection sampling to eliminate modulo bias.
  // 256 / 31 = 8.258 — not evenly divisible, so naive modulo makes first
  // 8 characters slightly more probable. Rejection sampling discards any
  // byte >= floor(256/31)*31 = 248, ensuring uniform distribution.
  const USABLE_LIMIT = Math.floor(256 / CHARSET.length) * CHARSET.length; // 248

  while (code.length < 6) {
    const array = new Uint8Array(6);
    if (typeof window !== 'undefined') {
      crypto.getRandomValues(array);
    } else {
      // SSR fallback — not used in browser, just for safety
      for (let i = 0; i < 6; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < array.length && code.length < 6; i++) {
      if (array[i] < USABLE_LIMIT) {
        code += CHARSET[array[i] % CHARSET.length];
      }
      // Discard bytes >= 248 to avoid bias
    }
  }

  return code;
}
