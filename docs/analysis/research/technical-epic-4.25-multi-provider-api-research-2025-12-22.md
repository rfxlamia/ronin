---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ['docs/sprint-artifacts/epic-4-retro-2025-12-22.md', 'docs/sprint-artifacts/epic-3-retro-2025-12-21.md']
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Epic 4.25 (Multi-Provider API + AWS Lambda)'
research_goals: 'Unified Client-Side API Integration, Comprehensive AWS Setup Guide for Demo Mode'
user_name: 'V'
date: '2025-12-22'
web_research_enabled: true
source_verification: true
---

## Technical Research Scope Confirmation

**Research Topic:** Epic 4.25 (Multi-Provider API + AWS Lambda)
**Research Goals:** Unified Client-Side API Integration, Comprehensive AWS Setup Guide for Demo Mode

**Technical Research Scope:**

- Architecture Analysis - Unified API patterns, AWS Serverless Proxy design
- Implementation Approaches - Client-side adapters, AWS Lambda deployment guide
- Technology Stack - OpenAI/Anthropic/Groq SDKs, AWS SAM/CDK
- Integration Patterns - API key management, rate limiting
- Performance Considerations - Cold starts, latency, cost analysis

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2025-12-22

## Technology Stack Analysis

### Programming Languages

- **TypeScript** (Frontend/Lambda): Primary language for the unified API client (React) and the AWS Lambda proxy (Node.js 20.x). Chosen for Vercel AI SDK compatibility and shared types between frontend and proxy.
- **Rust** (Tauri Backend): Continues to handle secure key storage (AES-256) and high-performance local context preparation (Git/Devlog analysis).
- **Node.js**: Runtime for the AWS Lambda function.

### Development Frameworks and Libraries

- **Vercel AI SDK (Core)**: Selected as the "Unified Interface" for client-side integration. Supports OpenAI, Anthropic, and Groq natively. Abstracts stream handling (UIStream) and provider differences.
- **OpenAI Node SDK**: Used as the base client for Groq (fully compatible).
- **Anthropic TS SDK**: Required for direct Anthropic integration.
- **AWS SAM (Serverless Application Model)**: Recommended for defining the AWS Lambda Demo Mode infrastructure (Infrastructure as Code). Simpler than CDK for single-function deployments.

### Database and Storage Technologies

- **SQLite (Rusqlite)**: Existing local database used for storing user's API keys (Encrypted).
- **Stateless Proxy**: The AWS Lambda function will be stateless, forwarding requests to providers using a server-side "Master Key" (Demo Mode) or user keys. No cloud database required.

### Development Tools and Platforms

- **AWS Lambda Function URL**: Selected for the Demo Mode proxy endpoints.
    - *Reasoning*: Supports 15-minute timeouts (critical for long chain-of-thought AI responses), native CORS support, and lower cost than API Gateway.
- **Cursor/VS Code**: Development environment.

### Cloud Infrastructure and Deployment

- **AWS Lambda**: Hosting the "Demo Mode" proxy.
- **AWS IAM**: Managing execution roles for the Lambda.
- **Serverless Pattern**: Request -> Lambda (Function URL) -> AI Provider.

### Technology Adoption Trends

- **Converging Schemas**: Providers (Groq, Mistral) are adopting OpenAI-compatible API schemas. Adaptation layers are thinning.
- **Client-Side Orchestration**: "Bring Your Own Key" apps standardizing on executing AI calls from the client (Tauri) to minimize server liability and latency.

## Integration Patterns Analysis

### API Design Patterns

- **Unified Interface**: The **Vercel AI SDK Core (`streamText`)** will serve as the standardized API surface. It abstracts provider specificities (OpenAI `chat.completions`, Anthropic `messages.create`) into a single fluent interface.
- **Streaming Response**: AI responses are inherently streaming. We will use **Server-Sent Events (SSE)** or **HTTP Chunked Transfer Encoding** to deliver tokens in real-time.
    - *AWS Lambda*: Must use the `awslambda.streamifyResponse()` decorator to enable true streaming from the Function URL (Node.js runtime).
- **Structured Outputs**: All three providers (OpenAI, Anthropic, Groq) now support JSON Schema enforcement (`response_format: { type: "json_schema" }`). We will leverage this for consistent tool usage and attribution data.

