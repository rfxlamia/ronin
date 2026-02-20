# Uptime Optimization

> Learn how OpenRouter maximizes AI model uptime through real-time monitoring, intelligent routing, and automatic fallbacks across multiple providers.

OpenRouter continuously monitors the health and availability of AI providers to ensure maximum uptime for your applications. We track response times, error rates, and availability across all providers in real-time, and route based on this feedback.

## How It Works

OpenRouter tracks response times, error rates, and availability across all providers in real-time. This data helps us make intelligent routing decisions and provides transparency about service reliability.

## Uptime Example: Claude 4 Sonnet

<UptimeChart permaslug="anthropic/claude-4-sonnet-20250522" />

## Uptime Example: Llama 3.3 70B Instruct

<UptimeChart permaslug="meta-llama/llama-3.3-70b-instruct" />

## Customizing Provider Selection

While our smart routing helps maintain high availability, you can also customize provider selection using request parameters. This gives you control over which providers handle your requests while still benefiting from automatic fallback when needed.

Learn more about customizing provider selection in our [Provider Routing documentation](/docs/features/provider-routing).
