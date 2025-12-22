---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ['docs/sprint-artifacts/epic-4-retro-2025-12-22.md', '_bmad/bmm/agents/architect.md', '_bmad/bmm/agents/dev.md']
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Epic 4.5 (Reasoning Infrastructure & Agent Personas)'
research_goals: 'Define "Ronin-Flash" vs "Ronin-Thinking" modes, and transform _bmad personas/workflows'
user_name: 'V'
date: '2025-12-22'
web_research_enabled: true
source_verification: true
---

## Technical Research Scope Confirmation

**Research Topic:** Epic 4.5 (Reasoning Infrastructure & Agent Personas)
**Research Goals:** Define "Ronin-Flash" vs "Ronin-Thinking" modes, and transform _bmad personas/workflows into Ronin compatible formats.

**Technical Research Scope:**

- **Reasoning Implementation**:
    - **Ronin-Flash**: Fast, single-shot inference (Standard LLM).
    - **Ronin-Thinking**: Multi-step, chain-of-thought reasoning (CoT) or Agentic loops.
    - *Investigation*: How to emulate "Thinking" using Vercel AI SDK? (e.g., `generateText` loop, recursive calls, or dedicated "Reasoning" models like o1/o3).
- **Persona Transformation**:
    - Analyze `_bmad` XML persona format.
    - Define a JSON/Markdown schema for Ronin Personas.
    - Strategy for dynamic injection of personas into System Prompts.
- **Workflow Integration**:
    - Adapting `_bmad` workflows (YAML) into "Reasoning Steps" or "Plans" for Ronin-Thinking.
    - "Dynamic Workflows": How can the agent select its own workflow?

**Research Methodology:**

- Analyze existing `_bmad` assets.
- Web research on Vercel AI SDK "Agentic" patterns (Tools, MaxSteps).
- Investigation of "Reasoning Models" (OpenAI o1, future Claude thinking capabilities).

**Scope Confirmed:** 2025-12-22
## Reasoning Models & Patterns Analysis

### 1. Ronin-Thinking Architecture
**Definition**: A mode for complex, multi-step problem solving that mimics "Agentic" behavior.
**Implementation Pattern**: "ReAct" (Reason + Act) loop using Vercel AI SDK.

#### Vercel AI SDK Enhancements for "Thinking"
- **`maxSteps`**: The core enabler. By setting `maxSteps: 5` (or higher), we allow the model to call tools, receive results, and reason again before generating a final response. this is "Agentic" behavior out-of-the-box.
- **`experimental_toolChoice`**: We can force the model to use specific "Reasoning Tools" (e.g., `execute_workflow`, `search`, `read_file`) before answering.
- **Visualizing Thought**: Use `<Reasoning />` UI components (Vercel standard) to show users the "steps" the agent is taking (e.g., "Searching documentation...", "Reading file x...").

### 2. The "Protocol" Pattern (Adapting _bmad)
The `_bmad` system uses `workflow.xml` as a "Virtual Machine" to execute XML-based instructions.
**Migration Strategy**:
- `_bmad` -> **Ronin Protocols**: We will treat `workflow.xml` as a "Legacy Protocol Definition".
- **Agentic Execution**: Instead of a rigid XML parser (current `workflow.xml` runner), we will give the efficient "Ronin-Thinking" model a **Tool** called `execute_protocol_step`.
- **Hybrid Approach**: 
    - *Rigid Steps*: For strict compliance (like "Save to file"), the system enforcement remains.
    - *Flexible Reasoning*: For "Analyze user input", the LLM uses its training + context.

### 3. Reasoning Models Support
- **OpenAI o1**: Supported via standard `generateText` but currently has limited "streaming" of intermediate thoughts (it outputs a final distinct thought block).
- **Anthropic Claude 3.5 Sonnet**: Excellent for "Computer Use" style tool loops.
- **Vercel AI SDK Abstraction**: We can swap these models easily. `Ronin-Thinking` will likely default to `claude-3-5-sonnet` (for strong reasoning + coding) or `gpt-4o` (for speed).

### 4. Persona Transformation Strategy
**Current (_bmad)**: XML files (`architect.md`) containing `<persona>`, `<principles>`, `<activation>` steps.
**Target (Ronin)**: JSON/TypeScript Schema injected into `system` prompt.
- **Dynamic Injection**: When user selects "Architect" mode, we parse `architect.md` -> extract `<role>` & `<principles>` -> Append to System Prompt.
- **Menu/Workflow Tools**: The `<menu>` items in `_bmad` become **Tools** available to that specific agent persona.

## Next Steps
- Define the **Persona Schema** (JSON) to standardize the transformation.
- Design the **Workflow Schema** (JSON/YAML) that "Thinking" agents can read/execute.
## Persona & Workflow Schema Design

