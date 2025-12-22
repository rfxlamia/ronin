# Validation Report - Story 3.1: OpenRouter API Integration

**Document:** docs/sprint-artifacts/3-1-openrouter-api-integration.md
**Checklist:** _bmad/bmm/workflows/4-implementation/create-story/checklist.md
**Date:** 2025-12-20
**Validator:** Bob (Scrum Master)

---

## Summary

- **Overall:** 48/58 items passed (83%)
- **Critical Issues:** 7 (Must Fix)
- **Enhancement Opportunities:** 3 (Should Add)
- **Optimization Suggestions:** 0 (LLM already token-efficient)

---

## CRITICAL ISSUES (Must Fix)

### 1. Missing Critical File Structure Specification

**Gap:** Story doesn't specify the exact module structure for `src-tauri/src/ai/` and `src-tauri/src/security/`.

**Evidence:** Line 44 mentions "Create `src-tauri/src/ai/` and `src-tauri/src/security/`" but doesn't specify:
- Should it be `security.rs` or `security/mod.rs`?
- Exact file paths: `src-tauri/src/ai/openrouter.rs` vs `src-tauri/src/ai/mod.rs + openrouter.rs`?
- Do we need `src-tauri/src/ai/mod.rs` to export `OpenRouterClient`?

**Impact:** Developer might create wrong module structure, causing compilation errors or requiring refactoring.

**Recommendation:** Add explicit file structure specification:
```
Required Files:
- src-tauri/src/ai/mod.rs (exports openrouter module)
- src-tauri/src/ai/openrouter.rs (OpenRouterClient implementation)
- src-tauri/src/security.rs (encryption functions)
- src-tauri/src/commands/ai.rs (test_api_connection command)
```

---

### 2. Missing Encryption Key Storage Location

**Gap:** Story mentions "Generate a local secret key stored in `app_data_dir/secret.key`" (line 27) but doesn't specify the actual path or fallback strategy.

**Evidence:** Architecture doc (lines 72, 207) says "API keys stored with OS keyring integration or encrypted SQLite" - story doesn't clarify which approach to use.

**Impact:** Developer might hardcode the encryption key location, fail to handle cross-platform differences, or choose the wrong encryption strategy.

**Recommendation:** Add specific guidance:
```
Encryption Key Management:
- Primary: Use `tauri::api::path::app_data_dir()` to get base path
- Store encryption key at: `{app_data_dir}/ronin/secret.key`
- First-run: Generate 256-bit random key using `rand::thread_rng()`
- Permissions: Set file to 0600 (owner read/write only)
- Fallback: If key generation fails, show error (do NOT proceed with unencrypted storage)
```

---

### 3. Missing SettingsStore Frontend Refactor Context

**Gap:** Line 37-39 says "CRITICAL: Replace usage of generic `get_setting('openrouter_api_key')` with new secure commands" but doesn't provide the current implementation context.

**Evidence:** I found `src/stores/settingsStore.ts` uses `get_setting`/`update_setting` commands (Settings.tsx lines 15, 37). Story doesn't show:
- Current `settingsStore.ts` implementation using insecure commands
- Exact methods that need replacement (`loadApiKey`, `saveApiKey`, `removeApiKey`)
- Migration path for existing stored keys

**Impact:** Developer might not understand what needs to be changed in `settingsStore.ts`, leading to incomplete refactoring or breaking existing functionality.

**Recommendation:** Add specific refactoring guidance:
```
Frontend Refactoring (settingsStore.ts):
Current (INSECURE):
- `loadApiKey()` calls `get_setting('openrouter_api_key')` → returns plaintext
- `saveApiKey()` calls `update_setting('openrouter_api_key', key)` → stores plaintext

Required (SECURE):
- `loadApiKey()` must call new `get_api_key()` command → returns decrypted value
- `saveApiKey()` must call new `set_api_key()` command → encrypts before storing
- `removeApiKey()` must call new `delete_api_key()` command → deletes encrypted value
- Update imports in Settings.tsx (already uses these methods, just need backend swap)

Migration: Existing plaintext keys will be auto-migrated on first `set_api_key` call (detect plaintext, encrypt, store, delete old key).
```

---

### 4. Missing Streaming Response Type Specification

