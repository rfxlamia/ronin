/**
 * AI provider types for multi-provider support
 * Story 4.25-1: Unified API Client (Vercel SDK)
 */

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: string; // 'openrouter' | 'openai' | 'anthropic' | 'google' | 'custom'
  name: string; // Human-readable name
  baseUrl: string; // API endpoint
  requiresKey: boolean; // Whether API key is required
  isDefault: boolean; // Only one can be true
}

/**
 * Provider information from backend
 */
export interface ProviderInfo {
  id: string;
  name: string;
  is_configured: boolean; // Has API key
  is_default: boolean;
}

/**
 * AI chunk event for streaming (backward compatible)
 */
export interface AiChunkEvent {
  text?: string;
  tool_calls?: any[];
  is_complete: boolean;
  provider?: string; // Optional provider ID (added in Story 4.25-1)
}

/**
 * AI completion event
 */
export interface AiCompleteEvent {
  text: string;
  attribution: Attribution;
  provider?: string; // Provider name (e.g., "OpenRouter")
  cached?: boolean; // True if loaded from cache
}

/**
 * Attribution data for AI context
 */
export interface Attribution {
  commits: number;
  files: number;
  sources: string[]; // e.g., ["git", "devlog"]
  devlogLines?: number; // Optional devlog line count
}

/**
 * AI error event (Story 4.25-1)
 */
export interface AiErrorEvent {
  provider: string; // Provider ID that failed
  errorType: 'auth' | 'ratelimit' | 'server' | 'network' | 'config';
  message: string; // Empathetic user-facing message
  retryable: boolean;
  retryAfter?: number; // Seconds until retry allowed (for rate limits)
  upgradeUrl?: string; // URL to get own API key (for demo mode)
}

/**
 * Legacy error format (from Story 3.6)
 * Format: "PREFIX:CODE:MESSAGE"
 * - OFFLINE:message
 * - RATELIMIT:retry_after:message
 * - APIERROR:status:message
 */
export type LegacyErrorMessage = string;

/**
 * Demo mode quota information (Story 4.25-2)
 */
export interface DemoQuota {
  remainingHourly: number;
  remainingDaily: number;
  resetTime: number | null; // Unix timestamp (seconds)
}

/**
 * Message type for multi-turn conversation (Story 4.5.1)
 */
export interface Message {
  role: string; // "system" | "user" | "assistant" | "tool"
  content: string;
  name?: string; // For tool calls
}

/**
 * Context payload for AI inference (Story 4.5.1)
 */
export interface ContextPayload {
  messages?: Message[];
  system_prompt?: string;
  user_message?: string;
  model?: string;
  attribution: Attribution;
}
