# BYOK

> Learn how to use your existing AI provider keys with OpenRouter. Integrate your own API keys while leveraging OpenRouter's unified interface and features.

## Bring your own API Keys

OpenRouter supports both OpenRouter credits and the option to bring your own provider keys (BYOK).

When you use OpenRouter credits, your rate limits for each provider are managed by OpenRouter.

Using provider keys enables direct control over rate limits and costs via your provider account.

Your provider keys are securely encrypted and used for all requests routed through the specified provider.

Manage keys in your [account settings](/settings/integrations).

The cost of using custom provider keys on OpenRouter is **{bn(openRouterBYOKFee.fraction).times(100).toString()}% of what the same model/provider would cost normally on OpenRouter** and will be deducted from your OpenRouter credits.
This fee is waived for the first {toHumanNumber(BYOK_FEE_MONTHLY_REQUEST_THRESHOLD)} BYOK requests per-month.

### Key Priority and Fallback

OpenRouter always prioritizes using your provider keys when available. By default, if your key encounters a rate limit or failure, OpenRouter will fall back to using shared OpenRouter credits.

You can configure individual keys with "Always use this key" to prevent any fallback to OpenRouter credits. When this option is enabled, OpenRouter will only use your key for requests to that provider, which may result in rate limit errors if your key is exhausted, but ensures all requests go through your account.

### Azure API Keys

To use Azure AI Services with OpenRouter, you'll need to provide your Azure API key configuration in JSON format. Each key configuration requires the following fields:

```json
{
  "model_slug": "the-openrouter-model-slug",
  "endpoint_url": "https://<resource>.services.ai.azure.com/deployments/<model-id>/chat/completions?api-version=<api-version>",
  "api_key": "your-azure-api-key",
  "model_id": "the-azure-model-id"
}
```

You can find these values in your Azure AI Services resource:

1. **endpoint\_url**: Navigate to your Azure AI Services resource in the Azure portal. In the "Overview" section, you'll find your endpoint URL. Make sure to append `/chat/completions` to the base URL. You can read more in the [Azure Foundry documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/endpoints?tabs=python).

2. **api\_key**: In the same "Overview" section of your Azure AI Services resource, you can find your API key under "Keys and Endpoint".

3. **model\_id**: This is the name of your model deployment in Azure AI Services.

4. **model\_slug**: This is the OpenRouter model identifier you want to use this key for.

Since Azure supports multiple model deployments, you can provide an array of configurations for different models:

```json
[
  {
    "model_slug": "mistralai/mistral-large",
    "endpoint_url": "https://example-project.openai.azure.com/openai/deployments/mistral-large/chat/completions?api-version=2024-08-01-preview",
    "api_key": "your-azure-api-key",
    "model_id": "mistral-large"
  },
  {
    "model_slug": "openai/gpt-4o",
    "endpoint_url": "https://example-project.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview",
    "api_key": "your-azure-api-key",
    "model_id": "gpt-4o"
  }
]
```

Make sure to replace the url with your own project url. Also the url should end with /chat/completions with the api version that you would like to use.

### AWS Bedrock API Keys

To use Amazon Bedrock with OpenRouter, you can authenticate using either Bedrock API keys or traditional AWS credentials.

#### Option 1: Bedrock API Keys (Recommended)

Amazon Bedrock API keys provide a simpler authentication method. Simply provide your Bedrock API key as a string:

```
your-bedrock-api-key-here
```

**Note:** Bedrock API keys are tied to a specific AWS region and cannot be used to change regions. If you need to use models in different regions, use the AWS credentials option below.

You can generate Bedrock API keys in the AWS Management Console. Learn more in the [Amazon Bedrock API keys documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html).

#### Option 2: AWS Credentials

Alternatively, you can use traditional AWS credentials in JSON format. This option allows you to specify the region and provides more flexibility:

```json
{
  "accessKeyId": "your-aws-access-key-id",
  "secretAccessKey": "your-aws-secret-access-key",
  "region": "your-aws-region"
}
```

You can find these values in your AWS account:

1. **accessKeyId**: This is your AWS Access Key ID. You can create or find your access keys in the AWS Management Console under "Security Credentials" in your AWS account.

2. **secretAccessKey**: This is your AWS Secret Access Key, which is provided when you create an access key.

3. **region**: The AWS region where your Amazon Bedrock models are deployed (e.g., "us-east-1", "us-west-2").

Make sure your AWS IAM user or role has the necessary permissions to access Amazon Bedrock services. At minimum, you'll need permissions for:

* `bedrock:InvokeModel`
* `bedrock:InvokeModelWithResponseStream` (for streaming responses)

Example IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

For enhanced security, we recommend creating dedicated IAM users with limited permissions specifically for use with OpenRouter.

Learn more in the [AWS Bedrock Getting Started with the API](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api.html) documentation, [IAM Permissions Setup](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html) guide, or the [AWS Bedrock API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/welcome.html).

### Google Vertex API Keys

To use Google Vertex AI with OpenRouter, you'll need to provide your Google Cloud service account key in JSON format. The service account key should include all standard Google Cloud service account fields, with an optional `region` field for specifying the deployment region.

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account@your-project.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com",
  "region": "global"
}
```

You can find these values in your Google Cloud Console:

1. **Service Account Key**: Navigate to the Google Cloud Console, go to "IAM & Admin" > "Service Accounts", select your service account, and create/download a JSON key.

2. **region** (optional): Specify the region for your Vertex AI deployment. Use `"global"` to allow requests to run in any available region, or specify a specific region like `"us-central1"` or `"europe-west1"`.

Make sure your service account has the necessary permissions to access Vertex AI services:

* `aiplatform.endpoints.predict`
* `aiplatform.endpoints.streamingPredict` (for streaming responses)

Example IAM policy:

```json
{
  "bindings": [
    {
      "role": "roles/aiplatform.user",
      "members": [
        "serviceAccount:your-service-account@your-project.iam.gserviceaccount.com"
      ]
    }
  ]
}
```

Learn more in the [Google Cloud Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/start/introduction-unified-platform) and [Service Account setup guide](https://cloud.google.com/iam/docs/service-accounts-create).
