---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - docs/analysis/brainstorming-session-2025-12-16.md
  - docs/analysis/research/technical-ronin-architecture-feasibility-research-2025-12-16.md
  - docs/analysis/audit-technical.md
workflowType: 'product-brief'
lastStep: 1
project_name: 'ronin'
user_name: 'V'
date: '2025-12-16'
---

# Product Brief: ronin

**Date:** 2025-12-16
**Author:** V

---

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Ronin is a "Personal Project Development Manager" for Linux that acts as the "HQ" (Markas Besar) for your coding life. It combines the organizational clarity of Notion with the repository management of GitHub Desktop, specifically designed to solve the problem of **Project Abandonment** caused by context loss ("What was I doing 3 months ago?"). Unlike generic launchers or heavy IDEs, Ronin provides a dedicated space to manage project health, track progress, and brainstorm architecture *before* the code editor is even opened. It leverages **Cloud-Native AI** (`gpt-oss-20b` via API) to provide intelligent context retrieval and maintaining momentum, without dragging down the local system performance.

---

## Core Vision

### Problem Statement

Developers with active creative minds often spawn multiple projects but struggle to maintain them over the long term. The primary friction is not "writing code," but **"Remembering Context."** When a project is left untouched for weeks, the mental effort to recall the architecture, next steps, and state becomes a barrier, leading to "Project Bitrot" and eventual abandonment. Existing tools are fragmented: Notion is too manual, GitHub Desktop is too limited to code, and IDEs are too focused on syntax.

### Proposed Solution; The "HQ" (Markas Besar)

Ronin serves as the **Project HQ**, a lightweight Rust/Tauri application that bridges the gap between "Idea" and "Implementation."
1.  **Context Keeper:** A dashboard that aggregates Git status, TODOs, and "Brain Dumps" for every project.
2.  **Smart Recovery:** Uses Cloud AI (`gpt-oss-20b`) to summarize "Where we left off" based on the last commits and notes.
3.  **Active Maintenance:** A "Silent Observer" that passively tracks engagement, nudging the user to keep projects alive without demanding manual timesheet entry.

### Key Differentiators

*   **Focus on Lifecycle, Not Just Launch:** Unlike a simple launcher, Ronin manages the *meta-game* of development (Planning, Reviewing, reviving).
*   **The "Second Brain" for Code:** Integrates structured project notes directly with the Git workflow.
*   **Pragmatic Intelligence:** Uses high-end Cloud models (gpt-oss-20b/120b) to act as a Senior Architect peer, avoiding the limitations of local hardware.

## Target Users

### Primary User: The "Polymath" Developer ("V")
*   **Role:** Solopreneur / Creative Developer / Senior Engineer.
*   **Behavior:** Has 10+ repos in various stages (Prototype, MVP, Maintenance).
*   **Pain Point:** "I have great ideas, start them, but forget them because managing the context switching is exhausting."
*   **Goal:** Consistency. Wants a tool that makes it easy to "hop back in" to a dormant project and immediately feel productive.

## Success Metrics

### User Success
*   **Resurrection Rate:** % of "Dormant" projects (inactive > 14 days) that successfully get new commits after being opened in Ronin.
*   **Context Recovery Time:** Time taken from "Opening Project" to "Understanding Goal" (measured by user feedback/AI chat interaction).

### Business Objectives
*   **Consistency:** Daily Active Usage (DAU) as a "Morning Check-in" tool.
## MVP Scope

### Core Features (The "HQ" V1)

#### 1. The Dashboard (Project Cards)
*   **Visual Grid:** A unified view of all tracked projects (Active, Dormant, Archived).
*   **Health Indicators:** Dynamic visual cues for "Days since last commit" and "Unpushed changes."
*   **Smart Sorting:** Automatically surfaces "Neglected but Important" projects to the top to prompt action.

#### 2. The Context Vault
*   **"Brain Dump" Pad:** A simple Markdown editor per project that syncs with a `DEVLOG.md` file in the repository root. This ensures notes live with the code.
*   **Git Status:** Read-only view of the current branch and uncommitted changes, allowing a "State Check" without opening the full IDE.

#### 3. The Consultant (AI Chat)
*   **Model:** `gpt-oss-20b` (via OpenRouter API).
*   **Context-Aware:** The chat session automatically ingests the `DEVLOG.md` and recent Git commit messages as system prompts.
    *   *User:* "Where was I?"
    *   *Ronin:* "You left off fixing the auth bug on branch `feature/login`."

#### 4. The Silent Observer (Light)
*   **Activity Tracking:** A passive background process that logs "Time Spent" per project based on active window titles. Used solely to generate "Project Health" metrics (e.g., "You haven't touched this in 14 days").

### Out of Scope for MVP

*   **Task Management:** No Kanban boards or ticket movement. Ronin integrates with tools like Notion/Jira/Linear but does not replace them.
*   **Code Editing:** Ronin is a manager, not an editor. It orchestrates the opening of VS Code/Zed/Terminal but provides no code editing capabilities itself.
*   **Local AI Inference:** Strictly Cloud API (OpenRouter) for V1 to ensure stability on 8GB RAM hardware.

### MVP Success Criteria

*   **Context Accuracy:** The AI Consultant correctly identifies the "Next Step" for a dormant project (> 2 weeks inactive) in 90% of test cases.
*   **System Stability:** The "Silent Observer" daemon runs for 24+ hours consuming < 15MB RAM.

### Future Vision
In the long term, Ronin evolves from a "Passive Manager" to an "Active Partner," potentially using local SLMs (Small Language Models) for privacy-first indexing and expanding into a full "OS Shell" for developers.