**Gap:** Story says "The client should return a `Stream` of chunks" (line 51) but doesn't specify:
- What Rust type exactly? `impl Stream<Item = Result<String, Error>>`?
- Which streaming library? `futures::stream::Stream`? `tokio_stream`?
- How frontend consumes it? WebSocket? SSE? Tauri events?

**Evidence:** Architecture mentions "streaming responses" but story doesn't clarify implementation details. Epic 3 Story 3.3 mentions "AI chunks stream progressively" but doesn't specify the transport mechanism.

**Impact:** Developer might choose incompatible streaming approach (e.g., async iterator vs Tauri events), requiring rework.

**Recommendation:** Add streaming specification:
```
Streaming Implementation:
Backend (Rust):
- Return type: async fn that emits Tauri events
- Use `eventsource-stream` crate to parse SSE from OpenRouter
- Emit chunks via `app_handle.emit_all("ai-chunk", chunk)`
- Emit completion via `app_handle.emit_all("ai-complete", full_response)`
- Emit errors via `app_handle.emit_all("ai-error", error_msg)`

Frontend (React):
- Listen to events using `@tauri-apps/api/event`
- Example: `listen('ai-chunk', (event) => appendChunk(event.payload))`
- ContextPanel component (Story 3.3) will handle the event subscriptions
```

---

### 5. Missing Error Handling Exhaustiveness

**Gap:** Line 16 says "Handles 401 (Auth), 429 (Rate Limit), and network errors gracefully" but doesn't specify:
- What about 500 (Server Error)? 503 (Service Unavailable)?
- Timeout duration and retry strategy?
- How to differentiate between transient vs permanent failures?

**Evidence:** Epic 3 Story 3.6 defines 3 error states (offline, API error, rate limit) but story doesn't map HTTP codes to these states.

**Impact:** Developer might only handle listed errors, leading to unhandled panic or poor UX for other errors.

**Recommendation:** Add comprehensive error handling matrix:
```
Error Handling Specification:
| HTTP Code | Error Type | Frontend Display | Retry Strategy |
|-----------|------------|------------------|----------------|
| 401 | Auth | "Invalid API key" | No retry, prompt user to update key |
| 429 | Rate Limit | "AI resting. Try again in {X}s" | Auto-retry after {X} seconds from Retry-After header |
| 500, 502, 503 | Server Error | "AI reconnecting..." | Exponential backoff (1s, 2s, 4s), max 3 retries |
| Timeout (>30s) | Network | "Offline mode. Local tools ready." | Show cached context, offer manual retry |
| DNS/Connection | Offline | "Offline mode. Local tools ready." | No auto-retry, show cached context |

Implement `map_error_to_display_state(status_code, error) -> ErrorState` helper.
```

---

### 6. Missing Test Connection Command Specification

**Gap:** Line 18 says "`test_api_connection` command verifies the key works" but doesn't specify:
- What endpoint to test against?
- What request payload?
- How to validate the response?
- Timeout for test requests?

**Evidence:** Settings.tsx line 29 calls `testApiKey(apiKeyInput)` but story doesn't define the backend command signature or behavior.

**Impact:** Developer might implement incomplete validation (e.g., only checking key format, not actual API connectivity).

**Recommendation:** Add test connection specification:
```
Test API Connection Command:
Signature:
```rust
#[tauri::command]
async fn test_api_connection(api_key: String) -> Result<bool, String>
```

Behavior:
1. Make minimal test request to OpenRouter:
   POST https://openrouter.ai/api/v1/chat/completions
   Headers: Authorization: Bearer {api_key}, HTTP-Referer, X-Title
   Body: { "model": "xiaomi/mimo-v2-flash:free", "messages": [{"role": "user", "content": "test"}], "max_tokens": 1 }
2. Timeout: 10 seconds
3. Return true if 200 OK, false if 401, error message for others
4. Don't emit events (this is validation only, not streaming)
```

---

### 7. Missing Previous Story Integration Context

**Gap:** Lines 68-70 mention "Recent commits introduced `src/pages/Settings.tsx` using `update_setting` for the API key. **This is insecure.**" but doesn't provide:
- Git commit reference or date for context
- Which specific commits introduced this?
- Any other related changes in those commits that might affect this story?

