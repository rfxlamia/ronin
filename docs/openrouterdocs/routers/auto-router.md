# Auto Router

> Automatically select the best AI model for your prompts using OpenRouter's Auto Router powered by NotDiamond.

The [Auto Router](https://openrouter.ai/openrouter/auto) (`openrouter/auto`) automatically selects the best model for your prompt, powered by [NotDiamond](https://www.notdiamond.ai/).

## Overview

Instead of manually choosing a model, let the Auto Router analyze your prompt and select the optimal model from a curated set of high-quality options. The router considers factors like prompt complexity, task type, and model capabilities.

## Usage

Set your model to `openrouter/auto`:

<CodeGroup>
  ```typescript title="TypeScript SDK"
  import { OpenRouter } from '@openrouter/sdk';

  const openRouter = new OpenRouter({
    apiKey: '<OPENROUTER_API_KEY>',
  });

  const completion = await openRouter.chat.send({
    model: 'openrouter/auto',
    messages: [
      {
        role: 'user',
        content: 'Explain quantum entanglement in simple terms',
      },
    ],
  });

  console.log(completion.choices[0].message.content);
  // Check which model was selected
  console.log('Model used:', completion.model);
  ```

  ```typescript title="TypeScript (fetch)"
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <OPENROUTER_API_KEY>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [
        {
          role: 'user',
          content: 'Explain quantum entanglement in simple terms',
        },
      ],
    }),
  });

  const data = await response.json();
  console.log(data.choices[0].message.content);
  // Check which model was selected
  console.log('Model used:', data.model);
  ```

  ```python title="Python"
  import requests
  import json

  response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
      "Authorization": "Bearer <OPENROUTER_API_KEY>",
      "Content-Type": "application/json",
    },
    data=json.dumps({
      "model": "openrouter/auto",
      "messages": [
        {
          "role": "user",
          "content": "Explain quantum entanglement in simple terms"
        }
      ]
    })
  )

  data = response.json()
  print(data['choices'][0]['message']['content'])
  # Check which model was selected
  print('Model used:', data['model'])
  ```
</CodeGroup>

## Response

The response includes the `model` field showing which model was actually used:

```json
{
  "id": "gen-...",
  "model": "anthropic/claude-sonnet-4.5",  // The model that was selected
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165
  }
}
```

## How It Works

1. **Prompt Analysis**: Your prompt is analyzed by NotDiamond's routing system
2. **Model Selection**: The optimal model is selected based on the task requirements
3. **Request Forwarding**: Your request is forwarded to the selected model
4. **Response Tracking**: The response includes metadata showing which model was used

## Supported Models

The Auto Router selects from a curated set of high-quality models including:

<Callout intent="warning">
  Model slugs change as new versions are released. The examples below are current as of December 4, 2025. Check the [models page](https://openrouter.ai/models) for the latest available models.
</Callout>

* Claude Sonnet 4.5 (`anthropic/claude-sonnet-4.5`)
* Claude Opus 4.5 (`anthropic/claude-opus-4.5`)
* GPT-5.1 (`openai/gpt-5.1`)
* Gemini 3 Pro (`google/gemini-3-pro-preview`)
* DeepSeek 3.2 (`deepseek/deepseek-v3.2`)
* And other top-performing models

The exact model pool may be updated as new models become available.

## Pricing

You pay the standard rate for whichever model is selected. There is no additional fee for using the Auto Router.

## Use Cases

* **General-purpose applications**: When you don't know what types of prompts users will send
* **Cost optimization**: Let the router choose efficient models for simpler tasks
* **Quality optimization**: Ensure complex prompts get routed to capable models
* **Experimentation**: Discover which models work best for your use case

## Limitations

* The router requires `messages` format (not `prompt`)
* Streaming is supported
* All standard OpenRouter features (tool calling, etc.) work with the selected model

## Related

* [Body Builder](/docs/guides/features/routers/body-builder) - Generate multiple parallel API requests
* [Model Fallbacks](/docs/guides/routing/model-fallbacks) - Configure fallback models
* [Provider Selection](/docs/guides/routing/provider-selection) - Control which providers are used
