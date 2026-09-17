import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedOrigin, readJson, clientIp } from '../api/_lib/http.js';
import communityHandler from '../api/community.js';
import bookingHandler from '../api/booking.js';

const req = (headers = {}, extra = {}) => ({ method: 'POST', headers, socket: {}, ...extra });

function mockRes() {
  const r = { statusCode: null, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('origin check', () => {
  // The bug this guards against: browsers send Origin on same-origin POSTs,
  // and the live site's own forms were refused with 403.
  it('accepts the site posting to itself', () => {
    expect(isAllowedOrigin(req({ origin: 'https://www.zehnspaces.com', host: 'www.zehnspaces.com' }))).toBe(true);
  });

  it('accepts a request with no Origin (not a cross-site browser request)', () => {
    expect(isAllowedOrigin(req({ host: 'www.zehnspaces.com' }))).toBe(true);
  });

  it('refuses another website', () => {
    expect(isAllowedOrigin(req({ origin: 'https://evil.example', host: 'www.zehnspaces.com' }))).toBe(false);
  });

  it('refuses a look-alike host', () => {
    expect(isAllowedOrigin(req({ origin: 'https://www.zehnspaces.com.evil.example', host: 'www.zehnspaces.com' }))).toBe(false);
  });

  it('refuses plain http for the same host', () => {
    expect(isAllowedOrigin(req({ origin: 'http://www.zehnspaces.com', host: 'www.zehnspaces.com' }))).toBe(false);
  });

  it('accepts sites listed in ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS = 'https://zehnspaces.com, https://other.example';
    expect(isAllowedOrigin(req({ origin: 'https://zehnspaces.com', host: 'www.zehnspaces.com' }))).toBe(true);
  });

  it('accepts localhost only outside production', () => {
    const r = req({ origin: 'http://localhost:5173', host: 'x.vercel.app' });
    process.env.VERCEL_ENV = 'production';
    expect(isAllowedOrigin(r)).toBe(false);
    process.env.VERCEL_ENV = 'preview';
    expect(isAllowedOrigin(r)).toBe(true);
  });

  it('refuses garbage', () => {
    expect(isAllowedOrigin(req({ origin: 'null', host: 'www.zehnspaces.com' }))).toBe(false);
  });
});

describe('body reading', () => {
  it('refuses a declared body over the cap', async () => {
    await expect(readJson(req({ 'content-length': '99999' }, { body: {} }), 1024)).rejects.toThrow('payload too large');
  });

  it('refuses a JSON array', async () => {
    await expect(readJson(req({}, { body: [1, 2] }), 1024)).rejects.toThrow();
  });

  it('parses a string body', async () => {
    await expect(readJson(req({}, { body: '{"a":1}' }), 1024)).resolves.toEqual({ a: 1 });
  });

  it('refuses a string body that is not JSON', async () => {
    await expect(readJson(req({}, { body: 'a=1' }), 1024)).rejects.toThrow();
  });
});

describe('client ip', () => {
  it('prefers the header Vercel sets itself', () => {
    expect(clientIp(req({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.1.1.1');
  });
});

describe('endpoints refuse other websites', () => {
  for (const [name, handler] of [['community', communityHandler], ['booking', bookingHandler]]) {
    it(`/api/${name} answers 403 to a foreign origin`, async () => {
      const res = mockRes();
      await handler(req({ origin: 'https://evil.example', host: 'www.zehnspaces.com' }, { body: {} }), res);
      expect(res.statusCode).toBe(403);
    });

    it(`/api/${name} lets the site's own origin through to validation`, async () => {
      const res = mockRes();
      await handler(req({ origin: 'https://www.zehnspaces.com', host: 'www.zehnspaces.com' }, { body: { email: 'nope' } }), res);
      expect(res.statusCode).toBe(422);
    });
  }
});

describe('/api/community', () => {
  it('fails closed without a database', async () => {
    const res = mockRes();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await communityHandler(req({}, { body: { email: 'ada@example.com' } }), res);
    expect(res.statusCode).toBe(503);
  });

  it('absorbs the honeypot', async () => {
    const res = mockRes();
    await communityHandler(req({}, { body: { email: 'ada@example.com', company: 'x' } }), res);
    expect(res.statusCode).toBe(200);
  });
});
