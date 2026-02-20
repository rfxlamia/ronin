# Provider Integration

> Learn how to integrate your AI models with OpenRouter. Complete guide for providers to make their models available through OpenRouter's unified API.

## For Providers

If you'd like to be a model provider and sell inference on OpenRouter, [fill out our form](https://openrouter.ai/how-to-list) to get started.

To be eligible to provide inference on OpenRouter you must have the following:

### 1. List Models Endpoint

You must implement an endpoint that returns all models that should be served by OpenRouter. At this endpoint, please return a list of all available models on your platform. Below is an example of the response format:

```json
{
  "data": [
    {
      // Required
      "id": "anthropic/claude-sonnet-4",
      "hugging_face_id": "", // required if the model is on Hugging Face
      "name": "Anthropic: Claude Sonnet 4",
      "created": 1690502400,
      "input_modalities": ["text", "image", "file"],
      "output_modalities": ["text", "image", "file"],
      "quantization": "fp8",
      "context_length": 1000000,
      "max_output_length": 128000,
      "pricing": {
        "prompt": "0.000008", // pricing per 1 token
        "completion": "0.000024", // pricing per 1 token
        "image": "0", // pricing per 1 image
        "request": "0", // pricing per 1 request
        "input_cache_read": "0", // pricing per 1 token
        "input_cache_write": "0" // pricing per 1 token
      },
      "supported_sampling_parameters": ["temperature", "stop"],
      "supported_features": [
        "tools",
        "json_mode",
        "structured_outputs",
        "web_search",
        "reasoning"
      ],
      // Optional
      "description": "Anthropic's flagship model...",
      "openrouter": {
        "slug": "anthropic/claude-sonnet-4"
      },
      "datacenters": [
        {
          "country_code": "US" // `Iso3166Alpha2Code`
        }
      ]
    }
  ]
}
```

NOTE: `pricing` fields are in string format to avoid floating point precision issues, and must be in USD.

Valid quantization values are: `int4`, `int8`, `fp4`, `fp6`, `fp8`, `fp16`, `bf16`, `fp32`.

Valid sampling parameters are: `temperature`, `top_p`, `top_k`, `repetition_penalty`, `frequency_penalty`, `presence_penalty`, `stop`, `seed`.

Valid features are: `tools`, `json_mode`, `structured_outputs`, `web_search`, `reasoning`.

### 2. Auto Top Up or Invoicing

For OpenRouter to use the provider we must be able to pay for inference automatically. This can be done via auto top up or invoicing.

### 3. Uptime Monitoring & Traffic Routing

OpenRouter automatically monitors provider reliability and adjusts traffic routing based on uptime metrics. Your endpoint's uptime is calculated as: **successful requests ÷ total requests** (excluding user errors).

**Errors that affect your uptime:**

* Authentication issues (401)
* Payment failures (402)
* Model not found (404)
* All server errors (500+)
* Mid-stream errors
* Successful requests with error finish reasons

**Errors that DON'T affect uptime:**

* Bad requests (400) - user input errors
* Oversized payloads (413) - user input errors
* Rate limiting (429) - tracked separately
* Geographic restrictions (403) - tracked separately

**Traffic routing thresholds:**

* **Minimum data**: 100+ requests required before uptime calculation begins
* **Normal routing**: 95%+ uptime
* **Degraded status**: 80-94% uptime → receives lower priority
* **Down status**: \<80% uptime → only used as fallback

This system ensures traffic automatically flows to the most reliable providers while giving temporary issues time to resolve.
