# Ronin Demo Mode Proxy

AWS Lambda function that provides demo mode AI access for Ronin users without API keys.

## Architecture

```
Ronin Desktop → Lambda Function URL → OpenRouter API
                      ↓
                  DynamoDB (Rate Limits)
                      ↓
               Parameter Store (Master Key)
```

## Features

- **Streaming responses** via `awslambda.streamifyResponse()`
- **Rate limiting**: 10 requests/hour, 50 requests/day, 4000 tokens/request
- **Privacy-preserving fingerprinting**: SHA-256 hash of IP + User-Agent
- **Cost optimized**: ARM64 Graviton2, <1MB bundle size
- **Secure**: Master API key in AWS SSM Parameter Store (encrypted)

## Setup

### Prerequisites

- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed (`pip install aws-sam-cli`)
- Node.js 20.x

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Store master API key in Parameter Store:**
   ```bash
   aws ssm put-parameter \
     --name /ronin/demo/openrouter-api-key \
     --value "your-openrouter-api-key" \
     --type SecureString \
     --description "Master OpenRouter API key for Ronin Demo Mode"
   ```

3. **Build and deploy:**
   ```bash
   sam build
   sam deploy --guided
   ```

   During deployment, save the **Lambda Function URL** from outputs - this is needed for the Ronin desktop app configuration.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY_PARAM` | SSM parameter name | `/ronin/demo/openrouter-api-key` |
| `DYNAMODB_TABLE` | Rate limit table name | `ronin-demo-rate-limits` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `tauri://localhost,https://tauri.localhost` |

## Rate Limiting

| Limit Type | Threshold | Storage |
|------------|-----------|---------|
| Hourly requests | 10 | DynamoDB (1h TTL) |
| Daily requests | 50 | DynamoDB (24h TTL) |
| Token limit | 4000 | Per-request validation |
| Payload size | 20KB | Lambda config |

**Fingerprint Strategy:**
- **Generation**: SHA-256 hash of `{IP}:{User-Agent}`
- **Privacy**: Not reversible, truncated to 32 chars
- **Stability**: Consistent per user/machine combination

## Testing

### Local testing with SAM:
```bash
sam local start-api
```

### Unit tests:
```bash
npm test
```

### Integration test (manual):
```bash
curl -X POST https://your-lambda-url.lambda-url.us-east-1.on.aws \
  -H "Content-Type: application/json" \
  -H "X-Client-Fingerprint: test-fingerprint-123" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

## Monitoring

### CloudWatch Dashboards

1. **Lambda Performance:**
   - Cold start duration (<500ms target)
   - Invocation count
   - Error rate
   - Throttles

2. **DynamoDB:**
   - Read/write capacity
   - Throttled requests
   - Item count

3. **Cost Monitoring:**
   - Lambda invocations
   - OpenRouter spend (via logs)
   - Budget alert at $80/month (80% of $100)

### Logs

CloudWatch log group: `/aws/lambda/ronin-demo-proxy`

**Log retention**: 7 days

**What's logged:**
- Timestamp
- Fingerprint hash (privacy-preserving)
- Response status
- Rate limit hits

**What's NOT logged (privacy):**
- User context payloads
- IP addresses (plain text)
- User-Agent headers

## Deployment

### Production deployment:
```bash
sam deploy --config-env production
```

### Update Lambda code only (faster):
```bash
npm run build
sam deploy --no-confirm-changeset
```

### Rollback:
```bash
aws lambda update-function-code \
  --function-name ronin-demo-proxy \
  --s3-bucket your-deployment-bucket \
  --s3-key previous-version.zip
```

## Cost Estimation

**Per-user (10 requests/hour max):**
- Lambda: ~$0.0001 per request (512MB, 10s avg, ARM64)
- DynamoDB: ~$0.000001 per request (on-demand)
- OpenRouter: ~$0.01 per request (4000 tokens, free tier models)

**Monthly estimate (1000 demo users, 10 req each):**
- Lambda: $1.00
- DynamoDB: $0.01
- OpenRouter: $100 (V's budget - capped by rate limits)
- **Total: ~$101/month**

## Security

### Master API Key Protection
- Stored in AWS Systems Manager Parameter Store
- Encrypted with AWS KMS
- Lambda IAM role has `ssm:GetParameter` only
- Key cached in Lambda memory (not re-fetched per request)
- **Key rotation**: Quarterly (manual process)

### Abuse Prevention
- Rate limiting (10/hour, 50/day, 4000 tokens)
- Request body size limit (20KB)
- Response timeout (30s)
- CORS restricts to Ronin origins
- Invalid requests return 400 (not processed)

### Privacy (義 Gi - Righteous)
- Context payloads NOT logged
- Fingerprints hashed (not reversible)
- No PII in DynamoDB
- CloudWatch logs contain only: timestamp, fingerprint hash, response status

## Troubleshooting

### Cold starts too slow
- Check bundle size: `du -h dist/index.mjs` (should be <1MB)
- Verify ARM64 architecture in template.yaml
- Consider provisioned concurrency for critical periods

### Rate limit not working
- Check DynamoDB table exists and is accessible
- Verify Lambda IAM role has DynamoDB permissions
- Check TTL attribute is enabled on table

### Master API key errors
- Verify Parameter Store parameter exists
- Check Lambda IAM role has `ssm:GetParameter` permission
- Ensure parameter name matches `OPENROUTER_API_KEY_PARAM` env var

### CORS errors
- Verify `ALLOWED_ORIGINS` includes client origin
- Check Lambda Function URL CORS configuration
- Test with both `tauri://localhost` and `https://tauri.localhost`

## Development

### Local development setup:
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build bundle
npm run build

# Start SAM local API
sam local start-api
```

### Code structure:
```
serverless/demo-proxy/
├── index.mjs           # Lambda handler (streaming)
├── ratelimit.mjs       # Rate limiting logic
├── package.json        # Dependencies
├── esbuild.config.js   # Bundle optimization
├── template.yaml       # AWS SAM template
└── README.md          # This file
```

## Support

For issues or questions:
- Check CloudWatch Logs: `/aws/lambda/ronin-demo-proxy`
- Review CloudWatch Alarms for throttles/errors
- Consult story file: `docs/sprint-artifacts/4.25-2-aws-lambda-demo-mode-proxy.md`

## License

Part of Ronin project - see main repository for license
