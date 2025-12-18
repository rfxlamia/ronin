#!/usr/bin/env python3
"""
Imagine Workflow - Output Template Generator

Generates a structured output template by reading VALIDATED screenplay from 04-validator.
Detects elements that need consistency tracking (characters, locations, props).

CRITICAL: This script reads from 04-validator, NOT 03-screenwriter.
Production-validator provides 8-second chunks and key frame markers.

Usage:
    python generate-template.py <project_path>

Example:
    python generate-template.py /path/to/project/claudia-2025-12-14
"""

import sys
import os
import yaml
import re
from datetime import datetime, timezone
from pathlib import Path

def load_pipeline_state(project_path: str) -> dict:
    """Load pipeline state from project."""
    state_file = Path(project_path) / "pipeline-state.yaml"
    if not state_file.exists():
        print(f"ERROR: Pipeline state not found: {state_file}")
        sys.exit(1)

    with open(state_file, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def find_validated_file(project_path: str, pipeline_state: dict) -> Path:
    """Find the validated screenplay file from production-validator stage.

    CRITICAL: Must read from 04-validator, NOT 03-screenwriter.
    Production-validator provides 8-second chunks and key frame markers.
    """
    validator_output = pipeline_state.get('stages', {}).get('04-validator', {})
    outputs = validator_output.get('outputs', [])

    validator_dir = Path(project_path) / "04-validator"

    # Priority 1: From pipeline state outputs
    if outputs:
        for output in outputs:
            validated_file = validator_dir / output
            if validated_file.exists():
                return validated_file

    # Priority 2: Find validated-screenplay-*.md pattern
    if validator_dir.exists():
        validated_files = list(validator_dir.glob("validated-screenplay-*.md"))
        if validated_files:
            return sorted(validated_files)[-1]  # Most recent

        # Priority 3: Any validated-*.md pattern
        validated_files = list(validator_dir.glob("validated-*.md"))
        if validated_files:
            return sorted(validated_files)[-1]

    # ERROR: No validator output found
    print("ERROR: Validated screenplay not found in 04-validator/")
    print("  Imagine workflow REQUIRES production-validator output.")
    print("  Please run the production-validator workflow first.")
    print(f"  Expected path: {validator_dir}/validated-*.md")
    sys.exit(1)

def extract_characters(screenplay_content: str) -> list:
    """Extract character names from screenplay using screenwriter's actual patterns."""
    characters = []

    # Pattern 1 (PRIORITY): <characters> XML tags from screenwriter
    # Example: <characters>Pelaut, Pendatang</characters>
    char_tag_pattern = r'<characters>([^<]+)</characters>'
    matches = re.findall(char_tag_pattern, screenplay_content, re.IGNORECASE)
    for match in matches:
        # Split by comma, clean each name
        names = [n.strip() for n in match.split(',')]
        for name in names:
            # Remove parentheticals like "(off-screen)", "(interface)"
            clean_name = re.sub(r'\s*\([^)]+\)', '', name).strip()
            if clean_name and len(clean_name) > 2:
                characters.append(clean_name)

    # Pattern 2 (BACKUP): Character metadata section
    # Example: "### PELAUT (The Sailor)" from metadata block
    metadata_pattern = r'###\s+([A-Z][A-Z\s]+)\s*\('
    matches = re.findall(metadata_pattern, screenplay_content)
    for match in matches:
        name = match.strip()
        if len(name) > 2 and name not in ['INT', 'EXT', 'SCENE', 'CUT', 'FADE']:
            characters.append(name)

    # Pattern 3 (BACKUP): Dialogue format "PELAUT:"
    # Only use if no <characters> tags found
    if not characters:
        dialogue_pattern = r'^([A-Z][A-Z\s]+):'
        for line in screenplay_content.split('\n'):
            match = re.match(dialogue_pattern, line.strip())
            if match:
                name = match.group(1).strip()
                if len(name) > 2 and name not in ['INT', 'EXT', 'SCENE', 'CUT', 'FADE', 'NOTE', 'VOICEOVER']:
                    characters.append(name)

    # Deduplicate and clean
    unique_chars = []
    seen = set()
    for char in characters:
        char_clean = char.strip().title()
        if char_clean and char_clean.lower() not in seen:
            seen.add(char_clean.lower())
            unique_chars.append(char_clean)

    return unique_chars[:5]  # Max 5 characters

def extract_locations(screenplay_content: str) -> list:
    """Extract locations from screenplay using screenwriter's actual patterns."""
    locations = []

    # Pattern 1 (PRIORITY): <location> XML tags from screenwriter
    # Example: <location>Dermaga tua (old wooden dock)</location>
    loc_tag_pattern = r'<location>([^<]+)</location>'
    matches = re.findall(loc_tag_pattern, screenplay_content, re.IGNORECASE)
    for match in matches:
        # Remove parentheticals for cleaner names
        clean_loc = re.sub(r'\s*\([^)]+\)', '', match).strip()
        if clean_loc and len(clean_loc) > 2:
            locations.append(clean_loc)

    # Pattern 2 (BACKUP): Sluglines "INT. AESTHETIC DESK WORKSPACE - DAY"
    # Extract location between INT./EXT. and time/dash
    slugline_pattern = r'<slugline>(?:INT\.|EXT\.)\s*([^-\n]+?)(?:\s*-|\s*\()'
    matches = re.findall(slugline_pattern, screenplay_content, re.IGNORECASE)
    locations.extend([m.strip() for m in matches])

    # Pattern 3 (BACKUP): If no XML tags, use plain sluglines
    if not locations:
        plain_slugline = r'(?:INT\.|EXT\.)\s*([^-\n]+)'
        matches = re.findall(plain_slugline, screenplay_content, re.IGNORECASE)
        locations.extend([m.strip() for m in matches])

    # Deduplicate and clean
    unique_locs = []
    seen = set()
    for loc in locations:
        loc_clean = loc.strip().title()
        if loc_clean and loc_clean.lower() not in seen and len(loc_clean) > 2:
            seen.add(loc_clean.lower())
            unique_locs.append(loc_clean)

    return unique_locs[:6]  # Max 6 locations

def extract_props(screenplay_content: str) -> list:
    """Extract significant props from screenplay."""
    props = []

    # Common prop patterns
    prop_keywords = [
        'tali', 'rope', 'cangkir', 'cup', 'rokok', 'cigarette', 'asbak', 'ashtray',
        'jaket', 'jacket', 'baju', 'shirt', 'jam', 'watch', 'cincin', 'ring',
        'foto', 'photo', 'surat', 'letter', 'kompas', 'compass', 'jaring', 'net'
    ]

    content_lower = screenplay_content.lower()
    for keyword in prop_keywords:
        if keyword in content_lower:
            props.append(keyword.title())

    # Pattern: Props in brackets [memegang tali]
    bracket_pattern = r'\[([^\]]+)\]'
    matches = re.findall(bracket_pattern, screenplay_content)
    for match in matches:
        words = match.split()
        for word in words:
            if len(word) > 3 and word.lower() not in ['yang', 'dan', 'atau', 'dengan']:
                props.append(word.title())

    # Deduplicate
    unique_props = list(set(props))
    return unique_props[:8]  # Max 8 props

def count_scenes(screenplay_content: str) -> int:
    """Count number of scenes in screenplay."""
    # Pattern: Scene headers
    scene_patterns = [
        r'(?:INT\.|EXT\.)',  # Sluglines
        r'<adegan[^>]*>',     # XML scenes
        r'###\s*Scene\s*\d+', # Markdown scenes
        r'SCENE\s+\d+',       # SCENE N format
    ]

    max_count = 0
    for pattern in scene_patterns:
        matches = re.findall(pattern, screenplay_content, re.IGNORECASE)
        max_count = max(max_count, len(matches))

    return max_count if max_count > 0 else 10  # Default 10

def generate_template(
    project_path: str,
    project_name: str,
    characters: list,
    locations: list,
    props: list,
    scene_count: int
) -> str:
    """Generate the output template markdown."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")

    template = f"""# Imagine Output Template: {project_name}

**Generated:** {timestamp}
**Status:** TEMPLATE - Awaiting Claude completion

---

## CONSISTENCY ELEMENTS DETECTED

### Characters Found ({len(characters)})
{chr(10).join([f'- [ ] {char} - NEEDS DESCRIPTION' for char in characters]) if characters else '- No characters detected - add manually if needed'}

### Locations Found ({len(locations)})
{chr(10).join([f'- [ ] {loc} - NEEDS REFERENCE PROMPTS' for loc in locations]) if locations else '- No locations detected - add manually if needed'}

### Props Detected ({len(props)})
{chr(10).join([f'- [ ] {prop} - TRACK IF SIGNIFICANT' for prop in props]) if props else '- No significant props detected'}

---

## WORKFLOW QUESTIONS FOR USER

### Q1: Character Consistency
```
Ditemukan {len(characters)} karakter: {', '.join(characters) if characters else 'None'}

Untuk setiap karakter, Claude perlu tahu:
- Usia dan penampilan fisik
- Etnis/ras (untuk deskripsi kulit, fitur wajah)
- Pakaian khas
- Fitur unik (bekas luka, tato, dll)

Apakah Anda ingin memberikan detail karakter sekarang?
[Y] Ya, saya akan jelaskan / [N] Biarkan Claude menentukan dari konteks
```

### Q2: Dual Keyframe Mode
```
Screenplay memiliki {scene_count} scene.

DUAL KEYFRAME MODE menghasilkan 2 prompt per scene:
- First Frame: Komposisi awal
- Last Frame: Komposisi akhir
- Veo 3 akan interpolasi di antara keduanya

Mode ini DIREKOMENDASIKAN untuk:
- Scene dengan pergerakan karakter
- Scene dengan perubahan emosi
- Scene dengan camera movement

Gunakan Dual Keyframe Mode?
[Y] Ya (direkomendasikan) / [N] Tidak, single keyframe saja
```

### Q3: Art Style Selection
```
PENTING: Art styles TIDAK di-hardcode.

Claude harus menjalankan perintah berikut untuk mendapatkan daftar art style:

    ls {installed_path}/references/artstyle-*.md

Kemudian tampilkan sebagai opsi bernomor:
- Parse filename: artstyle-{name}.md → extract {name}
- Convert to readable: sciencesaru → "Science SARU"
- Baca baris pertama file untuk deskripsi singkat

Contoh output yang diharapkan:
1. [nama style dari file] - [deskripsi dari baris pertama]
2. [nama style dari file] - [deskripsi dari baris pertama]
...

Pilihan: ___
```

---

## CHARACTER REFERENCE SECTION
<!-- Claude: Fill after user provides character details -->

### Character: {characters[0] if characters else '[CHARACTER_1]'}
**Status:** [ ] Reference prompts generated

**Physical Description:**
- Age: [TO BE FILLED]
- Ethnicity: [TO BE FILLED]
- Skin tone: [TO BE FILLED]
- Face: [TO BE FILLED]
- Hair: [TO BE FILLED]
- Build: [TO BE FILLED]

**Wardrobe:**
- Phase 1: [TO BE FILLED]
- Phase 2: [TO BE FILLED]
- Phase 3: [TO BE FILLED]
- Phase 4: [TO BE FILLED]

**Reference Prompts:**
1. [ ] Portrait Front
2. [ ] Portrait 3/4
3. [ ] Portrait Profile
4. [ ] Full Body
5. [ ] Hands Detail
6. [ ] Lighting Variant

---
{f'''
### Character: {characters[1] if len(characters) > 1 else '[CHARACTER_2]'}
**Status:** [ ] Reference prompts generated

**Physical Description:**
- Age: [TO BE FILLED]
- Ethnicity: [TO BE FILLED]
- Skin tone: [TO BE FILLED]
- Face: [TO BE FILLED]
- Hair: [TO BE FILLED]
- Build: [TO BE FILLED]

**Wardrobe:**
- Phase 1: [TO BE FILLED]
- Phase 2: [TO BE FILLED]
- Phase 3: [TO BE FILLED]
- Phase 4: [TO BE FILLED]

**Reference Prompts:**
1. [ ] Portrait Front
2. [ ] Portrait 3/4
3. [ ] Portrait Profile
4. [ ] Full Body
5. [ ] Hands Detail
6. [ ] Lighting Variant

---
''' if len(characters) > 1 else ''}

## LOCATION REFERENCE SECTION
<!-- Claude: Generate location prompts based on screenplay context -->

{chr(10).join([f'''### Location: {loc}
**Status:** [ ] Reference prompts generated

**Prompts:**
1. [ ] Establishing Wide
2. [ ] Surface Detail
3. [ ] Time Variant (if needed)

---
''' for loc in locations[:4]]) if locations else '### No locations detected - add as needed'}

## SCENE KEYFRAMES SECTION
<!-- Claude: Generate for each scene based on dual/single keyframe mode -->

**Mode:** [ ] Single Keyframe / [ ] Dual Keyframe
**Total Scenes:** {scene_count}

### Scene 1: [TITLE]
**Chunk ID:** 1a

**FIRST KEYFRAME:**
- [ ] Prompt generated
- Purpose: Opening composition
- Aspect Ratio: 16:9

**LAST KEYFRAME:** (if dual mode)
- [ ] Prompt generated
- Purpose: Closing composition
- Transition Intent: [DESCRIBE MOTION]

---

### Scene 2: [TITLE]
**Chunk ID:** 2a

**FIRST KEYFRAME:**
- [ ] Prompt generated

**LAST KEYFRAME:** (if dual mode)
- [ ] Prompt generated

---

<!-- Continue for all {scene_count} scenes -->

## PROPS TRACKING SECTION (Optional)
<!-- Claude: Track if props are significant to story -->

{chr(10).join([f'''### Prop: {prop}
- Symbolic meaning: [TO BE FILLED]
- Scenes appearing: [TO BE FILLED]
- Progression: Phase 1 → Phase 2 → Phase 3 → Phase 4

---
''' for prop in props[:4]]) if props else '### No significant props to track'}

## COMPLETION CHECKLIST

### Before Starting:
- [ ] User answered Q1 (character details)
- [ ] User answered Q2 (dual keyframe mode)
- [ ] User answered Q3 (art style)

### Generation Progress:
- [ ] Character reference prompts ({len(characters)} characters × 6 prompts)
- [ ] Location reference prompts ({len(locations)} locations × 3 prompts)
- [ ] Scene keyframes ({scene_count} scenes × 1-2 prompts each)
- [ ] Props tracking (if applicable)

### Final Output:
- [ ] All prompts under 480 tokens
- [ ] Art style vocabulary consistent
- [ ] Character descriptions identical across prompts
- [ ] Dual keyframes have transition intent
- [ ] Pipeline state updated

---

## NEXT STEPS FOR CLAUDE

1. Present Q1, Q2, Q3 to user
2. Fill character details based on user input
3. Load appropriate art style reference
4. Generate prompts following template structure
5. Output final file: `imagine-prompts-{timestamp}.md`

---

*Template generated by imagine/scripts/generate-template.py*
*Ready for Claude completion*
"""

    return template

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-template.py <project_path>")
        print("Example: python generate-template.py ./docs/projects/claudia-2025-12-14")
        sys.exit(1)

    project_path = sys.argv[1]

    if not os.path.isdir(project_path):
        print(f"ERROR: Project path not found: {project_path}")
        sys.exit(1)

    project_name = os.path.basename(project_path)
    print(f"📋 Generating Imagine template for: {project_name}")

    # Load pipeline state
    pipeline_state = load_pipeline_state(project_path)
    print("✓ Pipeline state loaded")

    # Find and read validated screenplay from 04-validator
    validated_file = find_validated_file(project_path, pipeline_state)
    print(f"✓ Found validated screenplay: {validated_file.name}")

    with open(validated_file, 'r', encoding='utf-8') as f:
        screenplay_content = f.read()

    # Extract elements
    characters = extract_characters(screenplay_content)
    print(f"✓ Characters detected: {characters}")

    locations = extract_locations(screenplay_content)
    print(f"✓ Locations detected: {locations}")

    props = extract_props(screenplay_content)
    print(f"✓ Props detected: {props}")

    scene_count = count_scenes(screenplay_content)
    print(f"✓ Scene count: {scene_count}")

    # Generate template
    template = generate_template(
        project_path=project_path,
        project_name=project_name,
        characters=characters,
        locations=locations,
        props=props,
        scene_count=scene_count
    )

    # Write output
    output_dir = Path(project_path) / "05-imagine"
    output_dir.mkdir(exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    output_file = output_dir / f"imagine-template-{timestamp}.md"

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f"\n✅ Template generated: {output_file}")
    print(f"\n📌 Next: Claude should read this template and present questions to user")

    return str(output_file)

if __name__ == "__main__":
    main()
