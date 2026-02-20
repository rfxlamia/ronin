# OpenAI SDK

> Integrate OpenRouter using the official OpenAI SDK. Complete guide for OpenAI SDK integration with OpenRouter for Python and TypeScript.

## Using the OpenAI SDK

* Using `pip install openai`: [github](https://github.com/OpenRouterTeam/openrouter-examples-python/blob/main/src/openai_test.py).
* Using `npm i openai`: [github](https://github.com/OpenRouterTeam/openrouter-examples/blob/main/examples/openai/index.ts).
  <Tip>
    You can also use
    [Grit](https://app.grit.io/studio?key=RKC0n7ikOiTGTNVkI8uRS) to
    automatically migrate your code. Simply run `npx @getgrit/launcher
      openrouter`.
  </Tip>

<CodeGroup>
  ```typescript title="TypeScript"
  import OpenAI from "openai"

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: "${API_KEY_REF}",
    defaultHeaders: {
      ${getHeaderLines().join('\n        ')}
    },
  })

  async function main() {
    const completion = await openai.chat.completions.create({
      model: "${Model.GPT_4_Omni}",
      messages: [
        { role: "user", content: "Say this is a test" }
      ],
    })

    console.log(completion.choices[0].message)
  }
  main();
  ```

  ```python title="Python"
  from openai import OpenAI
  from os import getenv

  # gets API Key from environment variable OPENAI_API_KEY
  client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=getenv("OPENROUTER_API_KEY"),
  )

  completion = client.chat.completions.create(
    model="${Model.GPT_4_Omni}",
    extra_headers={
      "HTTP-Referer": "<YOUR_SITE_URL>", # Optional. Site URL for rankings on openrouter.ai.
      "X-Title": "<YOUR_SITE_NAME>", # Optional. Site title for rankings on openrouter.ai.
    },
    # pass extra_body to access OpenRouter-only arguments.
    # extra_body={
      # "models": [
      #   "${Model.GPT_4_Omni}",
      #   "${Model.Mixtral_8x_22B_Instruct}"
      # ]
    # },
    messages=[
      {
        "role": "user",
        "content": "Say this is a test",
      },
    ],
  )
  print(completion.choices[0].message.content)
  ```
</CodeGroup>
