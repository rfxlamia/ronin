# Online Variant

> Enable real-time web search capabilities using the :online variant.

The `:online` variant enables real-time web search capabilities for any model on OpenRouter.

## Usage

Append `:online` to any model ID:

```json
{
  "model": "openai/gpt-4o:online"
}
```

This is a shortcut for using the `web` plugin, and is exactly equivalent to:

```json
{
  "model": "openrouter/auto",
  "plugins": {
    "web": {}
  }
}
```

## Details

The Online variant incorporates relevant web search results into model responses, providing access to real-time information and current events. This is particularly useful for queries that require up-to-date information beyond the model's training data.

For more details, see: [Web Search](/docs/guides/features/plugins/web-search)
