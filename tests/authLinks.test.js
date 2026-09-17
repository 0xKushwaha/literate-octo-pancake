import { describe, expect, it } from 'vitest';
import { isSetPasswordHash, parseAuthLink, passwordProblem } from '../src/lib/authLinks.js';

describe('passwordProblem', () => {
  it('asks for length first', () => {
    expect(passwordProblem('short')).toMatch(/12/);
  });
  it('refuses repetitive passwords', () => {
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).toMatch(/repetitive/);
  });
  it('checks the confirmation', () => {
    expect(passwordProblem('correct horse battery', 'correct horse batter')).toMatch(/match/);
  });
  it('accepts a good one', () => {
    expect(passwordProblem('correct horse battery', 'correct horse battery')).toBe(null);
  });
});

describe('parseAuthLink', () => {
  it('reads a recovery link', () => {
    expect(parseAuthLink('#access_token=a&refresh_token=b&type=recovery&expires_in=3600')).toEqual({
      kind: 'tokens', accessToken: 'a', refreshToken: 'b', type: 'recovery',
    });
  });
  it('reads an expired link as an error', () => {
    expect(parseAuthLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'))
      .toEqual({ kind: 'error', message: 'Email link is invalid or has expired' });
  });
  it('reads a token_hash link', () => {
    expect(parseAuthLink('', '?token_hash=xyz&type=recovery')).toEqual({ kind: 'token_hash', tokenHash: 'xyz', type: 'recovery' });
  });
  it('ignores an unknown token_hash type', () => {
    expect(parseAuthLink('', '?token_hash=xyz&type=whatever')).toBe(null);
  });
  it('reads a code', () => {
    expect(parseAuthLink('', '?code=123')).toEqual({ kind: 'code', code: '123' });
  });
  it('returns null for an ordinary page', () => {
    expect(parseAuthLink('#faq', '')).toBe(null);
  });
});

describe('isSetPasswordHash', () => {
  it('spots recovery and invite links only', () => {
    expect(isSetPasswordHash('#access_token=a&refresh_token=b&type=recovery')).toBe(true);
    expect(isSetPasswordHash('#access_token=a&refresh_token=b&type=invite')).toBe(true);
    expect(isSetPasswordHash('#access_token=a&refresh_token=b&type=signup')).toBe(false);
    expect(isSetPasswordHash('#community')).toBe(false);
  });
});
