/**
 * Ronin Demo Mode Proxy - AWS Lambda Handler
 *
 * Streams AI responses from OpenRouter with rate limiting
 * Uses awslambda.streamifyResponse() for real-time streaming
 * Note: awslambda is globally provided by Lambda runtime (not imported)
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { checkRateLimit, generateFingerprint, exceedsTokenLimit } from './ratelimit.mjs';

/* global awslambda */

const ssmClient = new SSMClient({});
const API_KEY_PARAM = process.env.OPENROUTER_API_KEY_PARAM;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',');

// Cache API key in Lambda memory (warm starts)
let cachedApiKey = null;

/**
 * Get OpenRouter API key from SSM Parameter Store
 * @returns {Promise<string>}
 */
async function getApiKey() {
    if (cachedApiKey) {
        return cachedApiKey;
    }

    try {
        const command = new GetParameterCommand({
            Name: API_KEY_PARAM,
            WithDecryption: true
        });

        const response = await ssmClient.send(command);
        cachedApiKey = response.Parameter.Value;
        return cachedApiKey;
    } catch (error) {
        console.error('Failed to get API key from SSM:', error);
        throw new Error('Configuration error');
    }
}

/**
 * Handle CORS preflight
 */
function handleCors(event) {
    const origin = event.headers?.origin || event.headers?.Origin;

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Client-Fingerprint',
            'Access-Control-Max-Age': '300'
        },
        body: ''
    };
}

/**
 * Return rate limit error response
 */
function rateLimitError(retryAfter, remaining) {
    const minutes = Math.ceil(retryAfter / 60);

    return {
        statusCode: 429,
        headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining-Hourly': remaining.hourly.toString(),
            'X-RateLimit-Remaining-Daily': remaining.daily.toString()
        },
        body: JSON.stringify({
            error: 'rate_limit',
            message: `Demo mode resting. Try again in ${minutes} minutes, or add your own API key for unlimited use.`,
            retryAfter,
            upgradeUrl: 'https://openrouter.ai/keys'
        })
    };
}

/**
 * Stream OpenRouter response to client
 */
async function streamOpenRouterResponse(apiKey, requestBody, responseStream, metadata) {
    const models = [
        'xiaomi/mimo-v2-flash:free',
        'z-ai/glm-4.5-air:free',
        'openai/gpt-oss-20b:free'
    ];

    for (const model of models) {
        try {
            const openrouterBody = {
                model,
                messages: requestBody.messages,
                stream: true
            };

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://ronin.app',
                    'X-Title': 'Ronin',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(openrouterBody)
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // Model not found, try next
                    continue;
                }

                const errorText = await response.text();
                console.error(`OpenRouter error (${model}):`, response.status, errorText);
                continue;
            }

            // Stream successful response
            metadata.statusCode = 200;
            metadata.headers = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...metadata.headers
            };

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    responseStream.end();
                    return;
                }

                const chunk = decoder.decode(value, { stream: true });
                responseStream.write(chunk);
            }
        } catch (error) {
            console.error(`Model ${model} failed:`, error);
            continue;
        }
    }

    // All models failed
    metadata.statusCode = 502;
    responseStream.write(JSON.stringify({
        error: 'server_error',
        message: 'AI service unavailable. Try again later?'
    }));
    responseStream.end();
}

/**
 * Main handler with streaming
 */
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
    const metadata = {
        statusCode: 200,
        headers: {}
    };

    try {
        // Handle CORS preflight
        if (event.requestContext.http.method === 'OPTIONS') {
            const corsResponse = handleCors(event);
            metadata.statusCode = corsResponse.statusCode;
            metadata.headers = corsResponse.headers;
            responseStream.write('');
            responseStream.end();
            return;
        }

        // Get origin for CORS
        const origin = event.headers?.origin || event.headers?.Origin;
        const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

        metadata.headers = {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Expose-Headers': 'X-RateLimit-Remaining-Hourly, X-RateLimit-Remaining-Daily, X-RateLimit-Reset'
        };

        // Parse request body
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (e) {
            metadata.statusCode = 400;
            responseStream.write(JSON.stringify({
                error: 'invalid_request',
                message: 'Invalid JSON in request body'
            }));
            responseStream.end();
            return;
        }

        // Validate request body size (20KB limit)
        if (event.body && event.body.length > 20480) {
            metadata.statusCode = 413;
            responseStream.write(JSON.stringify({
                error: 'payload_too_large',
                message: 'Request payload exceeds 20KB limit'
            }));
            responseStream.end();
            return;
        }

        // Check token limit
        if (exceedsTokenLimit(requestBody)) {
            metadata.statusCode = 400;
            responseStream.write(JSON.stringify({
                error: 'token_limit_exceeded',
                message: 'Request exceeds 4000 token limit'
            }));
            responseStream.end();
            return;
        }

        // Generate fingerprint
        const fingerprint = event.headers['x-client-fingerprint']
            || event.headers['X-Client-Fingerprint']
            || generateFingerprint(event);

        // Check rate limits
        const rateLimit = await checkRateLimit(fingerprint);

        if (!rateLimit.allowed) {
            const errorResponse = rateLimitError(rateLimit.retryAfter, rateLimit.remaining);
            metadata.statusCode = errorResponse.statusCode;
            metadata.headers = { ...metadata.headers, ...errorResponse.headers };
            responseStream.write(errorResponse.body);
            responseStream.end();
            return;
        }

        // Add rate limit headers
        metadata.headers['X-RateLimit-Remaining-Hourly'] = rateLimit.remaining.hourly.toString();
        metadata.headers['X-RateLimit-Remaining-Daily'] = rateLimit.remaining.daily.toString();
        metadata.headers['X-RateLimit-Reset'] = (Math.floor(Date.now() / 1000) + 3600).toString();

        // Get API key and stream response
        const apiKey = await getApiKey();
        await streamOpenRouterResponse(apiKey, requestBody, responseStream, metadata);

    } catch (error) {
        console.error('Lambda error:', error);
        metadata.statusCode = 500;
        metadata.headers['Content-Type'] = 'application/json';
        responseStream.write(JSON.stringify({
            error: 'internal_error',
            message: 'Something went wrong. Try again?'
        }));
        responseStream.end();
    }
});
