// Generate a 6-character alphanumeric code starting with 'RI' (e.g. RI8K4M)
// Excludes ambiguous characters: 0, O, 1 (except I in RI prefix)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 characters

export function generateCode() {
  let code = 'RI';
  const USABLE_LIMIT = Math.floor(256 / CHARSET.length) * CHARSET.length; // 248

  while (code.length < 6) {
    const array = new Uint8Array(4);
    if (typeof window !== 'undefined') {
      crypto.getRandomValues(array);
    } else {
      // SSR fallback
      for (let i = 0; i < 4; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    for (let i = 0; i < array.length && code.length < 6; i++) {
      if (array[i] < USABLE_LIMIT) {
        code += CHARSET[array[i] % CHARSET.length];
      }
    }
  }

  return code;
}
