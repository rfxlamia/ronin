// serverless/demo-proxy/ratelimit.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exceedsTokenLimit, estimateTokens } from './ratelimit.mjs';

describe('estimateTokens', () => {
  it('should estimate tokens from a string', () => {
    assert.equal(estimateTokens('hello'), 2); // ceil(5/4) = 2
    assert.equal(estimateTokens('a'.repeat(8)), 2); // ceil(8/4) = 2
  });
});

describe('exceedsTokenLimit', () => {
  it('should return false for small payloads', () => {
    const body = { messages: [{ role: 'user', content: 'hello' }] };
    assert.equal(exceedsTokenLimit(body), false);
  });

  it('should return true when total chars exceed 16000 (4000 tokens)', () => {
    const longContent = 'a'.repeat(16001);
    const body = { messages: [{ role: 'user', content: longContent }] };
    assert.equal(exceedsTokenLimit(body), true);
  });

  it('should handle multiple messages', () => {
    const body = {
      messages: [
        { role: 'user', content: 'a'.repeat(8000) },
        { role: 'assistant', content: 'b'.repeat(8001) },
      ]
    };
    assert.equal(exceedsTokenLimit(body), true);
  });

  it('should handle non-string content gracefully', () => {
    const body = { messages: [{ role: 'user', content: null }] };
    assert.equal(exceedsTokenLimit(body), false);
  });
});
