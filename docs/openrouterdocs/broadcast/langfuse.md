# Langfuse

> Connect Langfuse to automatically receive traces from your OpenRouter requests. Step-by-step setup guide for Langfuse integration.

[Langfuse](https://langfuse.com) is an open-source LLM engineering platform for tracing, evaluating, and debugging LLM applications.

## Step 1: Create a Langfuse API key

In Langfuse, go to your project's **Settings > API Keys** and create a new key pair. Copy both the Secret Key and Public Key.

![Langfuse API Keys](file:1ebbc0cd-4b25-41ce-bf2e-b2adcb36d5b6)

## Step 2: Enable Broadcast in OpenRouter

Go to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) and toggle **Enable Broadcast**.

![Enable Broadcast](file:83d15c4f-b860-4355-a142-b8ecdd1bf209)

## Step 3: Configure Langfuse

Click the edit icon next to **Langfuse** and enter:

* **Secret Key**: Your Langfuse Secret Key
* **Public Key**: Your Langfuse Public Key
* **Base URL** (optional): Default is `https://us.cloud.langfuse.com`. Change for other regions or self-hosted instances

![Langfuse Configuration](file:edc09232-9c2c-4aa1-ad61-e505f7426cba)

## Step 4: Test and save

Click **Test Connection** to verify the setup. The configuration only saves if the test passes.

![Langfuse Configured](file:41d48c58-891a-46c6-9e7e-50f2de21d9cf)

## Step 5: Send a test trace

Make an API request through OpenRouter and view the trace in Langfuse.

![Langfuse Trace](file:7b1950de-dd8d-43c5-ad60-706823ff831b)