### Communication Protocols

- **HTTPS (TLS 1.3)**: Required for all API communication.
- **Stream Protocol**:
    - **Client <-> Lambda**: HTTP/1.1 Chunked Transfer (via Function URL).
    - **Lambda <-> Provider**: HTTPS Streaming (Provider SDKs handle this).
- **Error Handling Protocol**:
    - **429 Too Many Requests**: Propagate upstream rate limits to the client with `Retry-After` headers.
    - **401 Unauthorized**: Handle invalid API keys gracefully (distinguishing between User Key and Demo Key failures).

### Data Formats and Standards

- **JSON**: Primary data format for payloads.
- **Vercel AI SDK Stream Format**: The SDK uses a specific text stream format (`0:"text"`) for complex streams (tools, text, errors). The Lambda proxy must preserve or reconstruct this format if using `streamText` on the server.
    - *Optimization*: For simple text generation, raw text streaming reduces overhead. For "Thinking" mode (Epic 4.5), we will need the complex stream format.

### Integration Security Patterns

- **API Key Injection**:
    - *Client Side*: User's key (Encrypted in SQLite) -> Decrypted in Rust -> Sent to Vercel AI SDK.
    - *Demo Mode*: Application Server (Lambda) holds the "Master Key" in AWS Secrets Manager or Environment Variables. Client sends a "Demo Token" (optional JWT or simple nonce) to authorize usage.
- **Request Validation**: Zod schemas (via Vercel AI SDK) to validate input `messages` structure before calling upstream APIs.

### Microservices Integration

- **Monolithic Function**: The AWS Lambda will act as a "Monolithic Proxy" for simplicity. It handles:
    1.  Auth check (Demo limit).
    2.  Provider routing.
    3.  Streaming response.

## Architectural Patterns and Design

### System Architecture Patterns

- **Serverless Proxy Pattern (Function URL)**:
    - *Decision*: We will use the **Lambda Function URL** pattern instead of API Gateway.
    - *Rationale*:
        - **Simplicity**: Direct HTTP endpoint, no complex API Gateway configuration.
        - **Cost**: Eliminates API Gateway request costs (approx. $3.50/million requests), paying only for Lambda compute.
        - **Performance**: Removes one hop (Gateway -> Lambda), reducing latency.
        - **Constraints**: 15-minute timeout (Essential for AI), 6MB payload limit (Sufficient for text/tools).
- **Stateless Router**:
    - The Lambda function will act as a stateless router. It receives the request, authenticates the "Demo Token" (if present), injects the "Master API Key", and streams the request to the upstream provider (OpenAI/Anthropic).

### Design Principles and Best Practices

- **Thin Proxy**: The Lambda code should be minimal. Authorization -> Validation -> Transformation -> Streaming. Business logic stays in the Client (Tauri) or the Provider.
- **Isolate Dependencies**:
    - Use `esbuild` to tree-shake the Vercel AI SDK. We only need the core runtime and specific provider libraries.
- **Streaming First**:
    - All responses must be streamed. This is non-negotiable for AI UX (Perceived Latency).
    - Use `awslambda.streamifyResponse()` decorator (Node.js 18+) for true streaming without buffering.

### Scalability and Performance Patterns

- **Cold Start Optimization**:
    - *Issue*: Connectivity to AI providers + Vercel SDK loading can cause 1-2s cold starts.
    - *Mitigation*:
        1. **Minify/Bundle**: Use `esbuild` to produce a single `.js` file (< 1MB).
        2. **Lazy Loading**: Import provider SDKs only conditionally if possible (though for a proxy, we likely need them immediately).
        3. **TCP Re-use**: Keep connections to OpenAI/Anthropic alive across invocations if possible (default AWS Lambda behavior for global objects).
- **Concurrency**:
    - Lambda scales automatically. Soft limit is usually 1,000 concurrent executions.
    - *Risk*: A denial-of-service attack could exhaust this quota.
    - *Defense*: Set **Reserved Concurrency** for the Demo Function (e.g., limit to 50 or 100) to prevent it from starving other account functions.

### Security Architecture Patterns

