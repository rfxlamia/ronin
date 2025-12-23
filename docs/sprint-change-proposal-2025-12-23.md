# Sprint Change Proposal: Epic 4.5 Agent Execution Gap (REVISED)

**Date:** 2025-12-23  
**Issue:** Stories 4.5.2/4.5.3 complete but integration missing  
**Scope:** ONE story with sub-task boundaries

---

## Issue Summary

**The Missing Integration:** Vercel SDK → call tools → update UI. That's it.

Stories 4.5.2/4.5.3 built the parts (tools, UI), just not connected.

---

## Solution: Story 4.5.4 Agent Execution Integration

**ONE story with clear sub-tasks** (better than 2 stories for context window):

| Sub-task | Exit Point | Effort |
|----------|-----------|--------|
| 1. Tool wrapper emits events | Console.log shows events | 2h |
| 2. useAgentExecution hook | AI calls tools successfully | 2h |
| 3. Connect to UI | ProtocolViewer/ThinkingIndicator update | 1h |
| 4. Testing & polish | Full flow works | 1h |

**Total: ~6 hours**

---

## Why ONE Story is Better

- Dev reads ONE context (not two)
- Clear checkpoints to pause/resume
- No handoff confusion
- Same total effort

---

## Changes Made

| Artifact | Change |
|----------|--------|
| `epics.md` | Story 4.5.4 with 4 sub-tasks |
| `sprint-status.yaml` | `4.5-4-agent-execution-integration: backlog` |
| Removed | Story 4.5.5 (merged into 4.5.4) |
