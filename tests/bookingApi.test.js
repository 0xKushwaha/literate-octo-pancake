import { describe, it, expect } from 'vitest';
import handler from '../api/booking.js';

/**
 * These exercise every path through /api/booking that stops before the database
 * — which is every path that matters for abuse. They run with no Supabase
 * environment configured on purpose: the last case asserts that a valid
 * submission then fails CLOSED (503) rather than silently succeeding.
 */

function mockRes() {
  const r = { statusCode: null, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

const req = (method, body, headers = {}) => ({ method, body, headers, socket: {} });

const validBody = {
  name: 'Ada Okonkwo',
  email: 'ada@example.com',
  consent: true,
  elapsedMs: 60000,
  concerns: ['Anxiety'],
  who: 'individual',
  format: 'video',
};

describe('POST /api/booking — method and headers', () => {
  it('rejects anything but POST', async () => {
    const res = mockRes();
    await handler(req('GET', {}), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  it('never lets a response be cached', async () => {
    const res = mockRes();
    await handler(req('GET', {}), res);
    expect(res.headers['Cache-Control']).toContain('no-store');
  });
});

describe('POST /api/booking — bot heuristics', () => {
  // Answering 200 rather than an error is deliberate: telling a script why it
  // was rejected is free tuning data for whoever is running it.
  it('absorbs a filled honeypot without reaching the database', async () => {
    const res = mockRes();
    await handler(req('POST', { ...validBody, company: 'Acme Ltd' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.accepted).toBe(false);
  });

  it('still returns a plausible reference to a bot', async () => {
    const res = mockRes();
    await handler(req('POST', { ...validBody, company: 'Acme Ltd' }), res);
    expect(/^LM-[0-9A-F]{8}$/.test(res.body.reference)).toBe(true);
  });

  it('absorbs a form completed faster than a person could read it', async () => {
    const res = mockRes();
    await handler(req('POST', { ...validBody, elapsedMs: 200 }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.accepted).toBe(false);
  });
});

describe('POST /api/booking — validation', () => {
  it('rejects bad input with 422 and names each field', async () => {
    const res = mockRes();
    await handler(req('POST', {
      name: 'A', email: 'not-an-email', consent: false, elapsedMs: 60000,
    }), res);
    expect(res.statusCode).toBe(422);
    expect(Boolean(res.body.fields.name)).toBe(true);
    expect(Boolean(res.body.fields.email)).toBe(true);
    expect(Boolean(res.body.fields.consent)).toBe(true);
  });

  it('requires explicit consent', async () => {
    const res = mockRes();
    await handler(req('POST', { ...validBody, consent: false }), res);
    expect(res.statusCode).toBe(422);
  });
});

describe('POST /api/booking — failure mode', () => {
  // An enquiry lost to a misconfigured deploy is recoverable by phone. An open
  // write path into a table of health disclosures is not.
  it('fails closed when the server environment is not configured', async () => {
    const res = mockRes();
    await handler(req('POST', validBody), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toContain('temporarily unavailable');
  });
});

describe('POST /api/booking — the Booking switch', async () => {
  const { bookingOpen, BOOKING_SWITCH_DEFAULT } = await import('../api/booking.js');
  const { defaultsFor } = await import('../src/data/contentSchema.js');
  const fakeDb = (row, error = null) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error }) }) }) }),
  });

  it('uses the same default as the admin switch', () => {
    expect(BOOKING_SWITCH_DEFAULT).toBe(defaultsFor('features').booking);
  });

  it('is closed when nothing is stored (the default is off)', async () => {
    expect(await bookingOpen(fakeDb(null))).toBe(false);
    expect(await bookingOpen(fakeDb({ value: '' }))).toBe(false);
  });

  it('follows the stored switch', async () => {
    expect(await bookingOpen(fakeDb({ value: 'on' }))).toBe(true);
    expect(await bookingOpen(fakeDb({ value: 'off' }))).toBe(false);
  });

  it('throws on a database error so the handler fails closed', async () => {
    await expect(bookingOpen(fakeDb(null, { code: 'XX' }))).rejects.toBeTruthy();
  });
});