- **Secret Injection**:
    - *Pattern*: Store Master API Keys in **AWS Systems Manager Parameter Store** (Standard/Free) or Environment Variables (encrypted at rest).
    - *Runtime*: Lambda loads keys into `process.env`.
- **CORS Policy**:
    - Strictly limit CORS `Allow-Origin` to the specific Ronin App ID or domain (if web-based). For the desktop app, allow `*` or specific headers if strictly local.
- **Least Privilege**:
    - The Lambda Execution Role should ONLY have permission to:
        1. Write to CloudWatch Logs.
        2. Decrypt/Read the specific API Key parameter.

### Deployment Architecture

- **Infrastructure as Code**:
    - Use **AWS SAM** (Serverless Application Model). It defaults to CloudFormation but provides a simplified syntax for Function URLs and permissions.
    - *Artifacts*: `template.yaml` (Infrastructure), `app.ts` (Code), `esbuild` config.

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

- **Migration to Vercel AI SDK Core**:
    - *Approach*: "Strangler Fig" pattern. We won't rewrite everything at once.
    - *Step 1*: Install `ai` and `@ai-sdk/openai` packages.
    - *Step 2*: Create a new `UnifiedClient` class that implements `streamText`.
    - *Step 3*: Replace the existing OpenRouter `fetch` calls in `src-tauri` with the new SDK calls ONE command at a time.
    - *Benefit*: The Vercel SDK standardizes error handling (Retries, Timeouts) and response parsing, removing our custom manual parsing logic.

### Development Workflows and Tooling

- **AWS SAM (Serverless Application Model)**:
    - *Repo Structure*: New `serverless/` folder in the monorepo.
    - *Local Dev*: Use `sam local start-api` to emulate the Function URL locally.
    - *Deployment*:
        - **GitHub Actions**: `deploy-aws.yml`.
        - *Steps*: `checkout` -> `setup-node` -> `setup-sam` -> `sam build` -> `sam deploy`.
        - *Credentials*: AWS OIDC Provider (Best Practice) instead of long-lived Access Keys.

### Operational Excellence (Cost & Monitoring)

- **Token Usage Monitoring**:
    - *Streaming Issue*: Standard OpenAI API response usage fields are often missing in streams.
    - *Solution*: Use `onFinish` callback in Vercel AI SDK to capture final usage metrics (prompt/completion tokens).
    - *CloudWatch Custom Metrics*: The Lambda wrapper will push these token counts to CloudWatch as custom metrics (`RoninAI/TokenUsage`) for granular cost tracking.
- **Budget Alarms**:
    - Set AWS Budgets to alert via SNS/Email if "Demo Mode" costs exceed $5-$10/month.

## Technical Research Recommendations

### Implementation Roadmap

1.  **Phase 1: Client-Side Foundation (Day 1-2)**
    - Install Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`).
    - Create `src/lib/ai/client.ts` factory pattern.
    - Migrate "Chat" feature to use new generic client.

2.  **Phase 2: AWS Lambda "Demo Mode" (Day 3-4)**
    - Initialize SAM project in `serverless/demo-proxy`.
    - Implement `index.ts` with `awslambda.streamifyResponse`.
    - Deploy to AWS (Stage: `dev`).

3.  **Phase 3: Integration & UI (Day 5)**
    - Add "Provider Selector" in Settings.
    - Update "API Key" storage to handle multiple keys (OpenAI Key, Anthropic Key).
    - Hardcode "Demo Mode Endpoint" in build config.

### Technology Stack Recommendations

- **Client**: Vercel AI SDK Core (TypeScript)
- **Proxy**: AWS Lambda (Node.js 20.x, Function URL)
- **IaC**: AWS SAM
- **Key Storage**: Rust (ring/aes-gcm)

### Skill Development Requirements

- **Team**: Need to familiarize with **AWS IAM** (Roles/Policies) and **SAM Syntax** (`template.yaml`).
- **Resource**: "Serverless Land" patterns for Function URLs.

### Success Metrics

- **Latency**: TTFT (Time To First Token) < 1.5s for Demo Mode (Cold Start < 3s).
- **Reliability**: 99.9% uptime for Proxy.
- **Compatibility**: 100% of existing Ronin features (Chat, Context) work with OpenAI/Anthropic keys.
