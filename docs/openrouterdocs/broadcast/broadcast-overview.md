# Broadcast

> Connect your LLM observability platforms to automatically receive traces from your OpenRouter requests. Supports Langfuse, Datadog, Braintrust, and more.

Broadcast allows you to automatically send traces from your OpenRouter requests to external observability and analytics platforms. This feature enables you to monitor, debug, and analyze your LLM usage across your preferred tools without any additional instrumentation in your application code.

## Enabling Broadcast

To enable broadcast for your account or organization:

1. Navigate to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) in your OpenRouter dashboard
2. Toggle the "Enable Broadcast" switch to turn on the feature
3. Add one or more destinations where you want to send your traces

<Tip>
  If you're using an organization account, you must be an organization admin to edit broadcast settings.
</Tip>

Once enabled, OpenRouter will automatically send trace data for all your API requests to your configured destinations.

## Supported Destinations

{/* When updating this list, sync with getPublicDestinationMetadata() in packages/broadcast/registry.ts
    which filters by isActive && releaseStatus === 'stable'. See destination metadata in packages/broadcast/destinations/*.ts */}

The following destinations are currently available:

* [Braintrust](/docs/guides/features/broadcast/braintrust)
* [Datadog](/docs/guides/features/broadcast/datadog)
* [Langfuse](/docs/guides/features/broadcast/langfuse)
* [LangSmith](/docs/guides/features/broadcast/langsmith)
* [Weave](/docs/guides/features/broadcast/weave)
* S3
* OTel Collector

Each destination has its own configuration requirements, such as API keys, endpoints, or project identifiers. When adding a destination, you'll be prompted to provide the necessary credentials which are encrypted and stored securely.

For the most up-to-date list of available destinations, visit the [Broadcast settings page](https://openrouter.ai/settings/broadcast) in your dashboard.

### Coming Soon

The following destinations are in development and will be available soon:

* Arize
* AWS Firehose
* Clickhouse
* Dynatrace
* Evidently
* Fiddler
* Galileo
* Grafana
* Helicone
* HoneyHive
* Keywords AI
* Middleware
* Mona
* New Relic
* OpenInference
* Opik
* Phoenix
* Portkey
* PostHog
* Snowflake
* Supabase
* Webhook
* WhyLabs

## Trace Data

Each broadcast trace includes comprehensive information about your API request:

* **Request & Response Data**: The input messages and model output (with multimodal content stripped for efficiency)
* **Token Usage**: Prompt tokens, completion tokens, and total tokens consumed
* **Cost Information**: The total cost of the request
* **Timing**: Request start time, end time, and latency metrics
* **Model Information**: The model slug and provider name used for the request
* **Tool Usage**: Whether tools were included in the request and if tool calls were made

### Optional Trace Data

You can enrich your traces with additional context by including these optional fields in your API requests:

* **User ID**: Associate traces with specific end-users by including the `user` field (up to 128 characters). This helps you track usage patterns and debug issues for individual users.

```json
{
  "model": "openai/gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ],
  "user": "user_12345"
}
```

* **Session ID**: Group related requests together (such as a conversation or agent workflow) by including the `session_id` field (up to 128 characters). You can also pass this via the `x-session-id` HTTP header.

```json
{
  "model": "openai/gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "Hello, world!"
    }
  ],
  "session_id": "session_abc123"
}
```

## API Key Filtering

Each destination can be configured to only receive traces from specific API keys. This is useful when you want to:

* route traces from different parts of your application to different observability platforms
* isolate monitoring for specific use cases
* or send production API key traces at a lower sampling rate than development keys

When adding or editing a destination, you can select one or more API keys from your account. Only requests made with those selected API keys will have their traces sent to that destination. If no API keys are selected, the destination will receive traces from all your API keys or chatroom requests.

Combined with [multiple destinations](#multiple-destinations), you can set up separate configurations for different environments. For example, you could create two Langfuse destinations: one filtered to your production API keys with a 1% sampling rate to manage costs, and another filtered to your development API keys with 100% sampling for full visibility during testing.

## Sampling Rate

Each destination can be configured with a sampling rate to control what percentage of traces are sent. This is useful for high-volume applications where you want to reduce costs or data volume while still maintaining visibility into your LLM usage. A sampling rate of 1.0 sends all traces, while 0.5 would send approximately 50% of traces.

<Tip>
  Sampling is deterministic: when you provide a `session_id`, all traces within that session will be consistently included or excluded together. This ensures you always see complete sessions in your observability platform rather than fragmented data.

  You'll see full sessions per destination, but not necessarily the same sessions across all destinations.
</Tip>

## Multiple Destinations

You can configure up to 5 destinations of the same type on your account. This allows you to send traces to different projects or environments within the same observability platform. For example, you could create two Langfuse destinations: one filtered to your production API keys with a 1% sampling rate to manage costs, and another filtered to your development API keys with 100% sampling for full visibility during testing.

## Security

Your destination credentials are encrypted before being stored and are only decrypted when sending traces. Traces are sent asynchronously after requests complete, so enabling broadcast does not add latency to your API responses.

## Organization Support

Broadcast can be configured at both the individual user level and the organization level. Organization admins can set up shared destinations that apply to all API keys within the organization, ensuring consistent observability across your team.

## Walkthroughs

Step-by-step guides for configuring specific broadcast destinations:

* [Langfuse](/docs/guides/features/broadcast/langfuse) - Open-source LLM engineering platform
* [LangSmith](/docs/guides/features/broadcast/langsmith) - LangChain observability and debugging
* [Datadog](/docs/guides/features/broadcast/datadog) - Full-stack monitoring and analytics
* [Braintrust](/docs/guides/features/broadcast/braintrust) - LLM evaluation and monitoring
* [W\&B Weave](/docs/guides/features/broadcast/weave) - LLM observability and tracking
