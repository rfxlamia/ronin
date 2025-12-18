---
name: imagine
description: Generate professional Imagen 3/4 prompts for key frames from validated screenplay
type: creative-pipeline-stage-05
---

# Imagine Workflow

**Goal:** Generate detailed Imagen 3/4 prompts for key frames from the validated screenplay.

**Your Role:** You are a visual prompt architect. You translate screenplay chunks into professional image generation prompts.

**Core Principle:** Use natural language descriptions, not keyword lists. Imagen rewards verbose prose.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** with **smart context engineering**:

- workflow.md loads configuration only (minimal tokens)
- **Step 0: Run template generator script** (detects consistency needs)
- step-01 reviews template, presents questions to user
- step-02 generates Imagen prompts based on user answers
- step-03 creates output files with prompts and metadata
- References loaded on-demand for art styles

### Template-First Approach

**MANDATORY:** Before starting, run the template generator:

```bash
python {installed_path}/scripts/generate-template.py {active_project_path}
```

This script:
1. Reads **validated screenplay from 04-validator** (NOT screenwriter)
2. **Automatically detects** elements needing consistency:
   - Characters (names, dialogue patterns)
   - Locations (from sluglines, settings)
   - Props (significant objects mentioned)
   - Scene count
3. Generates structured template with questions for user
4. Outputs to `{active_project_path}/05-imagine/imagine-template-{timestamp}.md`