**Evidence:** Story says "Git Command: `src-tauri/src/commands/git.rs` was recently added" but doesn't explain how AI module should integrate with existing command registration patterns.

**Impact:** Developer might not understand the broader context, miss integration points, or duplicate work.

**Recommendation:** Add previous work context:
```
Previous Story Context (from git history):
- Commit 1962886: Added `src-tauri/src/commands/git.rs` and `Settings.tsx`
- Settings.tsx currently uses INSECURE `update_setting('openrouter_api_key', plaintext)`
- Command registration pattern: See `src-tauri/src/lib.rs` lines 30-35 (invoke_handler macro)
- Database schema: `settings` table already exists (Story 1.3), just needs secure key handling
- Follow same pattern: Create `src-tauri/src/commands/ai.rs` for `test_api_connection`
- Register new commands in lib.rs: `set_api_key`, `get_api_key`, `delete_api_key`, `test_api_connection`
```

---

## ENHANCEMENT OPPORTUNITIES (Should Add)

### 1. Missing Streaming Performance Guidance

**Current:** Story specifies streaming support but doesn't provide performance targets.

**Evidence:** NFR1 says "Context recovery < 10s total, first content < 2s" but story doesn't translate this to streaming behavior.

**Benefit:** Helps developer optimize chunk size, buffering strategy, and emission frequency.

**Recommendation:** Add streaming performance guidance:
```
Streaming Performance Requirements:
- First chunk must arrive within 2 seconds (NFR1, NFR23)
- Chunk size: 50-200 characters (balance between smoothness and overhead)
- Emit frequency: As received from OpenRouter (don't buffer client-side)
- Progress indicator: Show "words streamed" count in UI
- Fallback: If streaming fails, fall back to non-streaming request with loading spinner
```

---

### 2. Missing Encryption Algorithm Justification

**Current:** Story says "Use `aes-gcm` is recommended for ease of use over raw `ring`" (line 50) but doesn't explain trade-offs.

**Evidence:** Architecture mentions both `ring` and `aes-gcm` (line 207) as options but story doesn't clarify which to actually use.

**Benefit:** Developer understands why one approach was chosen, can make informed decisions if requirements change.

**Recommendation:** Add encryption approach clarification:
```
Encryption Algorithm Decision:
**Use `aes-gcm` crate (NOT `ring`)**

Rationale:
- Simpler API for single-value encryption (API key is one string, not bulk data)
- Handles nonce generation automatically
- AEAD (Authenticated Encryption with Associated Data) prevents tampering
- Performance difference negligible for single-key encryption
- Well-tested, audited crate

Implementation:
```rust
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};
use rand::Rng;

// Generate encryption key (256-bit)
let key_bytes: [u8; 32] = rand::thread_rng().gen();
// Store in app_data_dir/secret.key

// Encrypt API key
let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
let cipher = Aes256Gcm::new(Key::from_slice(&key_bytes));
let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce_bytes), api_key.as_bytes())?;
// Store: nonce || ciphertext in SQLite settings table
```
```

---

### 3. Missing Default Model Configuration Strategy

**Current:** Story specifies default model (xiaomi/mimo-v2-flash:free) but doesn't explain model selection strategy or fallback.

**Evidence:** Line 62 mentions "Default for testing. Fallback: z-ai/glm-4.5-air:free or openai/gpt-oss-20b:free" but doesn't specify:
- When to fallback?
- How to detect model availability?
- Should model be user-configurable?

**Benefit:** Prevents failures when default model is unavailable, prepares for future configurability.

**Recommendation:** Add model configuration strategy:
```
Model Selection Strategy:
1. Default: "xiaomi/mimo-v2-flash:free" (fastest free model as of Dec 2024)
2. Fallback order (if default returns 404 or model_not_found):
   a. "z-ai/glm-4.5-air:free"
   b. "openai/gpt-oss-20b:free"
3. Error if all 3 fail: "OpenRouter free models unavailable. Please check your API key or try later."
4. Future (Story 3.8+): Make model configurable in Settings.tsx
5. Store last successful model in settings table to avoid re-trying failed models

Implementation: Wrap model selection in `get_available_model()` function with fallback logic.
```

---

## PASSED ITEMS

