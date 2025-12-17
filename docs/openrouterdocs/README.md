# OpenRouter Documentation

> Unofficial documentation for [OpenRouter](https://openrouter.ai), a unified interface for LLMs.

**OpenRouter** provides a standardized API to access 400+ AI models from top providers like OpenAI, Anthropic, Google, and Meta, along with open-source models. It simplifies model access with a single API key, consolidated billing, and intelligent routing.

## 🚀 Quick Start

OpenRouter is a drop-in replacement for the OpenAI API. You can use the official OpenRouter SDK or standard OpenAI client libraries.

### Installation

**Node.js / TypeScript**
```bash
npm install @openrouter/sdk
```

### Basic Usage

**TypeScript (using OpenRouter SDK)**
```typescript
import { OpenRouter } from '@openrouter/sdk';

const openRouter = new OpenRouter({
  apiKey: '<OPENROUTER_API_KEY>',
});

const completion = await openRouter.chat.send({
  model: 'openai/gpt-4o',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life?',
    },
  ],
});

console.log(completion.choices[0].message.content);
```

**Python (using requests)**
```python
import requests
import json

response = requests.post(
  url="https://openrouter.ai/api/v1/chat/completions",
  headers={
    "Authorization": "Bearer <OPENROUTER_API_KEY>",
    # Optional app attribution for rankings
    "HTTP-Referer": "<YOUR_SITE_URL>",
    "X-Title": "<YOUR_SITE_NAME>", 
  },
  data=json.dumps({
    "model": "openai/gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })
)
print(response.json())
```

## ✨ Key Features

*   **Unified API:** Access hundreds of models through a single, standard OpenAI-compatible endpoint.
*   **Best Prices & Uptime:** OpenRouter scouts for the lowest prices and highest throughput across dozens of providers.
*   **Auto-Routing:** Automatically fallback to other providers if one is down or rate-limited.
*   **Consolidated Billing:** Pay for all model usage with a single credit balance.
*   **No Vendor Lock-in:** Switch between models and providers without changing your code.

## 📚 Documentation Structure

This repository contains the source for OpenRouter's documentation:

*   **[Quickstart](quickstart.md):** Get up and running in minutes.
*   **[Models](models.md):** Browse supported models and API details.
*   **[Auth](auth/):** Authentication methods including OAuth and BYOK (Bring Your Own Key).
*   **[Guides](guides/):** In-depth guides for specific use cases.
*   **[Best Practices](best-practices/):** Optimization tips for latency, caching, and costs.
*   **[Multimodal](multimodal/):** Using image, audio, video, and PDF inputs.

## 🔗 Integrations

OpenRouter integrates with popular frameworks:

*   **LangChain**
*   **Vercel AI SDK**
*   **LlamaIndex**
*   **OpenAI SDK**

See the [Frameworks Overview](community/frameworks-and-integrations-overview.md) for more details.

## 💬 Community & Support

*   **Discord:** Join the [OpenRouter Discord](https://discord.gg/openrouter) for community support.
*   **Models:** Browse the [full list of models](https://openrouter.ai/models).
