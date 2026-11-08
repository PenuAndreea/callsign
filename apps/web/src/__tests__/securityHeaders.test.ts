import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { EMPTY_STYLE_HASH, securityHeaders } from '../securityHeaders';

function cspDirectives(): Map<string, string> {
  const csp = securityHeaders['Content-Security-Policy'] ?? '';
  return new Map(
    csp.split('; ').map((part) => {
      const [name = '', ...values] = part.split(' ');
      return [name, values.join(' ')];
    }),
  );
}

describe('securityHeaders', () => {
  it('sends every header the ZAP baseline scan checks', () => {
    expect(Object.keys(securityHeaders)).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Permissions-Policy',
        'Cross-Origin-Opener-Policy',
        'Cross-Origin-Resource-Policy',
        'Cross-Origin-Embedder-Policy',
      ]),
    );
  });

  it('never allows eval or inline scripts', () => {
    const csp = securityHeaders['Content-Security-Policy'];
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
    expect(cspDirectives().get('script-src')).toBe("'self'");
  });

  it('allows only the empty inline <style> react-native-web inserts', () => {
    const emptyHash = `sha256-${createHash('sha256').update('').digest('base64')}`;
    expect(EMPTY_STYLE_HASH).toBe(emptyHash);
    expect(cspDirectives().get('style-src')).toBe(`'self' '${emptyHash}'`);
  });

  it('loads and connects to its own origin only, and cannot be framed', () => {
    const directives = cspDirectives();
    expect(directives.get('default-src')).toBe("'self'");
    expect(directives.get('connect-src')).toBe("'self'");
    expect(directives.get('object-src')).toBe("'none'");
    expect(directives.get('frame-ancestors')).toBe("'none'");
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
  });
});
