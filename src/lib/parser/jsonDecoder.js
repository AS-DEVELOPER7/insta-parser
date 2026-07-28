/**
 * Fixes Instagram's mangled UTF-8 double-encoded strings in JSON exports
 * (e.g. converting "\u00f0\u009f\u0098\u0080" back into "😀")
 */
export function decodeIgText(str) {
  if (!str || typeof str !== 'string') return str || '';
  try {
    const bytes = new Uint8Array([...str].map((c) => c.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    return str;
  }
}
