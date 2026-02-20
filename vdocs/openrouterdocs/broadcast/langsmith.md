# LangSmith

> Connect LangSmith to automatically receive traces from your OpenRouter requests. Step-by-step setup guide for LangSmith integration.

[LangSmith](https://smith.langchain.com) is LangChain's platform for debugging, testing, evaluating, and monitoring LLM applications.

## Step 1: Get your LangSmith API key and Project name

In LangSmith, go to **Settings > API Keys** to create a new API key. Then navigate to your project or create a new one to get the project name.

## Step 2: Enable Broadcast in OpenRouter

Go to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) and toggle **Enable Broadcast**.

![Enable Broadcast](file:83d15c4f-b860-4355-a142-b8ecdd1bf209)

## Step 3: Configure LangSmith

Click the edit icon next to **LangSmith** and enter:

* **Api Key**: Your LangSmith API key (starts with `lsv2_pt_...`)
* **Project**: Your LangSmith project name
* **Endpoint** (optional): Default is `https://api.smith.langchain.com`. Change for self-hosted instances

## Step 4: Test and save

Click **Test Connection** to verify the setup. The configuration only saves if the test passes.

## Step 5: Send a test trace

Make an API request through OpenRouter and view the trace in LangSmith. Your traces will appear in the specified project with full details including:

* Input and output messages
* Token usage (prompt, completion, and total tokens)
* Cost information
* Model and provider information
* Timing and latency metrics

## What data is sent

OpenRouter sends traces to LangSmith using the OpenTelemetry (OTEL) protocol with the following attributes:

* **GenAI semantic conventions**: Model name, token counts, costs, and request parameters
* **LangSmith-specific attributes**: Trace name, span kind, user ID, and custom metadata
* **Error handling**: Exception events with error types and messages when requests fail

<Tip>
  LangSmith uses the OTEL endpoint at `/otel/v1/traces` for receiving trace data. This ensures compatibility with LangSmith's native tracing infrastructure.
</Tip>
