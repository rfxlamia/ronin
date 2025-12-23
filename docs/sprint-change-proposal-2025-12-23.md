# Sprint Change Proposal: Epic 4.5 Agent Execution Gap

**Date:** 2025-12-23  
**Issue:** Stories 4.5.2/4.5.3 complete but agentic execution loop missing  
**Scope:** Moderate - 2 new stories required

---

## Issue Summary

Stories 4.5.2 and 4.5.3 built the **parts** (tools, UI components) but not the **integration** that connects them:

- ❌ No code calls tools from AI loop
- ❌ No events emitted for step progress
- ❌ `AgentChat` uses placeholder `setTimeout` instead of real AI
- ❌ ProtocolViewer steps never update

**Root Cause:** Assumption that Vercel AI SDK `maxSteps` would auto-handle loops, but actual integration never written.

---

## Recommended Approach: Add 2 Stories

Split into 2 focused stories to reduce context window load:

| Story | Focus | Deliverable |
|-------|-------|-------------|
| **4.5.4** | Backend (Rust) | Emit `agent-step-complete`, `agent-tool-call` events |
| **4.5.5** | Frontend (TS) | `useAgentExecution` hook orchestrating AI + tools |

---

## Story 4.5.4: Backend Agent Events

**Dependencies:** Story 4.5.2 (tools exist)

As a **developer**,  
I want **the backend to emit agent progress events**,  
So that **the frontend can display real-time reasoning steps**.

### Acceptance Criteria

**Given** a tool is called during agent execution  
**When** the tool executes  
**Then** an `agent-tool-call` event is emitted with:
- `tool_name`: string (e.g., "read_file")
- `params`: JSON object (e.g., `{ "path": "package.json" }`)
- `step_id`: current protocol step

**Given** a protocol step completes  
**When** the agent moves to the next step  
**Then** an `agent-step-complete` event is emitted with:
- `step_id`: completed step ID
- `result`: brief summary of step output

### Technical Notes

- Modify `src-tauri/src/commands/tools.rs` - each tool emits event before returning
- Add event types to `src-tauri/src/ai/provider.rs`
- Use Tauri's `window.emit()` pattern (existing in `ai.rs`)
- Frontend can listen via `listen('agent-tool-call', ...)` (Tauri API)

---

## Story 4.5.5: Frontend Agent Hook

**Dependencies:** Story 4.5.4 (backend events working)

As a **user**,  
I want **the agent to actually execute the Project Resurrection protocol**,  
So that **I see real tool calls and receive meaningful analysis**.

### Acceptance Criteria

**Given** the user clicks "Analyze Project" in Agent View  
**When** the protocol executes  
**Then**:
- Calls AI provider via `UnifiedClient` (works with OpenRouter, OpenAI, Anthropic, **Demo Mode**)
- Uses Vercel AI SDK `generateText` with `maxSteps: 10`
- Listens for `agent-tool-call` events and updates ThinkingIndicator
- Listens for `agent-step-complete` events and updates ProtocolViewer
- Updates `reasoningStore.currentStepId` as steps progress
- Displays final synthesis in chat

**Given** a tool call is made  
**When** the event is received  
**Then** ThinkingIndicator shows:
- "📖 Reading package.json..."
- "🔍 Analyzing git history..."

### Technical Notes

- Create `src/hooks/useAgentExecution.ts` (replaces placeholder in `useAgentAnalysis.ts`)
- Call `invoke('generate_context', { projectId, payload })` with tool-enabled prompt
- Listen for Tauri events: `agent-tool-call`, `agent-step-complete`, `ai-chunk`, `ai-complete`
- Update `useReasoningStore` with step progress
- Remove placeholder `setTimeout` logic

---

## Artifacts to Update

| Artifact | Change |
|----------|--------|
| `docs/epics.md` | Add Stories 4.5.4 and 4.5.5 |
| `docs/sprint-artifacts/4.5-2-*.md` | Add note about backend event gap |
| `docs/sprint-artifacts/4.5-3-*.md` | Add note about frontend hook gap |

---

## Verification Plan

### Story 4.5.4 (Backend)

1. **Unit test:** Add test in `src-tauri/src/commands/tools.rs` that verifies event emission
2. **Manual verification:**
   - Run `cargo build`
   - Trigger tool call via CLI/test
   - Verify event appears in Tauri devtools

### Story 4.5.5 (Frontend)

1. **Unit test:** Update `AgentChat.test.tsx` to verify hook integration
2. **E2E verification:**
   - Open Agent view → Click "Analyze Project"
   - Verify ThinkingIndicator shows tool calls
   - Verify ProtocolViewer steps progress
   - Verify final report displays

---

## Handoff

**Scope:** Moderate  
**Route to:** Development team (direct implementation)

**Sequence:**
1. Implement Story 4.5.4 (backend events)
2. Test backend events working
3. Implement Story 4.5.5 (frontend hook)
4. E2E validation

**Estimated effort:** 4 hours total (2h + 2h)
