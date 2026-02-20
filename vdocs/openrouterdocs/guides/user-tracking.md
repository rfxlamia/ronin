# User Tracking

> Learn how to use the user parameter to track your own user IDs with OpenRouter. Improve caching performance and get detailed reporting on your sub-users.

The OpenRouter API supports **User Tracking** through the optional `user` parameter, allowing you to track your own user IDs and improve your application's performance and reporting capabilities.

## What is User Tracking?

User tracking enables you to specify an arbitrary string identifier for your end-users in API requests. This optional metadata helps OpenRouter understand your sub-users, leading to several benefits:

1. **Improved Caching**: OpenRouter can make caches sticky to your individual users, improving load-balancing and throughput
2. **Enhanced Reporting**: View detailed analytics and activity feeds broken down by your user IDs

## How It Works

Simply include a `user` parameter in your API requests with any string identifier that represents your end-user. This could be a user ID, email hash, session identifier, or any other stable identifier you use in your application.

```json
{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "user": "user_12345"
}
```

## Benefits

### Improved Caching Performance

When you consistently use the same user identifier for a specific user, OpenRouter can optimize caching to be "sticky" to that user. This means:

* A given user of your application (assuming you are using caching) will always get routed to the same provider and the cache will stay warm
* But separate users can be spread over different providers, improving load-balancing and throughput

### Enhanced Reporting and Analytics

The user parameter is available in the /activity page, in the exports from that page, and in the /generations API.

* **Activity Feed**: View requests broken down by user ID in your OpenRouter dashboard
* **Usage Analytics**: Understand which users are making the most requests
* **Export Data**: Get detailed exports that include user-level breakdowns

## Implementation Example

<Template
  data={{
  API_KEY_REF,
  MODEL: "openai/gpt-4o"
}}
>
  <CodeGroup>
    ```typescript title="TypeScript SDK"
    import { OpenRouter } from '@openrouter/sdk';

    const openRouter = new OpenRouter({
      apiKey: '{{API_KEY_REF}}',
    });

    const response = await openRouter.chat.send({
      model: '{{MODEL}}',
      messages: [
        {
          role: 'user',
          content: "What's the weather like today?",
        },
      ],
      user: 'user_12345', // Your user identifier
      stream: false,
    });

    console.log(response.choices[0].message.content);
    ```

    ```python title="Python (OpenAI SDK)"
    from openai import OpenAI

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key="{{API_KEY_REF}}",
    )

    response = client.chat.completions.create(
        model="{{MODEL}}",
        messages=[
            {"role": "user", "content": "What's the weather like today?"}
        ],
        user="user_12345",  # Your user identifier
    )

    print(response.choices[0].message.content)
    ```

    ```typescript title="TypeScript (OpenAI SDK)"
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '{{API_KEY_REF}}',
    });

    async function chatWithUserTracking() {
      const response = await openai.chat.completions.create({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: "What's the weather like today?",
          },
        ],
        user: 'user_12345', // Your user identifier
      });

      console.log(response.choices[0].message.content);
    }

    chatWithUserTracking();
    ```
  </CodeGroup>
</Template>

## Best Practices

### Choose Stable Identifiers

Use consistent, stable identifiers for the same user across requests:

* **Good**: `user_12345`, `customer_abc123`, `account_xyz789`
* **Avoid**: Random strings that change between requests

### Consider Privacy

When using user identifiers, consider privacy implications:

* Use internal user IDs rather than exposing personal information
* Avoid including personally identifiable information in user identifiers
* Consider using anonymized identifiers for better privacy protection

### Be Consistent

Use the same user identifier format throughout your application:

```python
# Consistent format
user_id = f"app_{internal_user_id}"
```