### Epics and Stories Analysis ✓
- Epic 3 objectives clearly understood
- Story 3.1 acceptance criteria captured
- Cross-story dependencies noted (Story 3.3 ContextPanel will consume this)

### Architecture Context ✓
- Technical stack versions identified (Rust, Tauri 2, reqwest 0.11+)
- Security requirements (NFR11 encryption) understood
- Module structure partially specified (needs clarification per Critical Issue #1)
- API design pattern noted (Tauri commands)

### Library Requirements ✓
- reqwest with features (json, stream, rustls-tls) specified
- futures crate included
- aes-gcm encryption recommended (needs justification per Enhancement #2)
- Optional eventsource-stream noted

### Technical Specifications ✓
- API endpoint correct: https://openrouter.ai/api/v1/chat/completions
- Headers complete (Authorization, HTTP-Referer, X-Title)
- Request body format specified
- Default model provided (needs fallback strategy per Enhancement #3)

### Previous Work Context ✓
- Warning about insecure Settings.tsx implementation noted
- Git commands module referenced for pattern consistency
- Need for refactoring explicitly flagged

### Security Requirements ✓
- NFR11 encryption requirement highlighted multiple times
- Plaintext storage explicitly forbidden
- "No leaks" acceptance criterion (line 19)

### Dependencies ✓
- All required crates listed (reqwest, futures, aes-gcm, base64, rand)
- Features specified for reqwest (json, stream, rustls-tls)

### Error Handling - Partial ✓
- 401, 429, network errors mentioned (needs expansion per Critical Issue #5)

### File Location Guidance - Partial ✓
- Module creation mentioned (needs clarification per Critical Issue #1)

---

## OPTIMIZATION INSIGHTS

**LLM Token Efficiency:** ✓ EXCELLENT
Story is already well-optimized for LLM consumption:
- Concise bullet points, no verbose prose
- Clear section headers (Acceptance Criteria, Tasks, Dev Notes)
- Technical specifics in code blocks
- Critical warnings highlighted with bold
- No unnecessary backstory or justification

**No optimization changes needed.** Story structure is exemplary for developer agent consumption.

---

## RECOMMENDATIONS SUMMARY

### Must Fix (Blockers)
1. Add explicit file structure specification (Critical #1)
2. Clarify encryption key storage location and permissions (Critical #2)
3. Provide SettingsStore refactoring context and migration path (Critical #3)
4. Specify streaming implementation details (types, transport, events) (Critical #4)
5. Expand error handling matrix for all HTTP codes (Critical #5)
6. Define test_api_connection command behavior (Critical #6)
7. Add previous story integration context with git references (Critical #7)

### Should Improve (Important)
8. Add streaming performance targets and chunk size guidance (Enhancement #1)
9. Justify encryption algorithm choice with implementation example (Enhancement #2)
10. Define model selection fallback strategy (Enhancement #3)

### Priority Order for Fixes
1. **Critical #3** (Frontend refactoring context) - Developer needs this immediately to avoid wrong approach
2. **Critical #4** (Streaming specification) - Architectural decision that affects multiple components
3. **Critical #1** (File structure) - Prevents compilation errors and rework
4. **Critical #2** (Encryption key storage) - Security-critical, affects NFR11 compliance
5. **Critical #5** (Error handling) - Affects UX and reliability
6. **Critical #6** (Test connection) - Needed for Settings.tsx validation flow
7. **Critical #7** (Previous work context) - Helps developer understand broader picture
8. Enhancements #1-3 (Nice to have, but not blockers)

---

## Validation Conclusion

Story 3.1 has **solid foundation** with clear acceptance criteria and technical requirements. The critical gaps are primarily around **implementation specifics** that would cause developer confusion or require clarification mid-implementation:

- **Security implementation details** (encryption key storage, migration)
- **Streaming architecture** (events vs websockets, chunk types)
- **Error handling exhaustiveness** (beyond just 401/429)
- **Frontend integration context** (how to refactor existing insecure code)

**Recommendation:** Apply Critical fixes #1-7 before marking story as "ready-for-dev". Current state would require mid-implementation questions and could lead to wrong architectural choices.

**Estimated Impact:** Fixing all critical issues will prevent ~3-5 hours of developer confusion, rework, and mid-sprint clarification questions.
