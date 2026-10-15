import { validateEnv } from './validate-env';

const SECRET = 'x'.repeat(32);

const required = {
  MONGODB_URI: 'mongodb://localhost:27017/callsign',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: SECRET,
};

describe('validateEnv', () => {
  it('applies defaults when only the required variables are set', () => {
    expect(validateEnv(required)).toEqual({
      ...required,
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      COOKIE_SECURE: true,
    });
  });

  it('coerces strings from the environment into numbers and booleans', () => {
    const env = validateEnv({
      ...required,
      PORT: '4000',
      JWT_ACCESS_TTL_SECONDS: '60',
      COOKIE_SECURE: 'false',
    });
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(60);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('accepts a mongodb+srv URI', () => {
    const uri = 'mongodb+srv://cluster0.example.net/callsign';
    expect(validateEnv({ ...required, MONGODB_URI: uri }).MONGODB_URI).toBe(uri);
  });

  it('names every missing variable', () => {
    expect(() => validateEnv({})).toThrow(/MONGODB_URI[\s\S]*WEB_ORIGIN[\s\S]*JWT_ACCESS_SECRET/);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => validateEnv({ ...required, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('rejects a non-mongodb URI', () => {
    expect(() => validateEnv({ ...required, MONGODB_URI: 'postgres://localhost/db' })).toThrow(
      /MONGODB_URI/,
    );
  });

  it('rejects an unparseable boolean', () => {
    expect(() => validateEnv({ ...required, COOKIE_SECURE: 'maybe' })).toThrow(/COOKIE_SECURE/);
  });

  it('never prints the values in the error', () => {
    const leaked = 'super-secret-but-too-short';
    let message = '';
    try {
      validateEnv({ ...required, JWT_ACCESS_SECRET: leaked });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/JWT_ACCESS_SECRET/);
    expect(message).not.toContain(leaked);
  });
});
