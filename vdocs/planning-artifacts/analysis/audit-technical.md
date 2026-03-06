# Devil's Advocate Technical Feasibility Audit: Project Ronin

**Auditor:** Cynical Principal Architect
**Date:** 2025-12-16
**Classification:** INTERNAL - BRUTAL HONESTY

---

## 1. The Trivial (Easy) ✓

These are solved problems. Stop discussing them and just implement:

**SQLite Activity Daemon**
Writing a Rust daemon that polls every 5 seconds and writes to SQLite is first-semester systems programming. The `rusqlite` crate is battle-tested. Ship it.

**Context Launcher (TOML Config Runner)**
Parsing a `.ronin.toml` and spawning `std::process::Command` is approximately 50 lines of Rust. This is not architecture; this is a weekend project. The documents spend too much time discussing this "feature."

**OpenRouter API Client**
It's an HTTP POST request with an API key. The `reqwest` crate handles this. There is no technical risk here, only billing risk.

**Tauri v2 Shell + React Dashboard**
Tauri is production-ready. Building a dashboard UI is pure frontend grunt work. The only "complexity" is the usual CSS hell, which is a skill issue, not a technical limitation.

**GitHub Actions CI/CD Matrix**
The `tauri-apps/tauri-action` exists. Cross-compilation is a configuration problem, not an engineering problem. Copy an existing workflow and move on.

**Verdict:** These items should be in a "Week 1" sprint and never discussed again.

---

## 2. The Tar Pit (Hard/Complex) ⚠️

These will consume 80% of engineering time for 20% of user value. Here lies madness:

### 2.1 The "LSP Middleware" Fantasy

The documents describe this as "robust" and "non-blocking." Let me explain why this is a tar pit.

**The Illusion:**
> "Ronin sits between the Editor and the real Language Server... It intercepts `textDocument/didChange`... This avoids UI freezing because LSP is inherently asynchronous."

**The Reality:**
LSP is asynchronous *from the editor's perspective*, but your middleware introduces a **sequential bottleneck**. Every `didChange` event (triggered on *every keystroke* in some editors) must now:

1. Be received by Ronin Proxy
2. Be forwarded to the real LSP (rust-analyzer)
3. Optionally, trigger an AI inference
4. Aggregate responses
5. Forward back to the editor

If your "AI injection" step takes 50ms (local) or 500ms (cloud), you've introduced **perceptible latency into the autocomplete pipeline**. VS Code's "Ghost Text" (Copilot-style) tolerates this because it's *optional decoration*. But if your LSP proxy delays the *diagnostic* response (squiggly error lines), the editor will feel sluggish.

**The Maintenance Hell:**
You now own compatibility with:
- `rust-analyzer` (Rust)
- `tsserver` (TypeScript)
- `pyright` (Python)
- `clangd` (C/C++)
- Every other LSP the user might use

Each LSP has quirks. `rust-analyzer` sends incremental sync; `tsserver` sends full document sync. Your proxy must handle both. You've just become a protocol compatibility layer for the entire LSP ecosystem. Congratulations, you're now maintaining `null-ls` in Rust.

**Time Estimate:** 3-6 months to make it *not* feel broken. Forever to maintain.

---

### 2.2 The "Daimyo Protocol" (P2P Offloading) Tar Pit

The documents wave `libp2p` around like a magic wand. It is not magic. It is suffering.

**What libp2p Actually Requires:**
- **Discovery:** `mdns` works on the same LAN. Cool. What happens when the "Gaming PC" is in another room behind a different router? Now you need `libp2p-relay` and STUN/TURN-like hole punching. Suddenly you're debugging NAT traversal at 2 AM.
- **Identity Management:** Every node needs a `PeerId` (cryptographic identity). How do you pair the laptop with the phone? QR code? Manual key exchange? This is UX design, not code.
- **State Synchronization:** What if the inference request is sent, but the phone disconnects mid-response? Retry logic? Idempotency tokens? You're building a distributed system now.
- **Serialization:** Passing "AI context" (potentially megabytes of code) over QUIC requires a serialization format. Protobuf? MessagePack? `serde_json`? Each has trade-offs.

**The Core Problem:**
The 8GB laptop is your *bottleneck*. If you're offloading to a more powerful device, you must send context *to* that device. Sending 500KB of code context over Wi-Fi takes ~50ms (best case). Add inference latency. Add return trip. You've just made the "fast" local path slower than a direct OpenRouter call (which uses optimized edge servers).

**Time Estimate:** 6-12 months for a *reliable* P2P inference protocol. Or just use OpenRouter and ship the product.

---

### 2.3 The GNOME Shell Extension Distribution Nightmare

**The Problem:**
The documents correctly identify that Wayland requires a compositor-specific bridge. They propose a GNOME Shell Extension. Let's count the victims:

