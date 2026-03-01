import { describe, it, expect } from 'vitest';
import { calculateDaysSince, formatDaysSince } from './dateUtils';

describe('calculateDaysSince', () => {
  it('returns 0 for empty string without throwing', () => {
    expect(calculateDaysSince('')).toBe(0);
  });

  it('returns 0 for invalid date string without throwing', () => {
    expect(calculateDaysSince('not-a-date')).toBe(0);
  });

  it('returns correct days for valid ISO date', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(calculateDaysSince(yesterday)).toBe(1);
  });

  it('formatDaysSince does not render NaN for invalid input', () => {
    // NaN dari calculateDaysSince lama akan merender "NaN days ago"
    const days = calculateDaysSince('invalid');
    expect(formatDaysSince(days)).toBe('Today');
  });
});
