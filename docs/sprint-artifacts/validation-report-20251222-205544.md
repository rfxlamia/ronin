# Validation Report

**Document:** docs/sprint-artifacts/4.5-2-tool-implementation-protocol-execution.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-22 20:55:44
**Validator:** Bob (Scrum Master) + Code Review Agent

## Summary

- **Overall:** 5 Critical Issues, 4 Enhancement Opportunities, 4 LLM Optimizations
- **Critical Issues:** 5 MUST-FIX items that will cause implementation disasters
- **Status:** ⚠️ MAJOR REVISION REQUIRED before development

## Critical Issues Found

### 🚨 1. BREAKING ARCHITECTURAL VIOLATION: Git Implementation Contradiction

**Severity:** CRITICAL - Will create duplicate functionality
**Lines:** 77-92, 334-351, 466-478

**Problem:**
The story specifies creating NEW `git_status` and `git_log` commands in `src-tauri/src/commands/tools.rs` using **shell commands**, but:

- ✅ `src-tauri/src/commands/git.rs` ALREADY implements these EXACT functions using **git2-rs library** (Story 3.2)
- ❌ Story would create DUPLICATE functionality with DIFFERENT implementation (shell vs git2-rs)
- ❌ Story contradicts itself: Dev Notes line 466 says "reuse Story 3.2 git infrastructure" but AC says "use shell command `git status --porcelain`"

**Evidence:**
```rust
// EXISTING in src-tauri/src/commands/git.rs (lines 30-216):
#[tauri::command]
pub async fn get_git_status(path: String) -> Result<GitStatus, String> { /* git2-rs impl */ }

#[tauri::command]
pub async fn get_git_history(path: String, limit: Option<usize>) -> Result<Vec<GitCommit>, String> { /* git2-rs impl */ }

// PROPOSED in Story 4.5.2 AC #1.C-D:
// Create NEW git_status command using `git status --porcelain` shell command
// Create NEW git_log command using `git log --oneline` shell command
```

**Architecture says:**
- Line 1380-1391: "MVP: Shell Commands, Post-MVP (3-month): Migrate to git2-rs"
- **BUT** git2-rs migration is ALREADY DONE in Story 3.2

**Impact:**
- Developer will create conflicting commands with same names
- Two different GitStatus struct definitions will exist
- Violates DRY principle
- Wastes implementation time on duplicate logic

**Must Fix:**
- **RECOMMENDED:** Change AC #1.C-D to import and reuse existing `get_git_status` and `get_git_history` from git.rs
- Add security wrapper around existing functions (validate_tool_path)
- Update struct definitions to match existing git.rs structs
- Remove shell command specifications

---

### 🚨 2. CRITICAL SECURITY GAP: Missing Project Path Validation

