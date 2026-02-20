# Arize

> Integrate OpenRouter using Arize for observability and tracing. Complete guide for Arize integration with OpenRouter for Python and JavaScript applications.

## Using Arize

[Arize](https://arize.com/) provides observability and tracing for LLM applications. Since OpenRouter uses the OpenAI API schema, you can utilize Arize's OpenInference auto-instrumentation with the OpenAI SDK to automatically trace and monitor your OpenRouter API calls.

### Installation

```bash
pip install openinference-instrumentation-openai openai arize-otel
```

### Prerequisites

* OpenRouter account and API key
* Arize account with Space ID and API Key

### Why OpenRouter Works with Arize

Arize's OpenInference auto-instrumentation works with OpenRouter because:

1. **OpenRouter provides a fully OpenAI-API-compatible endpoint** - The `/v1` endpoint mirrors OpenAI's schema
2. **Reuse official OpenAI SDKs** - Point the OpenAI client's `base_url` to OpenRouter
3. **Automatic instrumentation** - OpenInference hooks into OpenAI SDK calls seamlessly

### Configuration

Set up your environment variables:

<CodeGroup>
  ```python title="Environment Setup"
  import os

  # Set your OpenRouter API key
  os.environ["OPENAI_API_KEY"] = "${API_KEY_REF}"
  ```
</CodeGroup>

### Simple LLM Call

Initialize Arize and instrument your OpenAI client to automatically trace OpenRouter calls:

<CodeGroup>
  ```python title="Basic Integration"
  from arize.otel import register
  from openinference.instrumentation.openai import OpenAIInstrumentor
  import openai

  # Initialize Arize and register the tracer provider
  tracer_provider = register(
      space_id="your-space-id",
      api_key="your-arize-api-key",
      project_name="your-project-name",
  )

  # Instrument OpenAI SDK
  OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

  # Configure OpenAI client for OpenRouter
  client = openai.OpenAI(
      base_url="https://openrouter.ai/api/v1",
      api_key="your_openrouter_api_key",
      default_headers={
          "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional: Your site URL
          "X-Title": "<YOUR_SITE_NAME>",      # Optional: Your site name
      }
  )

  # Make a traced chat completion request
  response = client.chat.completions.create(
      model="meta-llama/llama-3.1-8b-instruct:free",
      messages=[
          {"role": "user", "content": "Write a haiku about observability."}
      ],
  )

  # Print the assistant's reply
  print(response.choices[0].message.content)
  ```
</CodeGroup>

### What Gets Traced

All OpenRouter model calls are automatically traced and include:

* Request/response data and timing
* Model name and provider information
* Token usage and cost data (when supported)
* Error handling and debugging information

### JavaScript/TypeScript Support

OpenInference also provides instrumentation for the OpenAI JavaScript/TypeScript SDK, which works with OpenRouter. For setup and examples, please refer to the [OpenInference JavaScript examples for OpenAI](https://github.com/Arize-ai/openinference/tree/main/js).

### Common Issues

* **API Key**: Use your OpenRouter API key, not OpenAI's
* **Model Names**: Use exact model names from [OpenRouter's model list](https://openrouter.ai/models)
* **Rate Limits**: Check your OpenRouter dashboard for usage limits

### Learn More

* **Arize OpenRouter Integration**: [https://arize.com/docs/ax/integrations/llm-providers/openrouter/openrouter-tracing](https://arize.com/docs/ax/integrations/llm-providers/openrouter/openrouter-tracing)
* **OpenRouter Quick Start Guide**: [https://openrouter.ai/docs/quickstart](https://openrouter.ai/docs/quickstart)
* **OpenInference OpenAI Instrumentation**: [https://github.com/Arize-ai/openinference/tree/main/python/instrumentation/openinference-instrumentation-openai](https://github.com/Arize-ai/openinference/tree/main/python/instrumentation/openinference-instrumentation-openai)
