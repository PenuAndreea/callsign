/**
 * HTTP security headers for the web app. `vite preview` serves them (`vite.config.ts`), and the CI
 * ZAP scan checks them there; a production host must send the same list, plus HSTS over TLS.
 * Not used by the dev server: React Refresh injects an inline script and Vite's HMR opens its
 * own socket, which this CSP blocks.
 *
 * Everything the app loads is self-hosted (bundle, CSS, fonts, favicon), so every source is 'self'.
 * Rationale per header: docs/security.md (A02).
 */
/** SHA-256 of the empty string, base64: the empty <style> element react-native-web inserts. */
export const EMPTY_STYLE_HASH = 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

const contentSecurityPolicy: Record<string, string> = {
  'default-src': "'self'",
  'script-src': "'self'",
  // react-native-web inserts an empty <style> element, then fills it through insertRule (CSSOM,
  // which CSP does not block). Inserting the element counts as inline style, so its hash, that of
  // the empty string, is allowed: no other inline <style> can match it, unlike 'unsafe-inline'.
  'style-src': `'self' '${EMPTY_STYLE_HASH}'`,
  'font-src': "'self'",
  'img-src': "'self'",
  // REST (/api) and the Socket.IO WebSocket, both on the app's own origin.
  'connect-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
};

export const securityHeaders: Readonly<Record<string, string>> = {
  'Content-Security-Policy': Object.entries(contentSecurityPolicy)
    .map(([directive, value]) => `${directive} ${value}`)
    .join('; '),
  // Clickjacking, for browsers without CSP `frame-ancestors`.
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  // The app uses none of these browser features.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  // Cross-origin isolation: safe because nothing is loaded from another origin.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};