**Severity:** CRITICAL - Security vulnerability
**Lines:** 95-104 (AC #1.E)

**Problem:**
Story specifies `validate_tool_path` helper but does NOT specify how to verify that `project_path` is a tracked project in the database.

**Attack Scenario:**
```rust
// Attacker calls:
read_file(project_path: "/etc", file_path: "passwd")

// validate_tool_path checks:
// ✓ "/etc/passwd" is within "/etc" → PASS
// ✗ But never checks if "/etc" is a tracked project!

// Result: Security bypassed, reads /etc/passwd
```

**What's Missing:**
```rust
// Story specifies:
fn validate_tool_path(project_path: &str, requested_path: &str) -> Result<PathBuf, String>

// Missing step:
// 1. Query database: SELECT id FROM projects WHERE path = ?
// 2. If not found → Err("Project not tracked")
// 3. THEN do path traversal checks
```

**Evidence from Story:**
- AC #1.E line 102: "Project path is in tracked projects list (from database)" - mentioned but NOT in function signature or implementation
- Task 2.4 line 309: "Add tracked project verification (query database)" - task exists but NO specification of HOW

**Impact:**
- Path traversal protection can be bypassed by using system directories
- Tools could access ANY directory on system if project_path validation missing
- Security tests (AC #6.B) will fail

**Must Fix:**
Add to AC #1.E:
```rust
fn validate_tool_path(
    db: &SqlitePool,           // ← Add database parameter
    project_path: &str,
    requested_path: &str
) -> Result<PathBuf, String> {
    // 1. Verify project exists in database
    let project = sqlx::query!("SELECT id FROM projects WHERE path = ?", project_path)
        .fetch_optional(db)
        .await?
        .ok_or("Project not tracked")?;

    // 2. THEN do path traversal checks
    // ...
}
```

---

### 🚨 3. SPECIFICATION DISASTER: Protocol Execution Architecture Undefined

**Severity:** CRITICAL - Implementation will fail
**Lines:** 165-221 (AC #3)

**Problem:**
Story defines `PROJECT_RESURRECTION_PROTOCOL` with 5 steps but does NOT specify:
1. HOW protocol steps are executed (who interprets the JSON?)
2. HOW step completion is detected (LLM output parsing? Explicit marker?)
3. HOW protocol steps relate to Vercel SDK `maxSteps: 10`

**Contradiction:**
- AC #3.A: Protocol has 5 steps (step-01 through step-05)
- AC #3.B: "Uses Vercel AI SDK `maxSteps: 10`"
- AC #3.B: "Each step completion logged in reasoning store"

**What's unclear:**
```typescript
// Protocol says:
steps: [
  { id: 'step-01-discover-structure', instruction: 'Use list_dir...' },
  { id: 'step-02-read-metadata', instruction: 'Read package.json...' },
  // ...
]

// Questions:
// 1. Does LLM receive these instructions as system prompt?
// 2. If LLM calls list_dir 3 times in step-01, is that:
//    - 3 steps (maxSteps counts tool calls?)
//    - Still step 1 (protocol steps != tool call steps?)
// 3. How does reasoningStore know "step-01 complete, move to step-02"?
//    - Parse LLM output for markers?
//    - Count tool calls?
//    - Manual progression?
```

**Evidence from Story 4.5.1:**
- Vercel AI SDK `maxSteps` controls TOOL CALL loop iterations
- ReasoningProtocol is just TypeScript interface, no execution engine specified
- No code showing how protocol JSON maps to LLM behavior

**Impact:**
- Developer won't know what to build for protocol execution
- Story 4.5.3 (Agent Route & UI) will need to guess at integration
- Testing (AC #5.B) requires protocol execution but it's not specified

**Must Add to AC #3.B:**
```markdown
**Protocol Execution Architecture:**

Protocol steps are INFORMATIONAL GUIDANCE embedded in system prompt:
- System prompt includes: "Follow these 5 steps: [protocol.steps]"
- LLM autonomously decides tool call sequence (may not follow strict order)
- `maxSteps: 10` is SAFETY LIMIT for total tool calls (not protocol step count)
- Step completion is IMPLICIT (reasoningStore logs tool calls, UI shows progress)

**Step Logging:**
Each tool call appends to stepHistory with current protocol step context:
```typescript
// After each tool call:
reasoningStore.appendStep({
  stepId: 'step-02-read-metadata',  // ← Current protocol step context
  toolCallsMade: ['read_file(package.json)'],
  output: '[LLM reasoning]'
});
```

**No strict enforcement:** LLM can jump between steps or repeat steps as needed.
```

---

### 🚨 4. REGRESSION DISASTER: Context Injection Breaks Story 4.5.1

**Severity:** CRITICAL - Breaking change to existing code
**Lines:** 154-158 (AC #2.C)

**Problem:**
Story 4.5.2 changes tool signature from `execute(params)` to `execute(params, context)` but:
- Story 4.5.1 mock tools use OLD signature
- No migration plan for existing tools
- No specification of WHERE context injection happens

**Evidence:**
```typescript
// Story 4.5.1 delivered (src/lib/ai/tools/mock/index.ts):
execute: async ({ path }: z.infer<typeof readFileSchema>) => {
  // ← Only ONE parameter
}

// Story 4.5.2 specifies (AC #2.C line 156):
execute: async (params, context) => {
  const { projectId } = context; // ← NEW second parameter
}

// These are INCOMPATIBLE signatures
```

**What's Missing:**
1. WHO adds context injection wrapper? (Vercel SDK? Custom middleware? Each tool manually?)
2. Type definition for `context` parameter
3. Migration impact on Story 4.5.1 tests (mock tools need update?)

**From src/lib/ai/client.ts (Story 4.5.1):**
No evidence of context injection mechanism in `createTauriLanguageModel`. Client doesn't pass projectId to tools.

**Impact:**
- Story 4.5.1 tests will break when tools updated
- Developer won't know where to implement context wrapper
- Type errors if context shape not specified

**Must Fix:**
Add new AC section after #2.C:

```markdown
**D. Context Injection Wrapper (src/lib/ai/tools/wrapper.ts - NEW)**
- [ ] Create `wrapToolsWithContext` function:
  ```typescript
  export function wrapToolsWithContext(
    tools: Record<string, Tool>,
    projectId: number,
    mode: AgentMode
  ): Record<string, Tool> {
    return Object.fromEntries(
      Object.entries(tools).map(([name, tool]) => [
        name,
        {
          ...tool,
          execute: async (params: any) => {
            const context = { projectId, mode };
            return tool.execute(params, context); // ← Inject here
          }
        }
      ])
    );
  }
  ```
- [ ] Update `createTauriLanguageModel` to call wrapper before passing tools to SDK
- [ ] Add `ToolExecutionContext` type definition:
  ```typescript
  export interface ToolExecutionContext {
    projectId: number;
    mode: AgentMode;
  }
  ```
```

---

### 🚨 5. IMPLEMENTATION DISASTER: Tool Call Logger Integration Undefined

**Severity:** HIGH - Feature won't work correctly
**Lines:** 140-152 (AC #2.B)

**Problem:**
Story creates `logToolCall` function but does NOT specify:
1. WHO calls it (automatic wrapper? manual in each tool?)
2. WHEN it's called (before tool execution? after? both?)
3. WHERE does `stepId` come from (tools don't have protocol step context)

**Specification says:**
```typescript
// AC #2.B:
logToolCall(projectId: string, tool: string, params: any, result: any)
// Appends to reasoning store's stepHistory with toolCallsMade field

// But tools execute independently:
read_file: tool({
  execute: async ({ path }, { projectId }) => {
    const content = await invoke(...);
    // ❓ When does logToolCall get called?
    // ❓ How does tool know which stepId it's in?
    return content;
  }
})
```

**From reasoningStore (Story 4.5.1):**
```typescript
interface StepHistoryEntry {
  stepId: string;  // ← Tools need to know this
  toolCallsMade?: string[];
}
```

**Problem:** Tools don't have access to `currentStepId` unless explicitly passed in context.

**Impact:**
- Tool calls won't be logged to correct protocol step
- ThinkingIndicator (Story 4.5.3) won't show accurate progress
- Debugging will be difficult (no tool call history)

**Must Fix:**
Update AC #2.C to include stepId in context:
```typescript
// Context structure:
export interface ToolExecutionContext {
  projectId: number;
  mode: AgentMode;
  currentStepId: string;  // ← Add this
}
```

Add to AC #2.B:
```markdown
**Automatic Tool Call Logging:**
All tools automatically wrapped to log calls:
```typescript
// In wrapper.ts:
execute: async (params: any) => {
  const context = getToolContext(); // { projectId, mode, currentStepId }
  const result = await tool.execute(params, context);

  // Automatic logging AFTER execution:
  logToolCall(context.projectId, name, params, result);

  return result;
}
```

No manual logging required in individual tool implementations.
```

---

## Enhancement Opportunities (Should Add)

### ⚡ 1. Performance Optimization: Tool Call Caching Missing

**Benefit:** Meet <500ms git_status NFR even on slow repos
**Lines:** Performance requirements 652-659

**Opportunity:**
Protocol step-03 calls `git_status` + `git_log`. If user retries analysis within 1 minute, why re-execute git commands (500ms overhead)?

**Enhancement:**
```rust
// Add to tools.rs:
use std::collections::HashMap;
use std::time::{Instant, Duration};

struct ToolCache {
    git_status: HashMap<String, (GitStatus, Instant)>,
    git_log: HashMap<String, (Vec<CommitEntry>, Instant)>,
    ttl: Duration,  // 60 seconds
}

impl ToolCache {
    fn get_git_status(&mut self, path: &str) -> Option<GitStatus> {
        if let Some((cached, time)) = self.git_status.get(path) {
            if time.elapsed() < self.ttl {
                return Some(cached.clone());  // 500ms → 5ms
            }
        }
        None
    }
}
```

**Add to AC #1.C:**
- [ ] Implement simple in-memory cache with 60s TTL
- [ ] Cache invalidation on project file changes (optional, can defer)

---

### ⚡ 2. UX Enhancement: Attribution Extraction Contract Missing

**Benefit:** Story 4.5.3 has clear parsing contract, not guesswork
**Lines:** 217-221 (AC #3.C - DEFERRED)

**Problem:**
Story says "Based on: 📖 package.json, 🔀 git_log (20 commits)" but HOW is this extracted from LLM output? Regex? Structured output?

**Enhancement:**
```markdown
**Add to AC #3.C (remove "DEFERRED"):**

**Attribution Extraction Format:**
- [ ] Protocol step-05 system prompt includes:
  ```
  "When synthesizing, output attribution in YAML frontmatter:
  ---
  attribution:
    files_read: [package.json, README.md, DEVLOG.md]
    tool_calls: { read_file: 3, list_dir: 1, git_log: 1, git_status: 1 }
    confidence: high
  ---
  [Your Deep Status Report here]
  "
  ```
- [ ] Parse using: `const match = output.match(/---\nattribution:\n(.*?)\n---/s)`
- [ ] Story 4.5.3 receives structured data, not free-text parsing
```

---

### ⚡ 3. Testing Gap: Binary File Detection Test Not Specified

**Benefit:** Ensure binary detection is actually implemented
**Lines:** 38-40 (AC #1.A) mentions it, but Task 13 has no test

**Missing Test:**
```markdown
**Add to Task 13 (Security Testing):**
- [ ] 13.6. Test binary file rejection
  - Create 1MB .png file in test project directory
  - Call read_file("test.png")
  - Verify error: "File is binary, cannot read as text"
  - Verify file NOT loaded into memory (no 1MB allocation)
```

Without this test, developer might forget to implement binary detection (easy to miss).

---

### ⚡ 4. Architecture Clarity: Git Reuse Strategy Needs Decision

**Benefit:** Clear guidance prevents confusion about shell vs git2-rs
**Lines:** 466-478 (Dev Notes)

**Problem:**
Dev Notes say "reuse git shell command logic" but existing code uses git2-rs (libgit2), not shell commands.

**Enhancement:**
Replace vague note with ARCHITECTURAL DECISION:

```markdown
### Git Implementation Decision

**CORRECTION:** Architecture doc said "shell commands in MVP," but Story 3.2 already delivered git2-rs implementation (faster, safer, already tested). Use git2-rs.

**Approach:**
1. Import from git.rs: `use crate::commands::git::{get_git_status, get_git_history};`
2. Wrap with tool security validation (validate_tool_path)
3. Adapt struct fields if needed (e.g., add `has_remote` field to existing GitStatus)
4. No shell command implementation required

**Rationale:**
- git2-rs is already a dependency (Story 3.2)
- More robust than shell parsing (handles edge cases)
- Faster (no process spawn overhead)
- Already tested (src-tauri/src/commands/git.rs lines 218-505)

**Breaking Change:**
If git2-rs structs differ from story spec, extend existing structs rather than create new ones.
```

---

## LLM Optimization Improvements

### 🤖 1. Verbosity Problem: Duplicate Struct Definitions

**Issue:** Story defines GitStatus and CommitEntry in full detail, but these ALREADY EXIST in git.rs
**Lines:** 64-92 (AC #1.B-D)
**Token waste:** ~200 tokens
**Confusion:** Two different GitStatus definitions will confuse LLM

**Optimization:**
Replace AC #1.B-D with:
```markdown
**B-D. git_status and git_log Commands**
- [ ] Reuse existing structs from `src-tauri/src/commands/git.rs`:
  - `GitStatus` (lines 17-20): has `is_clean`, `modified_files`
  - `GitCommit` (lines 7-14): has `sha`, `author`, `date`, `message`, `files`
- [ ] If fields missing (e.g., `has_remote`, `branch`), extend structs in git.rs first
- [ ] Import commands: `use crate::commands::git::{get_git_status, get_git_history};`
- [ ] Wrap with security validation layer (validate_tool_path)
```

**Result:** Eliminates contradictory specs, saves tokens, references real code

---

### 🤖 2. Ambiguity: "Reuse Existing Git Infrastructure" Is Too Vague

**Issue:** Dev Notes say "reuse" but don't specify WHAT to reuse (shell? git2? functions? patterns?)
**Lines:** 466-478
**Confusion:** LLM will wonder "implement shell commands (what story says) or use git2 (what exists)?"

**Optimization:**
Replace vague note with explicit DECISION (see Enhancement #4 above)

---

### 🤖 3. Context Overload: Protocol Definition Out of Story Scope

**Issue:** Story includes FULL protocol with 5 steps (200 tokens), but this story is about TOOL implementation, not protocol execution
**Lines:** 170-206 (AC #3.A)
**Token waste:** Protocol details belong in Story 4.5.3 (UI will display these)

**Optimization:**
```markdown
**A. Protocol Structure (for testing only):**
- [ ] Create PROJECT_RESURRECTION_PROTOCOL in `src/lib/ai/protocols/project-resurrection.ts`
- [ ] Define 5 steps: discover-structure, read-metadata, analyze-git, read-devlog, synthesize
- [ ] Full step instructions defined in Epic 4.5 spec (lines 1263-1267)
- [ ] This story: Protocol is TEST INPUT to verify tool execution works
- [ ] Story 4.5.3 will use protocol for UI display and execution engine
```

**Result:** Saves ~150 tokens, keeps story focused on tool implementation

---

### 🤖 4. Missing Critical Signal: Security Requirements Buried

**Issue:** Security validation (MOST CRITICAL) appears as 5th sub-item in AC #1, easy to forget
**Lines:** 94-104 (AC #1.E)
**Risk:** LLM implements tools A-D and forgets security E (checklist fatigue)

**Optimization:**
Restructure AC #1 to LEAD with security:

```markdown
### 1. Tool Implementation - Backend (Rust Tauri Commands)

**CRITICAL FIRST: Security Layer (AC #1.E)**
- [ ] Create `validate_tool_path` helper function (ALL tools depend on this)
- [ ] Database query to verify project is tracked
- [ ] Path traversal protection (canonical path comparison)
- [ ] Symlink attack prevention
- [ ] Used by EVERY tool command before file operations

**Implementation Order: Security → Tools**

**Then: Tool Commands (AC #1.A-D)**
- [ ] read_file (uses validate_tool_path)
- [ ] list_dir (uses validate_tool_path)
- [ ] git_status (uses validate_tool_path)
- [ ] git_log (uses validate_tool_path)
```

**Result:** Security-first structure prevents "implement tools, forget validation" disaster

---

## Passed Validations (What's Done Right)

### ✅ Architectural Alignment
- Zustand reasoning store integration aligns with Story 4.5.1 schema
- Tool scaffolding strategy (mock → real) is clear progression
- Performance targets specified (\<30s protocol, \<500ms git commands)
- Error handling philosophy (Jin - compassionate errors) matches project-context.md

### ✅ Testing Coverage
- Security testing explicitly required (AC #6, Task 13)
- Integration checkpoint defined (AC #8.C before Story 4.5.3)
- Regression testing mentioned (Task 16)
- End-to-end protocol testing specified (Task 14)

### ✅ UX Requirements
- Graceful degradation specified (AC #4.C - works without DEVLOG)
- Empathetic error messages examples provided
- Streaming protocol consideration

### ✅ Documentation
- Clear file modification list (lines 595-612)
- Dependencies from previous stories documented
- Known limitations listed with rationale
- Dev notes provide architectural context

---

## Recommendations

### Must Fix (Before Implementation)

1. **CRITICAL: Resolve Git Implementation Contradiction**
   - Decision: Reuse git2-rs from git.rs OR implement shell commands?
   - Recommendation: **Reuse git2-rs** (already tested, faster, safer)
   - Update AC #1.C-D to import existing functions

2. **CRITICAL: Add Project Path Validation to Security Layer**
   - Add database parameter to `validate_tool_path`
   - Specify database query to check tracked projects
   - Update function signature in AC #1.E

3. **CRITICAL: Define Protocol Execution Architecture**
   - Clarify: Protocol steps are guidance, not strict execution order
   - Specify: maxSteps controls tool call limit, not protocol step count
   - Add architectural decision to Dev Notes

4. **CRITICAL: Specify Context Injection Mechanism**
   - Create wrapper function specification
   - Add ToolExecutionContext type definition
   - Clarify impact on Story 4.5.1 mock tools

5. **CRITICAL: Define Tool Call Logging Integration**
   - Automatic wrapper approach (not manual logging)
   - Add currentStepId to context
   - Specify WHEN logging happens (after tool execution)

### Should Improve (Quality Enhancement)

1. Add tool call caching (60s TTL) for performance
2. Define attribution extraction format (YAML frontmatter)
3. Add binary file detection test to Task 13
4. Replace vague "reuse" note with architectural decision

### Consider (LLM Optimization)

1. Remove duplicate struct definitions, reference git.rs
2. Lead AC #1 with security layer (prevent forgetting)
3. Move protocol details to Story 4.5.3 scope
4. Clarify git reuse strategy (shell vs git2-rs)

---

## Overall Assessment

**Status:** ⚠️ **MAJOR REVISION REQUIRED**

**Strengths:**
- Comprehensive testing approach (security, integration, regression)
- Clear UX requirements with graceful degradation
- Good documentation structure and known limitations list
- Strong alignment with Story 4.5.1 deliverables

**Critical Weaknesses:**
- Architectural contradiction: Story creates duplicate git commands that already exist
- Security gap: Project path validation incomplete
- Integration unclear: Protocol execution, context injection, tool logging undefined
- Breaking changes: Context injection signature incompatible with Story 4.5.1

**Recommendation:**
Before starting development, SM should:
1. Make architectural decision on git implementation (reuse git2-rs strongly recommended)
2. Add missing specifications for context injection and tool logging
3. Resolve breaking changes to Story 4.5.1 tool signatures
4. Clarify protocol execution model

**Estimated Rework:** 2-3 hours to revise story, incorporate findings, and validate again

**Ready for Dev?** ❌ **NOT YET** - Resolve 5 critical issues first

---

## Next Steps

**For Scrum Master (Bob):**
1. Review critical issues with user (V)
2. Make architectural decision on git implementation
3. Update story acceptance criteria based on recommendations
4. Re-run validation after revisions
5. Mark story as ready-for-dev only after validation passes

**For Developer:**
- **DO NOT start implementation** until critical issues resolved
- Story has solid foundation but needs architectural clarity
- Recommended: Wait for revised story with clear git reuse strategy

---

**Validation completed:** 2025-12-22 20:55:44
**Validator:** Bob (Scrum Master) + Code Review Agent (Sonnet 4.5)
**Checklist used:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