### 1. Agent Persona Schema
The `_bmad` XML personas will be transformed into a rigorous JSON structure that can be dynamically loaded by the Ronin application and injected into the Vercel AI SDK `system` prompt.

```typescript
type AgentPersona = {
  id: string;          // e.g., "architect"
  name: string;        // e.g., "Winston"
  role: string;        // e.g., "System Architect"
  color: string;       // UI Theme color (e.g., #8B5CF6 for Architect)
  icon: string;        // Emoji or Icon ID
  
  // The core instructions that form the "Character"
  systemPrompt: {
    identity: string;      // "You are Winston..."
    tone: string;          // "Pragmatic, authoritative..."
    principles: string[];  // ["User journeys first", "Boring tech"]
  };

  // Capabilities available to this agent
  capabilities: {
    canUseInternet: boolean;
    canReadFiles: boolean;
    canExecuteCommands: boolean;
  };

  // Tools specific to this persona (matches _bmad <menu>)
  availableProtocols: string[]; // IDs of protocols this agent can start (e.g., "create-architecture")
};
```

### 2. Reasoning Protocol Schema
Instead of the rigid XML structure of `_bmad` `workflow.xml`, Ronin-Thinking will use a **Markdown-First Protocol** tailored for LLM comprehension.

**Concepts:**
- **Protocol**: A sequence of high-level goals.
- **Micro-Steps**: The agent figures out the sub-steps (Tools/Reasoning) to achieve the goal.

```typescript
type ReasoningProtocol = {
  id: string;               // e.g. "create-architecture"
  title: string;
  description: string;
  
  // The "State" of the protocol execution
  contextFiles: string[];   // Virtual file paths to load as context (e.g. "project-context.md")
  
  // The high-level Orchestration
  steps: ProtocolStep[];
};

type ProtocolStep = {
  id: string;               // e.g., "step-01"
  title: string;
  
  // The actual instruction for the model
  instruction: string;      // "Review the PRD and identify architectural risks."
  
  // Dynamic Content (Legacy "Steps" files)
  // We can load specific markdown files as "Scenario Context"
  instructionFile?: string; // e.g., "_bmad/.../step-01.md"
  
  // Validation Gate
  // The agent must produce this output to proceed
  requiredOutput: "file_creation" | "user_confirmation" | "none";
};
```

### 3. Transformation Strategy (BMM -> Ronin)
- **Scripted Migration**: We can write a script to parse the `_bmad` directory.
    - `agent.md` (XML) -> `agents/{id}.json`
    - `workflow.md` + `steps/*.md` -> `protocols/{id}.json`
- **Hybrid Compatibility**: For the first version, we might manually migrate the top 3 agents (Architect, Dev, PM) and their critical workflows.

## Next Steps
- **Implementation Strategy**: How to run this loop?
    - Use Vercel AI SDK Core `generateText` with `maxSteps: 10` (Thinking Mode).
    - **Step Executor**: A "System Tool" that feeds the next `ProtocolStep` to the LLM.
- **State Management**: Zustand store to track "Current Active Protocol" and "Current Step".

### 1. Agent Persona Schema
The `_bmad` XML personas will be transformed into a rigorous JSON structure that can be dynamically loaded by the Ronin application and injected into the Vercel AI SDK `system` prompt.

```typescript
type AgentPersona = {
  id: string;          // e.g., "architect"
  name: string;        // e.g., "Winston"
  role: string;        // e.g., "System Architect"
  color: string;       // UI Theme color (e.g., #8B5CF6 for Architect)
  icon: string;        // Emoji or Icon ID
  
  // The core instructions that form the "Character"
  systemPrompt: {
    identity: string;      // "You are Winston..."
    tone: string;          // "Pragmatic, authoritative..."
    principles: string[];  // ["User journeys first", "Boring tech"]
  };

  // Capabilities available to this agent
  capabilities: {
    canUseInternet: boolean;
    canReadFiles: boolean;
    canExecuteCommands: boolean;
  };

  // Tools specific to this persona (matches _bmad <menu>)
  availableProtocols: string[]; // IDs of protocols this agent can start (e.g., "create-architecture")
};
```

### 2. Reasoning Protocol Schema
Instead of the rigid XML structure of `_bmad` `workflow.xml`, Ronin-Thinking will use a **Markdown-First Protocol** tailored for LLM comprehension.

**Concepts:**
- **Protocol**: A sequence of high-level goals.
- **Micro-Steps**: The agent figures out the sub-steps (Tools/Reasoning) to achieve the goal.

