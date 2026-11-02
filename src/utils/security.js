/**
 * Frontend Security & Sanitization Utilities
 */

/**
 * Validates whether a URL has a safe protocol (http, https, or relative path)
 * Prevents XSS via `javascript:`, `data:`, or `vbscript:` URI schemes.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();

  // Block dangerous schemes
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return false;
  }

  // Allow standard web protocols or relative paths
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Returns a sanitized URL safe for anchor hrefs or media src, falling back to a safe placeholder.
 *
 * @param {string} url
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeUrl(url, fallback = '#') {
  if (isSafeUrl(url)) {
    return url.trim();
  }
  return fallback;
}

