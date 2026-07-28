/**
 * Fixes Instagram's mangled UTF-8 double-encoded strings in JSON exports
 * (e.g. converting "\u00f0\u009f\u0098\u0080" back into "😀")
 * Safely guards against already-decoded Unicode strings (char codes > 255).
 */
export function decodeIgText(str) {
  if (!str || typeof str !== 'string') return str || '';

  // 1. If string contains Unicode characters > 255 (like Arabic, Emojis, CJK), it is ALREADY decoded!
  if ([...str].some((c) => c.charCodeAt(0) > 255)) {
    return str;
  }

  try {
    const bytes = Uint8Array.from([...str].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder('utf-8').decode(bytes);

    // 2. If decoding created replacement character \uFFFD, fallback to original string
    if (!decoded || decoded.includes('\uFFFD')) {
      return str;
    }

    return decoded;
  } catch (e) {
    return str;
  }
}
