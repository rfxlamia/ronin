# Datadog

> Connect Datadog LLM Observability to automatically receive traces from your OpenRouter requests. Step-by-step setup guide for Datadog integration.

With [Datadog LLM Observability](https://docs.datadoghq.com/llm_observability), you can investigate the root cause of issues, monitor operational performance, and evaluate the quality, privacy, and safety of your LLM applications.

## Step 1: Create a Datadog API key

In Datadog, go to **Organization Settings > API Keys** and create a new key.

## Step 2: Enable Broadcast in OpenRouter

Go to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) and toggle **Enable Broadcast**.

![Enable Broadcast](file:83d15c4f-b860-4355-a142-b8ecdd1bf209)

## Step 3: Configure Datadog

Click the edit icon next to **Datadog** and enter:

* **Api Key**: Your Datadog API key
* **Ml App**: A name for your application (e.g., "production-app")
* **Url** (optional): Default is `https://api.us5.datadoghq.com`. Change for other regions

![Datadog Configuration](file:62e2b290-4241-4f2e-9090-75f60d420c99)

## Step 4: Test and save

Click **Test Connection** to verify the setup. The configuration only saves if the test passes.

![Datadog Configured](file:0bbbd1bf-a915-4e30-ae5c-13ed7aa5c96d)

## Step 5: Send a test trace

Make an API request through OpenRouter and view the trace in Datadog.

![Datadog Trace](file:aae86efa-681f-4090-ae15-63041e13b6d5)
