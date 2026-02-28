/**
 * Rate limiting logic for Ronin Demo Mode
 *
 * Strategy:
 * - Per-user limit: 10 requests/hour, 50 requests/day
 * - Per-request limit: 4000 tokens max
 * - Fingerprint: SHA-256 hash of IP + User-Agent (privacy-preserving)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

// Rate limit thresholds
const HOURLY_LIMIT = 10;
const DAILY_LIMIT = 50;
const TOKEN_LIMIT = 4000;

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
 * Get current usage for a fingerprint
 * @param {string} fingerprint
 * @param {string} window - 'hourly' or 'daily'
 * @returns {Promise<number>} Current request count
 */
async function getUsage(fingerprint, window) {
    try {
        const now = Date.now();
        const windowStart = window === 'hourly'
            ? now - (60 * 60 * 1000) // 1 hour
            : now - (24 * 60 * 60 * 1000); // 24 hours

        const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                fingerprint,
                window
            }
        }));

        if (!result.Item || result.Item.timestamp < windowStart) {
            return 0;
        }

        return result.Item.count || 0;
    } catch (error) {
        console.error(`DynamoDB getUsage error (${window}):`, error);
        // Fail open - allow request if DynamoDB unavailable
        return 0;
    }
}

/**
 * Increment usage counter
 * @param {string} fingerprint
 * @param {string} window - 'hourly' or 'daily'
 */
async function incrementUsage(fingerprint, window) {
    try {
        const now = Date.now();
        const ttl = window === 'hourly'
            ? Math.floor(now / 1000) + (60 * 60) // 1 hour from now
            : Math.floor(now / 1000) + (24 * 60 * 60); // 24 hours from now

        const currentCount = await getUsage(fingerprint, window);

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                fingerprint,
                window,
                count: currentCount + 1,
                timestamp: now,
                ttl
            }
        }));
    } catch (error) {
        console.error(`DynamoDB incrementUsage error (${window}):`, error);
        // Fail open - don't block user due to infrastructure issues
    }
}

/**
 * Check if request is within rate limits
 * @param {string} fingerprint
 * @returns {Promise<{allowed: boolean, retryAfter?: number, remaining: {hourly: number, daily: number}}>}
 */
export async function checkRateLimit(fingerprint) {
    const hourlyUsage = await getUsage(fingerprint, 'hourly');
    const dailyUsage = await getUsage(fingerprint, 'daily');

    const remainingHourly = Math.max(0, HOURLY_LIMIT - hourlyUsage);
    const remainingDaily = Math.max(0, DAILY_LIMIT - dailyUsage);

    if (hourlyUsage >= HOURLY_LIMIT) {
        return {
            allowed: false,
            retryAfter: 3600, // 1 hour in seconds
            remaining: { hourly: 0, daily: remainingDaily }
        };
    }

    if (dailyUsage >= DAILY_LIMIT) {
        return {
            allowed: false,
            retryAfter: 86400, // 24 hours in seconds
            remaining: { hourly: remainingHourly, daily: 0 }
        };
    }

    // Increment usage counters
    await Promise.all([
        incrementUsage(fingerprint, 'hourly'),
        incrementUsage(fingerprint, 'daily')
    ]);

    return {
        allowed: true,
        remaining: {
            hourly: remainingHourly - 1,
            daily: remainingDaily - 1
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
