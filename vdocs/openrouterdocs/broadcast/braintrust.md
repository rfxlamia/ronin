# Braintrust

> Connect Braintrust to automatically receive traces from your OpenRouter requests. Step-by-step setup guide for Braintrust integration.

[Braintrust](https://www.braintrust.dev) is an end-to-end platform for evaluating, monitoring, and improving LLM applications.

## Step 1: Get your Braintrust API key and Project ID

In Braintrust, go to your [Account Settings](https://www.braintrust.dev/app/settings) to create an API key, and find your Project ID in your project's settings.

## Step 2: Enable Broadcast in OpenRouter

Go to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) and toggle **Enable Broadcast**.

![Enable Broadcast](file:83d15c4f-b860-4355-a142-b8ecdd1bf209)

## Step 3: Configure Braintrust

Click the edit icon next to **Braintrust** and enter:

* **Api Key**: Your Braintrust API key
* **Project Id**: Your Braintrust project ID
* **Base Url** (optional): Default is `https://api.braintrust.dev`

![Braintrust Configuration](file:7306ab4c-9114-4abf-972f-ffc359d23224)

## Step 4: Test and save

Click **Test Connection** to verify the setup. The configuration only saves if the test passes.

![Braintrust Configured](file:60f8ae9b-b3b4-4281-b76a-2f3f2333610c)

## Step 5: Send a test trace

Make an API request through OpenRouter and view the trace in Braintrust.

![Braintrust Trace](file:0f537fc7-13f4-460a-84fe-8ca9ca940fd4)
