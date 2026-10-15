import type { JwtModuleOptions } from '@nestjs/jwt';

/** Access-token settings, shared by `AuthModule` and the tests. */
export function jwtOptions(secret: string, ttlSeconds: number): JwtModuleOptions {
  return {
    secret,
    signOptions: { algorithm: 'HS256', expiresIn: ttlSeconds },
    // Pin the algorithm on verify too: never let the token's own header pick it
    // (blocks `alg: none` and algorithm-confusion attacks).
    verifyOptions: { algorithms: ['HS256'] },
  };
}
