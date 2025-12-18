# Location Consistency Guide

Framework for maintaining visual consistency across location references.

---

## PURPOSE

Locations are characters too. Consistent location references ensure:
- Spatial continuity across scenes
- Time-of-day variations are intentional
- Environmental storytelling is coherent
- Production efficiency (reusable location assets)

---

## LOCATION REFERENCE STRUCTURE

For each major location, generate 3-4 reference prompts:

| Reference Type | Purpose | Time/Condition |
|---------------|---------|----------------|
| Establishing Wide | Full location context | Primary lighting |
| Surface Detail | Texture and materials | Neutral |
| Atmosphere Variant | Mood variation | Secondary lighting |
| Emotional State | Story-specific | Scene-specific |

---

## LOCATION TEMPLATE

### Primary Location Card

```yaml
location_id: "{slug}"
location_name: "{Display Name}"
story_role: "{function in narrative}"

physical_attributes:
  type: "{interior/exterior/mixed}"
  scale: "{intimate/medium/vast}"
  materials: "{primary surfaces}"
  colors: "{dominant palette}"
  weathering: "{condition state}"

time_variations:
  dawn: "{specific qualities}"
  day: "{specific qualities}"
  golden_hour: "{specific qualities}"
  night: "{specific qualities}"

emotional_mapping:
  hope: "{visual treatment}"
  intimacy: "{visual treatment}"
  tension: "{visual treatment}"
  grief: "{visual treatment}"

key_elements:
  - "{element 1}"
  - "{element 2}"
  - "{element 3}"
```

---

## EXAMPLE: BOAT LOCATION

### Kapal (Boat) Location Card

```yaml
location_id: "kapal"
location_name: "Fishing Boat"
story_role: "Shared domestic space, site of intimacy and strain"

physical_attributes:
  type: "exterior and interior"
  scale: "intimate"
  materials: "weathered wood, hemp rope, faded paint, salt-corroded metal"
  colors: "blues, grays, rust, warm wood tones"
  weathering: "decades of sea exposure"

time_variations:
  dawn: "cool blue light, mist, silhouettes"
  day: "harsh direct sun, high contrast shadows"
  golden_hour: "warm amber glow, romanticized"
  night: "warm tungsten from cabin, stars above"

emotional_mapping:
  hope: "golden hour, organized deck, calm sea"
  intimacy: "night cabin, warm light, close quarters"
  tension: "overcast, rough seas, cluttered"
  grief: "empty deck, still water, desaturated"

key_elements:
  - "Mast and rigging"
  - "Small cabin with porthole"
  - "Deck workspace with nets and rope"
  - "Worn wooden railings"
```

### Boat Reference Prompts

**1. Establishing Wide:**
```
Cinematic 35mm film, wide shot of traditional Indonesian fishing boat
moored at weathered wooden dock. Boat shows decades of use - faded blue
paint with salt crystallization, patched hull, hemp rope coiled on deck.
Small cabin with warm light inside. Golden hour, calm sea, warm amber
light. Shot on 24mm lens, deep focus, organic film grain.
```

**2. Deck Detail:**
```
Detail shot of fishing boat deck surface. Weathered teak planks with
worn grain pattern, salt deposits in cracks, coiled hemp rope showing
use, scattered fishing tools. Overcast diffused light, muted colors,
texture-focused composition. Macro lens, high detail on wood grain.
```

**3. Night Cabin:**
```
Interior of small fishing boat cabin at night. Warm tungsten lamp light,
cramped space with two bunks, personal items visible. Condensation on
porthole window, worn blankets, hanging clothes. Intimate atmosphere,
soft shadows. 35mm lens, shallow depth of field, Kodak Vision3 500T.
```

---

## TIME-OF-DAY GUIDE

### Dawn
- Cool blue/purple color temperature
- Low contrast, soft shadows
- Mist/fog elements possible
- Pre-action calm

### Day
- Neutral to warm temperature
- High contrast, hard shadows
- Clear visibility
- Active, working scenes

### Golden Hour
- Warm amber/orange temperature
- Long shadows, soft light
- Romanticized quality
- Emotional peak moments

### Night
- Warm practical lights vs cool ambient
- High contrast, pools of light
- Intimate, contained
- Reflective scenes

---

## ENVIRONMENTAL PROGRESSION

Locations can reflect story arc:

| Story Phase | Location State |
|-------------|---------------|
| Opening | Established, neutral |
| Development | Inhabited, warmed |
| Conflict | Cluttered, strained |
| Resolution | Empty, still |

**Example: Cabin progression**
```
Phase 1: Sparse, one person's belongings
Phase 2: Two sets of items, shared space
Phase 3: Neglected, untouched items
Phase 4: Half-empty, ghost presence
```

---

## QUALITY CHECKLIST

For location consistency:

- [ ] Physical materials described consistently
- [ ] Color palette maintained
- [ ] Time-of-day appropriate for scene
- [ ] Weathering level consistent
- [ ] Key elements present
- [ ] Emotional treatment matches story beat

---

*Load this reference when generating location-based prompts.*
