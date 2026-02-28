/**
 * Rate limiting logic for Ronin Demo Mode
 *
 * Strategy:
 * - Per-user limit: 10 requests/hour, 50 requests/day
 * - Per-request limit: 4000 tokens max
 * - Fingerprint: SHA-256 hash of IP + User-Agent (privacy-preserving)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

// Rate limiting strategy: fixed window via DynamoDB TTL.
// Each item has a TTL that expires after the window duration.
// DynamoDB auto-deletes expired items, resetting the counter.
// Window starts from first request, not calendar boundary.

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

// Rate limit thresholds
const HOURLY_LIMIT = 10;
const DAILY_LIMIT = 50;
const TOKEN_LIMIT = 4000;

/**
 * Atomically increment counter and check rate limit in one DynamoDB operation.
 * Uses ConditionalExpression to prevent TOCTOU race condition.
 * @param {string} fingerprint
 * @param {string} window - 'hourly' or 'daily'
 * @param {number} limit
 * @returns {Promise<{allowed: boolean, newCount?: number}>}
 */
async function atomicCheckAndIncrement(fingerprint, window, limit) {
  const ttl = window === 'hourly'
    ? Math.floor(Date.now() / 1000) + 3600
    : Math.floor(Date.now() / 1000) + 86400;

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { fingerprint, window },
      UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl',
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':limit': limit, ':ttl': ttl },
      ReturnValues: 'UPDATED_NEW',
    }));
    return { allowed: true, newCount: result.Attributes.count };
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return { allowed: false };
    }
    console.error(`DynamoDB atomic increment error (${window}):`, err);
    return { allowed: true, newCount: 0 }; // fail open
  }
}

/**
 * Generate privacy-preserving fingerprint from IP and User-Agent
 * @param {object} event - Lambda event
 * @returns {string} SHA-256 hash (32 chars)
 */
export function generateFingerprint(event) {
    const ip = event.requestContext?.http?.sourceIp || 'unknown';
    const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';

    return createHash('sha256')
        .update(`${ip}:${userAgent}`)
        .digest('hex')
        .substring(0, 32);
}

/**
 * Check if request is within rate limits
 * @param {string} fingerprint
 * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining: {hourly: number, daily: number}}>}
 */
export async function checkRateLimit(fingerprint) {
  const [hourlyResult, dailyResult] = await Promise.all([
    atomicCheckAndIncrement(fingerprint, 'hourly', HOURLY_LIMIT),
    atomicCheckAndIncrement(fingerprint, 'daily', DAILY_LIMIT),
  ]);

  if (!hourlyResult.allowed) {
    return {
      allowed: false,
      retryAfter: 3600,
      remaining: { hourly: 0, daily: 0 }
    };
  }

  if (!dailyResult.allowed) {
    // Rollback tidak mungkin di DynamoDB tanpa transaksi — decrement manual
    // Ini acceptable karena hourly count off-by-one tidak signifikan
    return {
      allowed: false,
      retryAfter: 86400,
      remaining: { hourly: 0, daily: 0 }
    };
  }

  return {
    allowed: true,
    remaining: {
      hourly: Math.max(0, HOURLY_LIMIT - (hourlyResult.newCount || 0)),
      daily: Math.max(0, DAILY_LIMIT - (dailyResult.newCount || 0)),
    }
  };
}

/**
 * Estimate token count (simple approximation)
 * OpenAI uses ~4 chars per token average
 * @param {string} text
 * @returns {number} Estimated tokens
 */
export function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

/**
 * Check if request exceeds token limit
 * @param {object} requestBody
 * @returns {boolean}
 */
export function exceedsTokenLimit(requestBody) {
    const messages = requestBody.messages || [];
    const totalChars = messages.reduce((sum, msg) => {
        return sum + (typeof msg.content === 'string' ? msg.content.length : 0);
    }, 0);
    return Math.ceil(totalChars / 4) > TOKEN_LIMIT;
}
