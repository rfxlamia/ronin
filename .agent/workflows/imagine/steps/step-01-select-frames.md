# Step 01: Template Review & User Questions

**Goal:** Review generated template, present consistency questions to user, confirm art style.

**Scope:** Template review, user interaction, configuration.

**Token Budget:** ~300 tokens

---

## STEP 0: RUN TEMPLATE GENERATOR

**MANDATORY FIRST ACTION:**

```bash
python {installed_path}/scripts/generate-template.py {active_project_path}
```

**Expected output:** `{active_project_path}/05-imagine/imagine-template-{timestamp}.md`

If script fails, check:
- Pipeline state exists at project path
- Screenwriter output (03-screenwriter/) has screenplay file
- Python environment has yaml module

---

## STEP 1: LOAD AND REVIEW TEMPLATE

Read the generated template file. It contains:

1. **Detected Elements:**
   - Characters found (from screenplay)
   - Locations found (from sluglines)
   - Props detected (from context)
   - Scene count

2. **Questions for User:**
   - Q1: Character details
   - Q2: Dual keyframe mode
   - Q3: Art style selection

3. **Template Sections:**
   - Character reference section (to be filled)
   - Location reference section (to be filled)
   - Scene keyframes section (to be filled)

---

## STEP 1.5: VALIDATE DETECTED ELEMENTS

**CRITICAL:** Before presenting questions to user, validate template against screenplay context.

### Read Screenplay for Context

Load the screenplay file from `{active_project_path}/03-screenwriter/` to understand:
- Which characters are **physical people** vs interfaces/effects
- Which locations are **actual places** vs transitional states
- Context clues from `<characters>` tags with parentheticals

### Character Validation Rules

**FILTER OUT non-physical characters:**

1. **Interface/Software:**
   - Pattern: `Claude (interface)`, `AI (system)`, etc.
   - Action: Remove from character list - these need UI prompts, not character references

2. **Visual Effects:**
   - Pattern: `Audio Glitch`, `Screen Transition`, `Visual Split`
   - Context: Appears in action lines but not `<characters>` tags
   - Action: Already filtered by script (should not appear)

3. **Voiceover Only:**
   - Pattern: `(voiceover only)`, `(off-screen)`
   - Action: Keep character but note they may not need full body references

**VALIDATE physical characters:**

Check each detected character:
- Do they have dialogue in screenplay? (physical presence)
- Do they appear in `<characters>` tags consistently? (actual character)
- Are they described with physical attributes in action lines?

### Location Validation

**FILTER OUT transitional descriptions:**
- `"Transitioning from X to Y"` → Not a location, it's a camera movement
- `"Brief Moment"` → Not a location, it's a timing note

**KEEP actual physical spaces:**
- `"Aesthetic Desk Workspace"` ✓
- `"Real Workspace"` ✓
- `"Dermaga tua"` ✓

### Example Validation

**Template says:**
```
Characters: ['Content Creator', 'Claude']
```

**After validation:**
```
Physical Characters: ['Content Creator']
UI Elements (not characters): ['Claude (interface)']

Reasoning:
- Content Creator: Physical person, appears in <characters>, has actions
- Claude: Software interface, marked as "(interface)", needs UI design not character reference
```

---

## STEP 2: PRESENT QUESTIONS NATURALLY

### Q1: Character Consistency

Based on detected characters, ask user naturally:

```
Saya menemukan {N} karakter dalam screenplay: {character_list}

Untuk menjaga konsistensi visual di semua scene, saya perlu tahu detail fisik mereka.
Misalnya untuk {first_character}:
- Berapa usianya?
- Apa etnisnya dan seperti apa warna kulitnya?
- Bagaimana gaya rambutnya?
- Pakaian khas apa yang dia kenakan?

Apakah Anda ingin memberikan detail ini sekarang, atau saya generate berdasarkan konteks screenplay?
```

**If user provides details:** Record in template
**If user says generate:** Infer from screenplay context

### Q2: Dual Keyframe Mode

```
Screenplay memiliki {scene_count} scene.

Saya merekomendasikan mode DUAL KEYFRAME untuk scene-scene dengan:
- Pergerakan karakter (masuk/keluar frame)
- Perubahan emosi (sedih → marah)
- Camera movement (dolly in, pan)

Dengan dual keyframe, Veo 3 bisa menginterpolasi antara frame awal dan akhir
untuk hasil video yang lebih terkontrol.

Gunakan dual keyframe untuk scene dinamis? [Y/N]
```

**Default: Y (recommended)**

### Q3: Art Style

```
Pilih art style untuk project ini:

1. Science SARU - Anime Masaaki Yuasa (ekspresif, painterly)
2. Crewdson Hyperrealism - Cinematic photography (dramatis)
3. iPhone Social Media - Casual authentic (modern)
4. Corporate Memphis - Flat illustration (simple)
5. Photography - Photorealistic (dokumenter)

Pilihan Anda? (default: 1)
```

### 2. Load Art Style Reference

Once style is confirmed:

**If Science SARU:** Load `references/artstyle-sciencesaru.md`
**If Crewdson:** Load `references/artstyle-crewdson-hyperrealism.md`
**If iPhone:** Load `references/artstyle-iphone-social-media.md`
**If Corporate Memphis:** Load `references/artstyle-corporate-memphis.md`
**If Photography:** No reference needed, use technical specs

### 3. Extract Style Vocabulary

From loaded reference, extract:

```
STYLE: {name}
==============

Key Vocabulary:
- Character: {descriptors}
- Environment: {descriptors}
- Lighting: {descriptors}
- Texture: {descriptors}
- Color: {descriptors}

Prompt Pattern:
"{style foundation}, {character specs}, {environment specs}, {atmosphere specs}, {technical specs}"
```

---

## FRAME PREPARATION

For each key frame, prepare:

```
FRAME 1a PREPARATION:
====================
Chunk: 1a
Description: Frozen beach wide establishing shot
Art Style: {selected}
Aspect Ratio: 16:9 (widescreen landscape)

From Screenplay:
- Location: Frozen beach
- Time: Dawn
- Mood: Desolate, lonely
- Key Visuals: [list from screenplay]

From Style Guide:
- Color Palette: Muted blues and grays
- Lighting: Pale winter dawn

Notes for Prompt:
- {specific notes}
```

---

## LOAD NEXT STEP

Execute: `Load step-02-generate-prompts.md`

---

**Proceed to Step 02 when style is confirmed and frames are prepared.**
