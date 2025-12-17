# Image Generation

> Generate images using AI models through the OpenRouter API.

OpenRouter supports image generation through models that have `"image"` in their `output_modalities`. These models can create images from text prompts when you specify the appropriate modalities in your request.

## Model Discovery

You can find image generation models in several ways:

### On the Models Page

Visit the [Models page](/models) and filter by output modalities to find models capable of image generation. Look for models that list `"image"` in their output modalities.

### In the Chatroom

When using the [Chatroom](/chat), click the **Image** button to automatically filter and select models with image generation capabilities. If no image-capable model is active, you'll be prompted to add one.

## API Usage

To generate images, send a request to the `/api/v1/chat/completions` endpoint with the `modalities` parameter set to include both `"image"` and `"text"`.

### Basic Image Generation

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemini-2.5-flash-image-preview'
}}
>
  <CodeGroup>
    ```typescript title="TypeScript SDK"
    import { OpenRouter } from '@openrouter/sdk';

    const openRouter = new OpenRouter({
      apiKey: '{{API_KEY_REF}}',
    });

    const result = await openRouter.chat.send({
      model: '{{MODEL}}',
      messages: [
        {
          role: 'user',
          content: 'Generate a beautiful sunset over mountains',
        },
      ],
      modalities: ['image', 'text'],
      stream: false,
    });

    // The generated image will be in the assistant message
    if (result.choices) {
      const message = result.choices[0].message;
      if (message.images) {
        message.images.forEach((image, index) => {
          const imageUrl = image.imageUrl.url; // Base64 data URL
          console.log(`Generated image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
        });
      }
    }
    ```

    ```python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {
                "role": "user",
                "content": "Generate a beautiful sunset over mountains"
            }
        ],
        "modalities": ["image", "text"]
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    # The generated image will be in the assistant message
    if result.get("choices"):
        message = result["choices"][0]["message"]
        if message.get("images"):
            for image in message["images"]:
                image_url = image["image_url"]["url"]  # Base64 data URL
                print(f"Generated image: {image_url[:50]}...")
    ```

    ```typescript title="TypeScript (fetch)"
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: 'Generate a beautiful sunset over mountains',
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    const result = await response.json();

    // The generated image will be in the assistant message
    if (result.choices) {
      const message = result.choices[0].message;
      if (message.images) {
        message.images.forEach((image, index) => {
          const imageUrl = image.image_url.url; // Base64 data URL
          console.log(`Generated image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
        });
      }
    }
    ```
  </CodeGroup>
</Template>

### Image Aspect Ratio Configuration

Gemini image-generation models let you request specific aspect ratios by setting `image_config.aspect_ratio`. Read more about using Gemini Image Gen models here: [https://ai.google.dev/gemini-api/docs/image-generation](https://ai.google.dev/gemini-api/docs/image-generation)

**Supported aspect ratios:**

* `1:1` → 1024×1024 (default)
* `2:3` → 832×1248
* `3:2` → 1248×832
* `3:4` → 864×1184
* `4:3` → 1184×864
* `4:5` → 896×1152
* `5:4` → 1152×896
* `9:16` → 768×1344
* `16:9` → 1344×768
* `21:9` → 1536×672

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemini-2.5-flash-image-preview'
}}
>
  <CodeGroup>
    ```python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {
                "role": "user",
                "content": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
            }
        ],
        "modalities": ["image", "text"],
        "image_config": {
            "aspect_ratio": "16:9"
        }
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if result.get("choices"):
        message = result["choices"][0]["message"]
        if message.get("images"):
            for image in message["images"]:
                image_url = image["image_url"]["url"]
                print(f"Generated image: {image_url[:50]}...")
    ```

    ```typescript
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: 'Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme',
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '16:9',
        },
      }),
    });

    const result = await response.json();

    if (result.choices) {
      const message = result.choices[0].message;
      if (message.images) {
        message.images.forEach((image, index) => {
          const imageUrl = image.image_url.url;
          console.log(`Generated image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
        });
      }
    }
    ```
  </CodeGroup>
</Template>

### Streaming Image Generation

Image generation also works with streaming responses:

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemini-2.5-flash-image-preview'
}}
>
  <CodeGroup>
    ```python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {
                "role": "user",
                "content": "Create an image of a futuristic city"
            }
        ],
        "modalities": ["image", "text"],
        "stream": True
    }

    response = requests.post(url, headers=headers, json=payload, stream=True)

    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                if data != '[DONE]':
                    try:
                        chunk = json.loads(data)
                        if chunk.get("choices"):
                            delta = chunk["choices"][0].get("delta", {})
                            if delta.get("images"):
                                for image in delta["images"]:
                                    print(f"Generated image: {image['image_url']['url'][:50]}...")
                    except json.JSONDecodeError:
                        continue
    ```

    ```typescript
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: 'Create an image of a futuristic city',
          },
        ],
        modalities: ['image', 'text'],
        stream: true,
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices) {
                const delta = parsed.choices[0].delta;
                if (delta?.images) {
                  delta.images.forEach((image, index) => {
                    console.log(`Generated image ${index + 1}: ${image.image_url.url.substring(0, 50)}...`);
                  });
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }
    ```
  </CodeGroup>
</Template>

## Response Format

When generating images, the assistant message includes an `images` field containing the generated images:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "I've generated a beautiful sunset image for you.",
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
            }
          }
        ]
      }
    }
  ]
}
```

### Image Format

* **Format**: Images are returned as base64-encoded data URLs
* **Types**: Typically PNG format (`data:image/png;base64,`)
* **Multiple Images**: Some models can generate multiple images in a single response
* **Size**: Image dimensions vary by model capabilities

## Model Compatibility

Not all models support image generation. To use this feature:

1. **Check Output Modalities**: Ensure the model has `"image"` in its `output_modalities`
2. **Set Modalities Parameter**: Include `"modalities": ["image", "text"]` in your request
3. **Use Compatible Models**: Examples include:
   * `google/gemini-2.5-flash-image-preview`
   * `black-forest-labs/flux.2-pro`
   * `black-forest-labs/flux.2-flex`
   * `sourceful/riverflow-v2-standard-preview`
   * Other models with image generation capabilities

## Best Practices

* **Clear Prompts**: Provide detailed descriptions for better image quality
* **Model Selection**: Choose models specifically designed for image generation
* **Error Handling**: Check for the `images` field in responses before processing
* **Rate Limits**: Image generation may have different rate limits than text generation
* **Storage**: Consider how you'll handle and store the base64 image data

## Troubleshooting

**No images in response?**

* Verify the model supports image generation (`output_modalities` includes `"image"`)
* Ensure you've included `"modalities": ["image", "text"]` in your request
* Check that your prompt is requesting image generation

**Model not found?**

* Use the [Models page](/models) to find available image generation models
* Filter by output modalities to see compatible models