| Compositor | Solution Required | Effort |
|------------|-------------------|--------|
| GNOME (Wayland) | Shell Extension (GJS) | Medium |
| KDE Plasma (Wayland) | KWin Script (QML/JS) | Medium (different API) |
| Hyprland | IPC Socket (JSON) | Low (but undocumented churn) |
| Sway | IPC Socket (JSON) | Low |
| Weston | Probably nothing useful | N/A |
| X11 (legacy) | `xdotool` / `xprop` | Trivial |

You are not building *one* integration. You are building **six**, each with different APIs, different update cycles, and different user installation procedures.

**The Churn:**
GNOME 47 broke extensions that worked on GNOME 46. This happens *every major release*. Your extension will break every 6 months, and users will file angry issues saying "Ronin stopped showing my window context."

**The Alternative No One Wants to Hear:**
Focus on X11 first. Yes, it's "legacy." Yes, Wayland is the future. But X11 *works* on 90% of developer machines today (including Wayland sessions running XWayland for Electron apps). You can ship a product that works *now* instead of a product that works *theoretically* on Wayland in 2027.

**Time Estimate:** 1-2 weeks per compositor, plus ongoing maintenance tax forever.

---

## 3. The Theoretical (Possible, but...) 🤔

Technically achievable. Functionally questionable.

### 3.1 The "Hybrid AI" UX Disaster

**The Proposal:**
> Use local Gemma-2B for "instant" interactions and OpenRouter for "deep thought."

**The UX Problem:**
Users don't think in terms of "fast/simple" vs "slow/complex." They think: "I asked a question. Where is my answer?"

Scenario:
1. User asks: "Why is this function slow?"
2. Ronin routes to Gemma-2B (local, fast).
3. Gemma-2B hallucinates: "The function is slow because of the loop on line 42." (There is no loop on line 42.)
4. User loses trust.
5. User asks the *same question again*, hoping for a better answer.
6. Ronin routes to... Gemma-2B again (because the query looks "simple").

**The Consistency Problem:**
Different models have different personalities. GPT-4o is verbose and cautious. Phi-3 is terse and confident. Llama 3 70B is somewhere in between. Switching between them mid-session creates a jarring, inconsistent experience. The user doesn't know "who" they're talking to.

**The Latency Gap:**
- Local Phi-3 (Q4): ~50-150ms first token.
- OpenRouter GPT-4o: ~400-800ms first token.

That's a **5-10x latency difference**. Users will notice. They'll think the app is "sometimes fast, sometimes slow" and blame your product, not the model.

**The Fix (Unpleasant):**
Pick one strategy and commit:
- **All Local:** Ship with Phi-3. Accept the quality ceiling. Market it as "private and offline."
- **All Cloud:** Use OpenRouter exclusively. Accept the latency and cost. Market it as "powered by the best AI."
- **User Choice:** Let the user pick in settings. Don't auto-switch. Transparency > magic.

---

### 3.2 Memory Pressure: The 8GB Lie

Let's do the math the documents avoided:

| Process | RAM Usage |
|---------|-----------|
| Linux Desktop (GNOME) | ~800 MB |
| Tauri App (WebView + Rust) | ~200-400 MB |
| VS Code (Electron) | ~500-800 MB |
| rust-analyzer (for a medium project) | ~500 MB - 1 GB |
| Browser (10 tabs) | ~1-2 GB |
| Docker (if running) | ~500 MB - 2 GB |
| **Subtotal** | **~3.5 - 7 GB** |

