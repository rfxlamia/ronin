# LangChain

> Integrate OpenRouter using LangChain framework. Complete guide for LangChain integration with OpenRouter for Python and JavaScript.

## Using LangChain

LangChain provides a standard interface for working with chat models. You can use OpenRouter with LangChain by setting the `base_url` parameter to point to OpenRouter's API. For more details on LangChain's model interface, see the [LangChain Models documentation](https://docs.langchain.com/oss/python/langchain/models#initialize-a-model).

**Resources:**

* Using [LangChain for Python](https://github.com/langchain-ai/langchain): [github](https://github.com/alexanderatallah/openrouter-streamlit/blob/main/pages/2_Langchain_Quickstart.py)
* Using [LangChain.js](https://github.com/langchain-ai/langchainjs): [github](https://github.com/OpenRouterTeam/openrouter-examples/blob/main/examples/langchain/index.ts)
* Using [Streamlit](https://streamlit.io/): [github](https://github.com/alexanderatallah/openrouter-streamlit)

<CodeGroup>
  ```typescript title="TypeScript"
  import { ChatOpenAI } from "@langchain/openai";
  import { HumanMessage, SystemMessage } from "@langchain/core/messages";

  const chat = new ChatOpenAI(
    {
      model: '<model_name>',
      temperature: 0.8,
      streaming: true,
      apiKey: '${API_KEY_REF}',
    },
    {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
        'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
      },
    },
  );

  // Example usage
  const response = await chat.invoke([
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage("Hello, how are you?"),
  ]);
  ```

  ```python title="Python (using init_chat_model)"
  from langchain.chat_models import init_chat_model
  from os import getenv
  from dotenv import load_dotenv

  load_dotenv()

  # Initialize the model with OpenRouter's base URL
  model = init_chat_model(
      model="<model_name>",
      model_provider="openai",
      base_url="https://openrouter.ai/api/v1",
      api_key=getenv("OPENROUTER_API_KEY"),
      default_headers={
          "HTTP-Referer": getenv("YOUR_SITE_URL"),  # Optional. Site URL for rankings on openrouter.ai.
          "X-Title": getenv("YOUR_SITE_NAME"),  # Optional. Site title for rankings on openrouter.ai.
      }
  )

  # Example usage
  response = model.invoke("What NFL team won the Super Bowl in the year Justin Bieber was born?")
  print(response.content)
  ```

  ```python title="Python (using ChatOpenAI directly)"
  from langchain_openai import ChatOpenAI
  from os import getenv
  from dotenv import load_dotenv

  load_dotenv()

  llm = ChatOpenAI(
      api_key=getenv("OPENROUTER_API_KEY"),
      base_url="https://openrouter.ai/api/v1",
      model="<model_name>",
      default_headers={
          "HTTP-Referer": getenv("YOUR_SITE_URL"),  # Optional. Site URL for rankings on openrouter.ai.
          "X-Title": getenv("YOUR_SITE_NAME"),  # Optional. Site title for rankings on openrouter.ai.
      }
  )

  # Example usage
  response = llm.invoke("What NFL team won the Super Bowl in the year Justin Bieber was born?")
  print(response.content)
  ```
</CodeGroup>
