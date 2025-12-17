# W&B Weave

> Connect W&B Weave to automatically receive traces from your OpenRouter requests. Step-by-step setup guide for W&B Weave integration.

[Weights & Biases Weave](https://wandb.ai/site/weave) is an observability platform for tracking and evaluating LLM applications.

## Step 1: Get your W\&B API key

In W\&B, go to your [User Settings](https://wandb.ai/settings) and copy your API key.

## Step 2: Enable Broadcast in OpenRouter

Go to [Settings > Broadcast](https://openrouter.ai/settings/broadcast) and toggle **Enable Broadcast**.

![Enable Broadcast](file:83d15c4f-b860-4355-a142-b8ecdd1bf209)

## Step 3: Configure W\&B Weave

Click the edit icon next to **W\&B Weave** and enter:

* **Api Key**: Your W\&B API key
* **Entity**: Your W\&B username or team name
* **Project**: The project name where traces will be logged
* **Base Url** (optional): Default is `https://trace.wandb.ai`

![W\&B Weave Configuration](file:4860a5a4-0057-4ff1-8986-7b09d0a914ac)

## Step 4: Test and save

Click **Test Connection** to verify the setup. The configuration only saves if the test passes.

![W\&B Weave Configured](file:a8560b97-3dbf-4624-a9b3-1f5d1ebaa65b)

## Step 5: Send a test trace

Make an API request through OpenRouter and view the trace in W\&B Weave.

![W\&B Weave Trace](file:fc904b4d-7bd9-403b-829e-3daaa9ca75c0)