```typescript
type ReasoningProtocol = {
  id: string;               // e.g. "create-architecture"
  title: string;
  description: string;
  
  // The "State" of the protocol execution
  contextFiles: string[];   // Virtual file paths to load as context (e.g. "project-context.md")
  
  // The high-level Orchestration
  steps: ProtocolStep[];
};

type ProtocolStep = {
  id: string;               // e.g., "step-01"
  title: string;
  
  // The actual instruction for the model
  instruction: string;      // "Review the PRD and identify architectural risks."
  
  // Dynamic Content (Legacy "Steps" files)
  // We can load specific markdown files as "Scenario Context"
  instructionFile?: string; // e.g., "_bmad/.../step-01.md"
  
  // Validation Gate
  // The agent must produce this output to proceed
  requiredOutput: "file_creation" | "user_confirmation" | "none";
};
```

### 3. Transformation Strategy (BMM -> Ronin)
- **Scripted Migration**: We can write a script to parse the `_bmad` directory.
    - `agent.md` (XML) -> `agents/{id}.json`
    - `workflow.md` + `steps/*.md` -> `protocols/{id}.json`
- **Hybrid Compatibility**: For the first version, we might manually migrate the top 3 agents (Architect, Dev, PM) and their critical workflows.

## Next Steps
- **Implementation Strategy**: How to run this loop?
    - Use Vercel AI SDK Core `generateText` with `maxSteps: 10` (Thinking Mode).
    - **Step Executor**: A "System Tool" that feeds the next `ProtocolStep` to the LLM.
- **State Management**: Zustand store to track "Current Active Protocol" and "Current Step".
## Implementation Strategy (Vercel AI SDK)

### 1. The "Thinking Client" (Core Logic)
We will extend the `UnifiedClient` (from Epic 4.25) to support a "Thinking Mode".
- **Method**: `streamText` (Vercel AI SDK Core).
- **Configuration**:
    - `maxSteps`: 10 (configurable per persona).
    - `tools`: A dynamic set of tools injected based on the active `ReasoningProtocol`.
    - `system`: Dynamically constructed from `AgentPersona.systemPrompt`.