**Remaining for "Local AI":** 1-4.5 GB (if you're lucky).

**Phi-3 Mini Q4:** ~2.4 GB to *load*. Inference spikes higher.

**The Verdict:**
On a "fully loaded" 8GB developer machine (IDE + Browser + Docker), there is **no safe margin** for local inference. The Linux OOM killer *will* eventually murder your AI sidecar, or worse, your IDE.

**The Documents' Optimism:**
> "Phi-3 runs comfortably on <4GB RAM while leaving room for the IDE."

This is true *in isolation*. It is false in the context of a real developer workstation.

**The Fix:**
- Default to OpenRouter. Make local inference an *opt-in expert mode* with a giant warning: "This will use 2-3GB of RAM. Close your browser first."
- Or: Fully commit to the "Daimyo" offloading and assume local inference is *never* on the primary machine.

---

### 3.3 Tauri IPC: The Hidden Serialization Tax

The documents mention passing "AI context" (code files, embeddings) between the Rust backend and the React frontend.

**The Problem:**
Tauri uses JSON serialization for IPC. Passing a 500KB code file means:
1. Rust serializes to JSON string.
2. JSON is copied into WebView memory.
3. JavaScript parses JSON into object.

This is fine for small payloads. For large context windows (128K tokens of code), you're looking at:
- **Serialization cost:** ~10-50ms
- **Memory duplication:** The data exists in both Rust heap and JS heap simultaneously.

**The Mitigation:**
Tauri v2 Channels and raw byte streams exist, but the documents propose using Tauri primarily for the "Dashboard UI." If the AI responses stream through the WebView, you're paying this tax on *every token*.

**The Fix:**
Keep AI inference entirely in the Rust sidecar. Stream tokens via a *separate* WebSocket or IPC channel, not Tauri commands. The WebView only displays; it never processes.

---

## 4. The Wall (Impossible / Dead End) 🛑

These cannot be engineered around. Stop trying.

### 4.1 Universal Wayland Window Tracking Without Root

**The Claim:**
> "D-Bus + Shell Extension is the only way to get granular context on Wayland without sudo."

**The Wall:**
This is true *for GNOME*. It is not universally true.

- **Hyprland:** Exposes IPC, but the protocol changes between versions with minimal deprecation warnings. You're at the mercy of a single maintainer's whims.
- **Sway:** Stable IPC, but intentionally *does not expose* window titles for non-focused windows (security by design).
- **KDE Plasma:** KWin scripting is powerful but poorly documented and changes between Plasma versions.

**The Fundamental Limit:**
Wayland's security model is *designed* to prevent exactly what Ronin wants to do. You cannot build a "universal window tracker" without either:
1. Root access (eBPF, which the documents correctly reject), or
2. A separate integration per compositor (which is a maintenance nightmare, not a Wall, but close).

**The Uncomfortable Truth:**
If your target user is a developer on Arch/Fedora running Hyprland, you cannot guarantee feature parity with a developer on Ubuntu running GNOME. This is not a bug; it's Wayland's design.

---

### 4.2 "Instant" Context Switching (CRIU Fantasy)

The documents already flagged this as "Red Light." Good. I'll confirm: **CRIU for GUI applications is a dead end.**

- GUI apps hold references to X11/Wayland sockets that are *file descriptor backed*. CRIU can dump the memory, but the FDs are invalidated on restore.
- GPU contexts (OpenGL/Vulkan) are *device-specific state*. They cannot be serialized to disk.
- Electron apps (VS Code) are especially fragile because they spawn multiple processes (main, renderer, GPU).

**Verdict:** Abandon this. Use session orchestration (scripts that re-open apps) instead. It's not sexy, but it works.

---

### 4.3 Local RAG on 8GB: The Embedding Problem

The documents propose:
> "Index codebase on idle; provide chat interface."

**The Hidden Cost:**
Indexing a codebase into a Vector DB requires an *embedding model*. Even a small embedding model (`all-MiniLM-L6-v2`) requires ~100-200MB RAM. But the *vector index itself* scales with codebase size.

- 10,000 code chunks × 384 dimensions × 4 bytes = ~15 MB (manageable)
- 100,000 code chunks = ~150 MB
- 1,000,000 chunks (large monorepo) = ~1.5 GB

On an 8GB machine already running Phi-3, you cannot fit a large vector index *and* the LLM *and* the IDE.

**The Fix:**
- Limit indexing to the *currently active project*, not the entire filesystem.
- Use disk-backed vector DBs (LanceDB supports this), accepting slower retrieval.
- Or: Offload RAG entirely to the "Daimyo" node.

---

## Critical Constraint Attack Summary

| Constraint | Attack Vector | Severity |
|------------|---------------|----------|
| Wayland Security | No universal solution; per-compositor maintenance forever | **HIGH** |
| Memory Pressure | 8GB is a lie when fully loaded; local LLM will OOM | **CRITICAL** |
| LSP Latency | Intercepting LSP introduces measurable input lag | **MEDIUM** |
| P2P Complexity | libp2p is not magic; NAT/state sync is 6+ months of work | **HIGH** |
| Hybrid AI UX | Model switching creates inconsistent, confusing experience | **MEDIUM** |

---

## Final Verdict: CONDITIONAL GO

**Not a "No-Go,"** but a **"Go with Massive Scope Reduction."**

### Ship This (MVP):

1. **SQLite Activity Tracker** (Process names only, not window titles)
2. **Context Launcher** (TOML + Command spawning)
3. **OpenRouter-only AI Chat** (No local inference in V1)
4. **Tauri Dashboard** (Project list, Git status, Daily standup display)

### Defer to V2 (After Validation):

- Local LLM inference (only after proving demand)
- P2P offloading (only if OpenRouter costs become prohibitive)
- LSP middleware (only if users explicitly request IDE integration)
- Wayland window tracking (only for GNOME initially; other compositors are "community contributions")

### Kill Entirely:

- CRIU/Reality VC
- FUSE filesystem ("Ghost in the Shell")
- Universal Wayland support as a V1 promise
- Any claim of "running on 8GB with local AI" in marketing

---

**The Cynical Summary:**

The *vision* of Ronin is compelling. The *implementation plan* is a classic case of "second system syndrome" — trying to build the perfect system before validating that anyone wants the basic one.

Build the boring version first. A glorified launcher + activity tracker + OpenRouter chat is useful *today*. The Ghost in the Shell FUSE-based AI filesystem is a PhD thesis, not a product.

Ship. Learn. Iterate. Or drown in the tar pit.

*— The Architect Who Has Seen This Before*