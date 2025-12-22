/**
 * Provider Registry
 * Story 4.25-1: Unified API Client (Vercel SDK)
 *
 * Location: src/lib/ai/registry.ts
 *
 * Built-in providers (MVP - only OpenRouter in this story)
 * Future providers will be added in subsequent stories
 */

import type { ProviderConfig } from '@/types/ai';

export const PROVIDER_REGISTRY: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    isDefault: true,
  },
  {
    id: 'demo',
    name: 'Demo Mode (Limited)',
    baseUrl: process.env.DEMO_LAMBDA_URL || "https://dkm5aeebsg7dggdpwoovlbzjde0ayxyh.lambda-url.ap-southeast-2.on.aws/",
    requiresKey: false,
    isDefault: false,
  },
  // Future providers:
  // {
  //   id: 'openai',
  //   name: 'OpenAI',
  //   baseUrl: 'https://api.openai.com/v1',
  //   requiresKey: true,
  //   isDefault: false,
  // },
];

/**
 * Get provider config by ID
 */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_REGISTRY.find((p) => p.id === providerId);
}

/**
 * Get default provider
 */
export function getDefaultProvider(): ProviderConfig {
  const defaultProvider = PROVIDER_REGISTRY.find((p) => p.isDefault);
  if (!defaultProvider) {
    throw new Error('No default provider configured');
  }
  return defaultProvider;
}
