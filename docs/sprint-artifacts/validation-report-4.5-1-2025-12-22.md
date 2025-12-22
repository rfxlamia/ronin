# Validation Report: Story 4.5.1

**Document:** [4.5-1-agent-core-system-prompt.md](file:///home/v/project/ronin/docs/sprint-artifacts/4.5-1-agent-core-system-prompt.md)  
**Checklist:** create-story/checklist.md (Story Context Quality Competition)  
**Date:** 2025-12-22  
**Validator:** Bob (Scrum Master)  
**Context:** Fresh validation using systematic re-analysis approach

---

## Executive Summary

**Overall Status:** 🟡 **NEEDS ENHANCEMENT** (6 Critical, 8 Enhancement, 2 Optimization Issues)

The story provides solid foundational requirements, but **misses critical implementation context** that could cause developer errors:
- **Missing Breaking Change Migrations** for backward compatibility
- **Incomplete System Prompt guidance** (no specific extraction instructions from _bmad agents)
- **Missing prior Epic 4.25 context** (Vercel SDK integration patterns)
- **Vague "Condense" instructions** without concrete examples
- **Missing Tool Definitions** for reasoning loops
- **No Error Handling** specifications for reasoning failures

---

## Summary Statistics

- **Total Checklist Items:** 16 major categories
- **Pass Rate:** 6/16 (38%)
- **Critical Issues:** 6 (Must Fix)
- **Enhancement Opportunities:** 8 (Should Add)
- **Optimization Insights:** 2 (Nice to Have)

---

## Section Results

### Epic & Story Context Analysis

#### ✓ PASS - Epic 4.5 Objectives Identified
**Evidence:** Lines 7-11 clearly state the "As a developer" story linking to reasoning infrastructure testing before UI.

**Coverage:** Epic context from epics.md:L1178-1332 correctly references:
- Ronin-Thinking mode (multi-step reasoning)
- Unified system prompt requirement
- Tool definitions requirement
- Integration checkpoint mentions

---

### 🚨 CRITICAL MISSES (Must Fix)

#### ✗ FAIL #1 - Breaking Change Migration Strategy Missing
**Impact:** HIGH - Could break existing ContextPanel functionality

**Evidence Missing:**
Lines 85-86 mention: *"Breaking Change Warning: The `AiProvider` trait update is CRITICAL"* but provide NO concrete migration path.

**Required Context Not Provided:**
1. **Current State:** `ContextPayload` currently has:
   ```rust
   pub struct ContextPayload {
       pub system_prompt: String,
       pub user_message: String,
       pub attribution: Attribution,
   }
   ```
   (Source: `src-tauri/src/ai/provider.rs`:L12-16)

2. **Migration Strategy Missing:**
   - How does `messages: Vec<Message>` map to existing `system_prompt + user_message`?
   - What is the `Message` struct definition? (Not specified anywhere)
   - Should old calls auto-convert `{ system_prompt, user_message }` → `[ { role: "system", content: ... }, { role: "user", content: ... } ]`?

3. **Backward Compatibility Plan:**
   - Story mentions "or created separate `generate_agent_response` command" but doesn't specify WHICH approach to use
   - No guidance on whether to keep dual command structure or unified interface

**Recommendation:**
Add explicit section: **"Backend Payload Migration"** with:
- Exact `Message` struct definition with `role` and `content` fields
- Code snippet showing conversion logic for backward compatibility
- Decision: "Extend existing `generate_context` command with payload sniffing (if `messages` exists, use new flow; else convert old format)"

---

#### ✗ FAIL #2 - System Prompt Construction Too Vague
**Impact:** CRITICAL - Developer will waste time guessing how to "condense" personas

**Evidence of Vagueness:**
- Line 41-43: "*Condenses* principles from Architect (System Thinking) and Developer (Implementation) into a single cohesive persona"
- Line 73-76: "*Condense* Architect principles... *Condense* Developer principles... *Combine*..."

**Missing Critical Guidance:**
1. **WHAT to extract:** Story doesn't specify WHICH sections from the XML to use:
   - `architect.md` has `<role>` (L53), `<identity>` (L54), `<communication_style>` (L55), `<principles>` (L56)
   - `dev.md` has similar structure (L56-59)
   - Should we extract ALL of these or just `<principles>`?

2. **HOW to merge:** No template or example provided
   - Should it be: "You are Ronin, You have Architect thinking AND Developer thinking..."?
   - Or: "As Architect you do X, as Developer you do Y, choose based on context"?

3. **Activation Steps Ignored:** The `<activation>` steps (#4-#13 in dev.md) contain **critical implementation rules**:
   - "READ the entire story file BEFORE any implementation" (dev.md:L19)
   - "Execute tasks/subtasks IN ORDER" (dev.md:L21)
   - "Never proceed with failing tests" (dev.md:L24)
   These are **implementation rules**, not just persona flavor!

**Recommendation:**
Add concrete section: **"System Prompt Construction Guide"** with:
```markdown
### Ronin-Thinking System Prompt Structure

1. **Extract from `_bmad/bmm/agents/architect.md`:**
   - `<identity>`: "Senior architect with expertise in distributed systems..."  
   - `<principles>`: Full principles text from L56

2. **Extract from `_bmad/bmm/agents/dev.md`:**
   - `<identity>`: "Executes approved stories with strict adherence..."  
   - `<principles>`: Full principles from L59
   - **Critical Rules from Activation:** Steps #4-#13 (test-driven, sequential execution)

3. **Merge Template:**
   ```
   You are Ronin, an intelligent developer assistant that combines system-level thinking with precise implementation execution.

   ## Your Capabilities
   - **Architectural Thinking:** [Architect identity + principles]
   - **Implementation Excellence:** [Dev identity + principles + critical rules]

   ## Context-Aware Reasoning
   When analyzing projects: Apply architectural thinking to understand structure and design patterns.
   When implementing features: Apply developer rules (test-first, sequential, never skip tests).
   ```
```

---

#### ✗ FAIL #3 - Missing Epic 4.25 Integration Context
**Impact:** HIGH - Developer might duplicate code or use wrong patterns

**Missing Cross-Epic Context:**
Story 4.5.1 AC #3 (Lines 26-30) mentions "Vercel AI SDK Integration" but provides:
- ❌ NO reference to Epic 4.25.1 (where Vercel SDK was first integrated)
- ❌ NO mention that `src/lib/ai/client.ts` might already exist from Epic 4.25.1
- ❌ NO guidance on whether to extend existing client or create new one

**Evidence from Epic 4.25.1:**
From `epics.md`:L1100-1106, Story 4.25.1 already:
- Installs: `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic` packages
- Creates: `src/lib/ai/client.ts` with factory pattern
- Migrates: OpenRouter to Vercel AI SDK

**This is a DEPENDENCY!**

**Recommendation:**
Add **Dependencies Section**:
```markdown
## Dependencies

**Prerequisite:** Epic 4.25.1 must be complete
- Story 4.5.1 EXTENDS the unified client from Epic 4.25.1
- Verify `src/lib/ai/client.ts` exists with `createModel()` factory pattern  
- This story adds `maxSteps` parameter support to existing client (not creating from scratch)

**Integration Point:**  
Extend `createModel()` to accept:
```typescript
interface ModelConfig {
  provider: ProviderType;
  model: string;
  max Stephens?: number; // NEW - for Thinking mode
}
```
```

---

#### ✗ FAIL #4 - Tool Definitions Completely Missing
**Impact:** CRITICAL - Cannot implement reasoning loops without tools

**Evidence:**
- Research doc (L355-359) explicitly lists MVP tools: `read_file`, `list_dir`, `git_status`, `git_log`
- **But Story 4.5.1 doesn't mention tools AT ALL**
- Story 4.5.2 is supposed to implement tools, but Story 4.5.1 ACs #3 and #6 require "basic reasoning loop works"

**How can a reasoning loop work without any tools to call?**

**Missing:**
1. Tool type definitions (must define Vercel AI SDK tool schemas)
2. Whether to stub tools in 4.5.1 or defer to 4.5.2
3. Mock tool responses for testing "hello world" reasoning loop (AC #6, Line 47)

**Recommendation:**
Clarify in **AC #6 Testability**:
```markdown
- [ ] Agent logic testable with MOCK tools (stub responses):
    - Mock `read_file` returns `"// Sample file content"`
    - Mock `list_dir` returns `["README.md", "package.json"]`
  - [ ] Full tool implementation deferred to Story 4.5.2
```

And add to Dev Notes:
```markdown
### Tool Scaffolding
- Define tool schemas (Vercel AI SDK format) in `src/lib/ai/tools/schemas.ts`
- Implement mock tool handlers for Story 4.5.1 testing
- Real Tauri commands implemented in Story 4.5.2
```

---

#### ✗ FAIL #5 - Reasoning Store State Unclear
**Impact:** MEDIUM-HIGH - Ambiguous state management could cause bugs

**Evidence (Lines 32-38):**
```markdown
4. **Reasoning Store (Zustand)**
   - [ ] `useReasoningStore` implemented to track:
       - `activeMode` (default: "ronin-flash")
       - `activeProtocol` (nullable)
       - `currentStepId` (nullable)
       - `stepHistory` (array of completed steps/outputs)
   - [ ] Actions implemented: `setMode`, `startProtocol`, `completeStep`, `reset`
```

**Missing Critical Details:**
1. **What is `stepHistory` element structure?**  
   ```typescript
   stepHistory: Array<???> // String? Object? { stepId, output, timestamp }?
   ```

2. **Persistence strategy?**  
   - Research doc (L273) says "session only" but story doesn't mention persistence at all
   - Should it survive page refresh? Browser closure?

3. **Multi-project state:**  
   - Does each project have its own reasoning state?
   - Single global state or keyed by `projectId`?

**Recommendation:**
Add specific type definitions to **AC #4**:
```typescript
interface StepHistoryEntry {
  stepId: string;
  output: string; // Text output from LLM for this step
  timestamp: number;
  toolCallsMade?: string[]; // Optional array of tool names called
}

interface ReasoningState {
  // Keyed by projectId for multi-project support
  byProject: Record<string, {
    activeMode: AgentMode;
    activeProtocol: string | null;
    currentStepId: string | null;
    stepHistory: StepHistoryEntry[];
  }>;
}

// Session-only persistence (localStorage, cleared on browser close)
```

---

#### ✗ FAIL #6 - No Error Handling Specifications
**Impact:** MEDIUM - Reasoning loops can fail, need graceful degradation

**Missing Scenarios:**
1. **Tool call failures:** What if `read_file` is called on non-existent file?
2. **Model refuses to use tools:** What if model generates text instead of calling `complete_step`?
3. **Max steps reached:** What if `maxSteps: 10` is exhausted without completion?
4. **Network failure mid-reasoning:** Should state be recoverable?

**Current Story:**  
Zero mention of error cases

**Recommendation:**
Add **AC #7: Error Handling**:
```markdown
7. **Error Handling & Recovery**
   - [ ] Tool call errors captured and logged (don't crash reasoning loop)
   - [ ] Max steps exhaustion handled gracefully: "Reasoning incomplete, max steps reached"
   - [ ] Network failures pause reasoning, allow resume from last completed step
   - [ ] Invalid tool calls (wrong parameters) logged but don't crash loop
```

---

### ⚡ ENHANCEMENT OPPORTUNITIES (Should Add)

#### ⚠ PARTIAL #1 - Missing Model Selection Logic
**Current Coverage:** Lines 29-30 mention using `xiaomi/mimo-v2-flash:free` for Thinking mode  
**Gap:** No spec on WHY this model or how to make it configurable

**Enhancement:**
Reference research findings (L324-338) showing:
- **MiMo-V2-Flash:** 309B params, SWE-Bench 73.4%
- **GLM-4.5-Air:** 106B params, Agentic tasks
- **Fallback order:** MiMo → GLM → Claude (if free tier insufficient)

Add to Dev Notes:
```markdown
### Model Selection Strategy
- **Default (Free):** `xiaomi/mimo-v2-flash:free` (sufficient for MVP per research)
- **Fallback:** `z-ai/glm-4.5-air:free` if MiMo unavailable
- **Premium (Optional):** `anthropic/claude-3.5-sonnet` for complex tasks
- Implementation: `reasoningStore` tracks preferred model per user settings
```

---

#### ⚠ PARTIAL #2 - Files to Create List Incomplete
**Current List (Lines 98-106):**  
7 files listed

**Missing Files:**
1. `src/lib/ai/tools/schemas.ts` - Tool type definitions (mentioned in enhancement above)
2. `src/lib/ai/protocols/types.ts` - Protocol type definitions (research doc L115-141 has full schema)
3. `src/lib/ai/tools/mock/index.ts` - Mock tools for testing (if scaffolding tools in this story)

**Enhancement:**  
Update File List to include all necessary files based on research architecture

---

#### ⚠ PARTIAL #3 - No Testing Strategy Beyond "Basic Hello World"
**Current (Line 46-47):**  
"Basic 'hello world' reasoning loop works"

**Gap:**  
What does "hello world" mean?
- Calls 1 tool?
- Completes 1 protocol step?
- Full protocol execution?

**Enhancement:**
Specify concrete test cases:
```markdown
### Verification Test Cases
1. **🧪 Test: Single Tool Call**
   - Send prompt: "List files in current directory"
   - Expected: Model calls `list_dir` mock tool once
   - Verify: Response includes mock file list

2. **🧪 Test: Multi-Step Reasoning**
   - Send prompt: "Analyze package.json and tell me the framework used"
   - Expected: Model calls `list_dir` → `read_file` → synthesizes answer
   - Verify: Answer mentions framework from mock package.json

3. **🧪 Test: Max Steps Limit**
   - Set `maxSteps: 2`, send complex prompt requiring 3+ steps
   - Expected: Graceful termination at step 2 with partial results
```

---

#### ⚠ PARTIAL #4 - Missing "Based On" Attribution Extension
**Gap:** Epic 3 attribution shows "📄 5 files, ∞ 10 commits"  
How should reasoning loops extend attribution?

**Enhancement:**
Add note about attribution in thinking mode:
```markdown
### Attribution in Thinking Mode
- Extend existing Attribution interface to track tools used:
  ```typescript
  interface Attribution {
    commits: number;
    files: number;
    sources: string[]; // e.g., ["git", "devlog", "tools"]
    devlogLines?: number;
    toolCalls?: Array<{ tool: string; count: number }>; // NEW
  }
  ```
- Display in UI: "Based on: ∞ 10 📄 5 🔧 read_file×3"
```

---

#### ⚠ PARTIAL #5 - Integration Checkpoint Too Vague
**Current (Epic context, L1211):**  
"After completion, test agent logic independently via CLI/REPL before building UI"

**Gap:**  
- What CLI? There's no CLI in Tauri app
- What REPL?
- How to test "independently" if frontend integrated?

**Enhancement:**
Clarify checkpoint as actual testable milestone:
```markdown
## Integration Checkpoint

**Verification Method:** Debug Page (not CLI)
1. Create `src/pages/DebugAgent.tsx` (as mentioned in tasks)
2. Add button: "Test Reasoning Loop"
3. Hardcoded test: Call Vercel SDK `streamText` with `maxSteps: 3` and print debug output
4. **Pass Condition:** Successfully streams tool calls and responses visible in dev console

**Before Story 4.5.2:** Verify this debug flow works end-to-end
```

---

#### ⚠ PARTIAL #6 - No Mention of "Dedicated `/agent` Route" Decision
**Epic research decision (L346-351):**  
"Dedicated Route (`/agent/:projectId`)" chosen for persistence and focus

**Story 4.5.1:**  
Doesn't mention `/agent` route at all (that's Story 4.5.3)

**Why Enhancement?**  
Developer might create temporary debug UI in wrong location (e.g., modal) if not aware of future route structure

**Enhancement:**
Add forward-looking note:
```markdown
### Future Integration Note
- Story 4.5.3 will create dedicated `/agent/:projectId` route
- This story's debug page is TEMPORARY - don't invest in polished UI
- Store state in `reasoningStore` to be consumable by future route
```

---

#### ⚠ PARTIAL #7 - Missing `Message` TypeDefinition
**Critical Type Missing:**  
Line 21: `messages: Vec<Message>` - but what is `Message`?

**Standard OpenAI format:**
```rust
pub struct Message {
    pub role: String, // "system" | "user" | "assistant" | "tool"
    pub content: String,
}
```

**Enhancement:**
Add to **BackendInfrastructure AC #2**:
```markdown
- [ ] `Message` struct defined:
    ```rust
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Message {
        pub role: String, // "system", "user", "assistant", "tool"
        pub content: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>, // For tool calls
    }
    ```
```

---

#### ⚠ PARTIAL #8 - Vague "maxSteps" Logic
**Current (Line 29):**  
"Unified Client supports `maxSteps` parameter for reasoning loops"

**Vague:**  
- How does `maxSteps` work with Vercel SDK?
- Is it per-protocol or global config?
- Where is it configured?

**Enhancement:**
Add technical clarification:
```markdown
### maxSteps Implementation
- Vercel AI SDK's `streamText` accepts `maxSteps` option
- Default: `maxSteps: 10` for Thinking mode (0 for Flash mode)
- Configured per protocol (future: protocol JSON can override)
- Reasoning loop terminates when:
  1. Model stops calling tools (natural completion)
  2. Max steps reached (partial result)
  3. Error occurs (graceful degradation per AC #7)
```

---

### ✨ OPTIMIZATION INSIGHTS (Nice to Have)

#### ➖ N/A #1 - Token Efficiency in System Prompt
**Current Approach:**  
"Condense" architect + developer personas

**Optimization Opportunity:**  
The full `<activation>` sections in both agents are WORDY (architect.md has 14 steps, dev.md has 17 steps). Many steps are about menu systems and workflow loading (not relevant to Ronin-Thinking).

**Optimization:**
Extract ONLY the essential reasoning principles:
- Architect: Lines 53-56 (role, identity, principles)
- Developer: Lines 19-28 (implementation rules like test-first, sequential, never skip)

Total tokens saved: ~300-400 tokens per request (meaningful for free tier models)

---

#### ➖ N/A #2 - Consider Lazy-Loading Personas
**Current Plan:**  
System prompt includes full persona text every request

**Future Optimization (Post-MVP):**  
- Store persona principles in vector DB
- Retrieve relevant principles based on user query
- "Analyzing git history" → retrieve Architect context
- "Implementing feature" → retrieve Dev context

**Benefit:** Adaptive context, lower costs  
**Tradeoff:** Added complexity  
**Recommendation:** Document for v0.3, not MVP

---

## Failed Items Detail

### ✗ FAIL #1 - Breaking Change Migration Strategy Missing
See [Critical Miss #1](#-fail-1---breaking-change-migration-strategy-missing)

### ✗ FAIL #2 - System Prompt Construction Too Vague
See [Critical Miss #2](#-fail-2---system-prompt-construction-too-vague)

### ✗ FAIL #3 - Missing Epic 4.25 Integration Context
See [Critical Miss #3](#-fail-3---missing-epic-425-integration-context)

### ✗ FAIL #4 - Tool Definitions Completely Missing
See [Critical Miss #4](#-fail-4---tool-definitions-completely-missing)

### ✗ FAIL #5 - Reasoning Store State Unclear
See [Critical Miss #5](#-fail-5---reasoning-store-state-unclear)

### ✗ FAIL #6 - No Error Handling Specifications
See [Critical Miss #6](#-fail-6---no-error-handling-specifications)

---

## Partial Items Detail

See Enhancement Opportunities section for all 8 partial items.

---

## Recommendations

### Must Fix (Before dev-story)
1. **Add Backend Migration Section:** Explicit `Message` struct, conversion logic, backward compatibility strategy
2. **Provide System Prompt Template:** Concrete example with actual extracted text from architect.md and dev.md
3. **Clarify Epic 4.25 Dependency:** Link to Story 4.25.1, specify whether extending or creating client
4. **Add Tool Scaffolding Guide:** Mock tools for testing, schemas defined
5. **Define Reasoning State Types:** Full TypeScript interfaces with persistence strategy
6. **Add Error Handling AC:** Cover tool failures, max steps, network errors

### Should Improve (Recommended)
1. Model selection rationale (why MiMo-V2-Flash)
2. Complete file list (missing schemas and mock tool files)
3. Concrete test cases beyond "hello world"
4. Attribution extension for tool usage tracking
5. Clearer integration checkpoint (Debug Page specifics)
6. Forward reference to `/agent` route decision
7. `Message` type definition in Rust
8. `maxSteps` behavior specification

### Consider (Future Iterations)
1. Token optimization by extracting only essential principles (not full activation steps)
2. Lazy-loading persona context for adaptive prompts (v0.3 feature)

---

## LLM Optimization Assessment

**Current Story Structure:** ⚠️ ADEQUATE but verbose in places

**Improvements Needed:**
1. **Reduce Ambiguity:** "Condense" appears 3 times with zero concrete examples → Replace with actual template
2. **Increase Actionability:** "May exist" (Line 63) is wishy-washy → Specify dependency clearly
3. **Structure for Scanning:** AC #2 has nested bullets without clear sub-task delineation → Use numbered sub-tasks
4. **Token Efficiency:** "Choose" (L22, L24) creates branching paths → Pick ONE approach and specify

**Recommended Rewrites:**
- Line 41-43: Replace "*Condenses*" with actual markdown template (see Critical #2)
- Line 22: Remove "(or created separate...)" → Choose one strategy
- Lines 98-106: Add missing files, organize by layer (Backend / Frontend / Types)

---

## Validation Checklist Completion

| Category | Status | Score |
|----------|--------|-------|
| Epic & Story Context | ✓ PASS | Complete |
| Epics and Stories Analysis | ⚠ PARTIAL | Missing Epic 4.25 dependency |
| Architecture Deep-Dive | ✗ FAIL | Missing current backend state analysis |
| Previous Story Intelligence | ✗ FAIL | No reference to Epic 4.25 patterns |
| Git History Analysis | ➖ N/A | Not applicable for new infrastructure |
| Latest Technical Research | ✓ PASS | Research doc referenced |
| Reinvention Prevention Gaps | ⚠ PARTIAL | Risk of duplicating Epic 4.25 client |
| Technical Specification | ✗ FAIL | Message struct missing, maxSteps vague |
| File Structure | ⚠ PARTIAL | Incomplete file list |
| Regression Prevention | ⚠ PARTIAL | Backward compatibility mentioned but not detailed |
| Implementation Clarity | ✗ FAIL | "Condense" too vague, no template |
| Completion Criteria | ⚠ PARTIAL | "Hello world" test undefined |
| LLM Optimization | ⚠ PARTIAL | Some verbosity, needs concrete examples |
| Token Efficiency | ⚠ PARTIAL | Acceptable but could be more direct |
| Unambiguous Language | ✗ FAIL | Multiple "or" choices, no decisions made |
| Scannable Structure | ✓ PASS | Good use of headings and bullets |

**Overall:** 2 PASS, 8 PARTIAL, 6 FAIL = **38% Pass Rate**

---

## Next Steps

1. **User Decision Required:** Review this validation report
2. **Select Improvements:** Choose which issues to address (all critical recommended)
3. **Apply Changes:** I can update the story file to incorporate approved improvements
4. **Re-Validation (Optional):** Run validation again after changes to verify 80%+ pass rate

**💡 Recommendation:** Apply ALL 6 Critical improvements before running dev-story to prevent implementation thrashing and wasted effort.