**Why this approach:**
- Hemat token - script does heavy lifting
- Natural flow - Claude reads screenplay context, then asks relevant questions
- Structured output - template ensures nothing is missed

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/.bmad/core/config.yaml` and resolve:

- `user_name`, `communication_language`, `output_folder`
- `date` as system-generated value

### Paths

- `installed_path` = `{project-root}/.bmad/creative-studio/workflows/imagine`
- `projects_registry` = `{project-root}/.bmad/creative-studio/_state/projects-registry.yaml`
- `active_project_path` = Read from projects_registry → active_project → path
- `pipeline_state_file` = `{active_project_path}/pipeline-state.yaml`
- `output_path` = `{active_project_path}/05-imagine/`
- `references_path` = `{installed_path}/references`

### Pipeline Context

- **Previous Stage:** 04 (production-validator)
- **Current Stage:** 05 (imagine)
- **Next Stage:** null (final stage)
- **Capability:** Generate Imagen 3/4 prompts for images
- **Scope:** Prompt generation for still images
- **Output Format:** Markdown with structured prompts

---

## INPUT LOADING

### Step 0: Load Input from Production-Validator

**CRITICAL:** Imagine workflow MUST read from **04-validator**, NOT 03-screenwriter.

Production-validator provides:
- **8-second chunks** optimized for Veo 3 generation
- **Key frame markers** indicating which moments need images
- **Feasibility validation** (camera movements, effects verified)
- **Continuity tags** for character/location consistency

**BEFORE executing step-01:**

1. **Read projects registry:** `{project-root}/.bmad/creative-studio/_state/projects-registry.yaml`
2. **Get active project path:** Extract active_project → path
3. **Read pipeline state:** `{active_project_path}/pipeline-state.yaml`
4. **Find validator output:** Extract from stage "04-validator" → outputs
5. **Load validated screenplay:** Read from `{active_project_path}/04-validator/validated-*.md`

**Required input source (priority order):**
1. `{active_project_path}/04-validator/validated-screenplay-*.md` (PREFERRED)
2. `{active_project_path}/04-validator/validated-*.md` (fallback pattern)
3. ERROR if no 04-validator output exists

**DO NOT read from 03-screenwriter** - that content has not been validated/chunked.

**Required input fields from validated output:**
- `validated_screenplay_file` - Path to validated output
- `key_frames` - Recommended frames for image generation (from validator)
- `visual_style_guide` - Color, lighting, mood guidance
- `chunk_ids` - Scene chunk identifiers (e.g., 1a, 1b, 2a)

---

## CORE CONCEPTS

### Imagen Prompt Structure

Build prompts using **Subject-Context-Style** framework:

1. **Subject:** Primary focus (person, object, scenery)
2. **Context:** Environment, placement, background
3. **Style:** Aesthetic approach with technical specs

### Prompt Types

| Type | Use Case | Pattern |
|------|----------|---------|
| Photography | Realistic shots | "A photo of [subject], [context], [technical specs]" |
| Artistic | Stylized | "[Art style], [scene], [aesthetic details]" |
| Cinematic | Film frames | "[Cinematography], [scene], [color grading]" |

### Technical Specifications

**Lens types:**
- 24-85mm: Portraits, characters
- 60-105mm macro: Close-ups, details
- 10-24mm wide-angle: Landscapes, establishing

**Lighting:**
- Natural light, studio lighting
- Golden hour, dramatic lighting
- Soft diffused, hard shadows

**Quality modifiers:**
- Sharp focus, high detail
- Professional photography, 8K resolution
- Shot on ARRI Alexa, 35mm film

---

## ART STYLE REFERENCES

### Discovering Available Styles

Art styles are stored in the references directory. **Do NOT use a hardcoded list.**

**To get available art styles, run:**

```bash
ls {installed_path}/references/artstyle-*.md
```

This will return all available art style files (e.g., `artstyle-sciencesaru.md`, `artstyle-crewdson-hyperrealism.md`, etc.).

**Present to user as numbered options:**
1. Parse filename: `artstyle-{name}.md` → extract `{name}`
2. Convert to readable format: `sciencesaru` → "Science SARU"
3. Read first line of each file for description (usually contains style summary)

**Default style:** If user doesn't specify, use the first art style found alphabetically or ask user to choose.

### Using Art Styles

1. **List available:** Run `ls` on references directory
2. **Load reference:** Read the selected `artstyle-{name}.md` file
3. **Extract key vocabulary:** Visual language, techniques
4. **Apply to prompts:** Use style-specific descriptors

---

## EXECUTION

Execute steps sequentially:

### Step 01: Key Frame Selection & Style
Load: `./steps/step-01-select-frames.md`

Reviews key frames from validator and confirms art style.

### Step 02: Generate Imagen Prompts (ENHANCED)
Load: `./steps/step-02-generate-prompts.md`

Creates detailed prompts for each key frame with **enhanced capabilities**:
- **Character Consistency System:** Reference prompts for visual continuity
- **Dual Keyframe Generation:** First + Last frame for Veo 3 interpolation
- **Location Consistency:** Reusable location reference prompts
- **Props Progression:** Symbolic object tracking across scenes

**Enhanced References (load on-demand):**
- `./references/character-reference-template.md` - Character consistency framework
- `./references/keyframe-pair-system.md` - Dual keyframe generation guide
- `./references/location-consistency-guide.md` - Location reference system
- `./references/props-progression-system.md` - Props tracking framework

### Step 03: Generate Output Files
Load: `./steps/step-03-generate-output.md`

Creates final prompt file and completes pipeline.

---

## OUTPUT CONTRACT

### Content Output (.md file)

**File:** `imagine-prompts-{timestamp}.md`

Markdown with:
- Prompt for each key frame
- Technical parameters (aspect ratio, settings)
- Art style applied
- Visual consistency notes

### Tracking Output (.yaml file)

**File:** `{project-root}/.bmad/creative-studio/_state/imagine-{timestamp}.yaml`

Fields:
- `prompts_file` - Path to prompts
- `total_prompts` - Number generated
- `art_style` - Style used
- `pipeline_completed` - Boolean

---

## CONTEXT ENGINEERING PRINCIPLES

### 1. Minimal Token Load
- workflow.md: ~250 tokens
- Load steps on-demand
- Load art style reference only when generating

### 2. Self-Aware Scope
- CAN: Generate image prompts, apply art styles
- CANNOT: Generate video, modify screenplay

### 3. Lazy Loading
- Load art style reference when style is confirmed
- Load additional styles only if user requests

---

## CRITICAL CONSTRAINTS

### Imagen Limits
- **Text in image:** Max 25 characters per phrase, 3 phrases total
- **Token limit:** 480 tokens per prompt
- **Negative prompts:** Use descriptive terms, not instructions

### Best Practices
- Natural language over keywords
- Verbose descriptions rewarded
- Specific materials and textures
- Cinematography vocabulary

---

## START HERE

1. Load input from production-validator (Step 0)
2. Verify key frames are available
3. Load step-01 and begin frame selection
