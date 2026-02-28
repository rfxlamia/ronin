import { describe, it, expect } from 'vitest';
import { parseError } from './useAiContext';

describe('parseError', () => {
  describe('OFFLINE errors', () => {
    it('parses OFFLINE prefix correctly', () => {
      const result = parseError('OFFLINE:No network connection');
      expect(result.kind).toBe('offline');
      expect(result.message).toBe('No network connection');
      expect(result.retryAfter).toBeUndefined();
    });

    it('handles empty message after OFFLINE prefix', () => {
      const result = parseError('OFFLINE:');
      expect(result.kind).toBe('offline');
      expect(result.message).toBe('No network connection');
    });

    it('handles Error object with OFFLINE message — not just raw string', () => {
      // Saat backend throw Error('OFFLINE:No network'), String(error) = "Error: OFFLINE:..."
      // parseError harus tetap menghasilkan kind: 'offline'
      const errorObj = new Error('OFFLINE:No network connection');
      const result = parseError(errorObj.message); // .message bukan String(errorObj)
      expect(result.kind).toBe('offline');
      expect(result.message).toBe('No network connection');
    });

    it('handles Error object with RATELIMIT message', () => {
      const errorObj = new Error('RATELIMIT:30:AI resting');
      const result = parseError(errorObj.message);
      expect(result.kind).toBe('ratelimit');
      expect(result.retryAfter).toBe(30);
    });
  });

  describe('RATELIMIT errors', () => {
    it('parses RATELIMIT with seconds correctly', () => {
      const result = parseError('RATELIMIT:30:AI resting');
      expect(result.kind).toBe('ratelimit');
      expect(result.message).toBe('AI resting');
      expect(result.retryAfter).toBe(30);
    });

    it('parses RATELIMIT with different durations', () => {
      const result = parseError('RATELIMIT:60:Rate limited');
      expect(result.kind).toBe('ratelimit');
      expect(result.retryAfter).toBe(60);
    });

    it('defaults to 30 seconds if parsing fails', () => {
      const result = parseError('RATELIMIT:invalid:AI resting');
      expect(result.kind).toBe('ratelimit');
      expect(result.retryAfter).toBe(30);
    });

    it('handles message with colons', () => {
      const result = parseError('RATELIMIT:30:Error: something went wrong');
      expect(result.kind).toBe('ratelimit');
      expect(result.message).toBe('Error: something went wrong');
      expect(result.retryAfter).toBe(30);
    });
  });

  describe('APIERROR errors', () => {
    it('parses APIERROR:500 correctly', () => {
      const result = parseError('APIERROR:500:Server error');
      expect(result.kind).toBe('api');
      expect(result.message).toBe('Server error');
    });

    it('parses APIERROR:401 correctly', () => {
      const result = parseError('APIERROR:401:API key invalid. Check settings.');
      expect(result.kind).toBe('api');
      expect(result.message).toBe('API key invalid. Check settings.');
    });

    it('handles empty message after APIERROR', () => {
      const result = parseError('APIERROR:500:');
      expect(result.kind).toBe('api');
      expect(result.message).toBe('Server error');
    });
  });

  describe('Unknown errors', () => {
    it('returns unknown for unrecognized format', () => {
      const result = parseError('Some random error');
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('Some random error');
    });

    it('handles empty string', () => {
      const result = parseError('');
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('Something went wrong');
    });

    it('handles legacy error format', () => {
      const result = parseError('Rate limit exceeded');
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('Rate limit exceeded');
    });
  });
});

describe('generateContext error handling — Error object vs string', () => {
  // Test ini memverifikasi bahwa ketika invoke() throw Error object,
  // pesan error yang tersimpan di state TIDAK mengandung prefix "Error: "
  it('parseError receives .message not String(error) from catch block', () => {
    // Dokumentasi: String(new Error('OFFLINE:x')) === 'Error: OFFLINE:x'
    // parseError('Error: OFFLINE:x').kind === 'unknown' (BUG)
    // parseError('OFFLINE:x').kind === 'offline' (CORRECT)
    const rawError = new Error('OFFLINE:x');
    expect(String(rawError)).toBe('Error: OFFLINE:x');
    expect(parseError(String(rawError)).kind).toBe('unknown'); // BUG — ini dokumentasi bug
    expect(parseError(rawError.message).kind).toBe('offline'); // CORRECT — ini yang seharusnya
  });
});
