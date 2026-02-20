# PydanticAI

> Integrate OpenRouter using PydanticAI framework. Complete guide for PydanticAI integration with OpenRouter for Python applications.

## Using PydanticAI

[PydanticAI](https://github.com/pydantic/pydantic-ai) provides a high-level interface for working with various LLM providers, including OpenRouter.

### Installation

```bash
pip install 'pydantic-ai-slim[openai]'
```

### Configuration

You can use OpenRouter with PydanticAI through its OpenAI-compatible interface:

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel

model = OpenAIModel(
    "anthropic/claude-3.5-sonnet",  # or any other OpenRouter model
    base_url="https://openrouter.ai/api/v1",
    api_key="sk-or-...",
)

agent = Agent(model)
result = await agent.run("What is the meaning of life?")
print(result)
```

For more details about using PydanticAI with OpenRouter, see the [PydanticAI documentation](https://ai.pydantic.dev/models/#api_key-argument).