### 2. Protocol Execution Pattern ("The Loop")
Instead of a hard-coded "Framework" (like BMM's XML runner), we use the **LLM as the Runner**.
*   **The Orchestrator**: The React Frontend (Zustand Store).
*   **The "Protocol Tool"**:
    - The LLM receives the full Protocol Context in the System Prompt or as a "Context Message".
    - The LLM calls `complete_step({ stepId, output })` tool to mark progress.
    *   **Orchestrator Action**: When `complete_step` is called, the frontend updates the UI state (checkboxes) and appends the *next* step's detailed instruction to the chat history.

### 3. State Management (Zustand)
We need a `useReasoningStore` to track:
- `activePersona`: The selected agent (e.g., "Architect").
- `activeProtocol`: The running workflow (e.g., "create-architecture").
- `currentStepId`: Where we are.
- `stepHistory`: The outputs of previous steps (for context injection).

### 4. UI Implementation
- **`<ThinkingIndicator />`**:
    - Leverages Vercel AI SDK's `tool-call` streaming chunks.
    - Displays: "Analyzing PRD..." (derived from tool arguments).
- **`<ProtocolViewer />`**:
    - A side-panel or overlay showing the "Plan" (Protocol Steps).
    - Real-time updates as the LLM calls `complete_step`.
- **`<PersonaSelector />`**:
    - Dropdown to switch between "Ronin-Flash" (Default) and "Ronin-Thinking" agents using the Persona Schema.
## Integration & Roadmap

### 1. Integration Points

- **Frontend State (`src/stores/reasoningStore.ts`)**:
    - Central store to manage `activePersona` (Default: "Ronin-Flash") and `activeProtocol`.
    - Persists state to `localStorage` (initially) or SQLite (later).
- **AI Client Factory (`src/lib/ai/client.ts`)**:
    - Updates to `createModel()` to accept `maxSteps` and `toolChoice`.
    - Determines if "Thinking" is active and switches configuration accordingly.
- **UI Components**:
    - `ChatInterface`: Adds a "Brain" icon toggle (Flash vs Thinking).
    - `MessageList`: Renders `<ThinkingIndicator />` for intermediate tool steps.

### 2. Roadmap (Epic 4.5 Execution)

**Week 1: Foundation**
- [ ] Define TypeScript Interfaces (`AgentPersona`, `ReasoningProtocol`).
- [ ] Create `useReasoningStore` with mock data.
- [ ] Implement `UnifiedClient` with `maxSteps` support (Vercel AI SDK).

**Week 2: The "Architect"**
- [ ] Migrate `architect.md` (XML) -> `personas/architect.json`.
- [ ] Migrate `create-architecture` workflow -> `protocols/create-architecture.json`.
- [ ] Implement `<ProtocolViewer />` to see the "Plan" in the UI.

**Week 3: The "Developer" (Agentic Coding)**
- [ ] Migrate `dev.md` (XML) -> `personas/dev.json`.
- [ ] Implement `read_file` and `write_file` tools (securely via Tauri commands).
- [ ] **Milestone**: "Ronin-Thinking" can read a PRD and write a plan automatically.

## Final Recommendations

- **Start Simple**: Do not try to build a generic XML runner. Build a specific "Thinking Tool" for the LLM.
- **Visuals Matter**: The user *must* see what the agent is doing (e.g., "Reading file...") to trust the "Thinking" process.
- **Model Choice**: Use **Claude 3.5 Sonnet** (via Anthropic Provider) as the default for "Thinking" mode due to its superior coding and instruction following capabilities.
### 5. Reasoning Model Strategy (Updated)

**Challenge**: Agentic loops (Reasoning) require high intelligence to reliably call tools and follow complex protocols without hallucinating.

**Tiered Approach:**

1.  **Premium Tier (Recommended for Production)**:
    *   **Anthropic Claude 3.5 Sonnet**: Best-in-class for coding and complex instruction following.
    *   **OpenAI o1**: Specialized for deep reasoning chains.

2.  **Experimental / Free Tier (User Requested)**:
    *   **Target**: `openai/gpt-oss-120b:free` (or Llama 3.1 70B/405B via OpenRouter Free).
    *   **Viability**: Large open models (70B+) *can* perform reasoning loops, but may struggle with:
        *   Strict JSON Schema compliance for tools.
        *   Recovering from tool errors.
        *   Long context retention.
    *   **Strategy**: We will implement the infrastructure to support *any* OpenRouter model, but strictly validate if the "Free" models are smart enough to handle the "Architect" protocols.
### 5. Reasoning Model Strategy (Corrected)

**Verified Capabilities**:
*   **Xiaomi MiMo-V2-Flash**: 309B Parameters (MoE). Excellent reasoning benchmarks (SWE-Bench Verified: 73.4%).
*   **GLM-4.5-Air**: 106B Parameters (MoE). Designed for Agentic tasks.

**Updated Tiered Approach:**

1.  **Standard Tier (Default & Free)**:
    *   **Models**: `xiaomi/mimo-v2-flash:free` (Primary), `z-ai/glm-4.5-air:free`.
    *   **Verdict**: These models are **sufficiently powerful** for the Initial Reasoning Loop ("Ronin-Thinking") without cost. Use as default.

2.  **Premium Tier (Optional Upgrade)**:
    *   **Models**: Claude 3.5 Sonnet, OpenAI o1.
    *   **Use Case**: Only needed if the Standard Tier fails on extremely complex, multi-file architectural tasks.

**Implementation Note**:
The infrastructure remains model-agnostic, but we will **not** disable "Thinking Mode" for free users. We will enable it by default using `mimo-v2-flash`.
### 6. Consensus & MVP Scope (Party Mode Session)

**Primary Use Case: "Project Resurrection" (Deep Context)**
*   **Goal**: Help users recover "Mental Context" for projects they haven't touched in weeks/months.
*   **Workflow**: The agent scans the file structure, reads recent git commits, checks `package.json`, and synthesizes a "Deep Status Report" (e.g., "Refactoring Auth, tests failing in X, last edited 2 months ago").
*   **Value**: Fast-tracks the user from "Opening App" to "Ready to Code in IDE".

**Architectural Decision: Dedicated Route (`/agent`)**
*   **Route**: Add a new primary route `/agent/:projectId` (accessible via Dashboard/AppShell).
*   **Rationale**:
    *   **Persistence**: Prevents loss of "Thinking State" (which takes time to generate) if user clicks away.
    *   **Focus**: Provides screen real estate for the "Thought Stream", Plan Artifacts, and Reference Code side-by-side.
    *   **Simplicity**: Avoids complex modal state management for long-running processes.

**MVP Capabilities (Safe Mode)**
*   **Read-Only Access**:
    *   `read_file`: To analyze code.
    *   `list_dir`: To map project structure.
    *   `git_status`/`git_log`: To understand history.
*   **Web Research**: `search_web` (via Tavily/Google) to look up documentation.
*   **Plan Generation**: `write_file` restricted to `docs/` or specific "Drafts" folders initially.
*   **No Direct Shell**: `run_command` is disabled for MVP to prevent accidental destruction.

**Updated Roadmap Priority**
1.  **Frontend**: Build `/agent` Route and `<ThinkingIndicator />`.
2.  **Backend**: Implement `UnifiedClient` with `mimo-v2-flash` default.
3.  **Agent Logic**: Implement the "Project Resurrection" Protocol.
