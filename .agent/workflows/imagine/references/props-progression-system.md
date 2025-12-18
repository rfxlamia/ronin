# Props Progression System

Framework for tracking symbolic objects throughout the narrative.

---

## PURPOSE

Props tell parallel stories through their physical state. Track key objects across scenes to:
- Reinforce emotional themes
- Show time passage
- Symbolize relationship states
- Create visual continuity

---

## PROP CATEGORIES

### Shared Objects
Objects used by multiple characters together.

**Examples:**
- Two cups (ritual of togetherness)
- Shared tools (collaborative work)
- Common space items (domestic intimacy)

**Progression Pattern:**
```
Separate → Together → One neglected → One remains
```

### Personal Objects
Objects belonging to one character, observed by another.

**Examples:**
- Wristwatch (identity marker)
- Jacket/clothing (physical presence)
- Personal tools (craft/profession)

**Progression Pattern:**
```
In use → Shared moment → Left behind → Becomes relic
```

### Environmental Objects
Objects in the setting that reflect emotional state.

**Examples:**
- Ashtray (stress accumulation)
- Food (care or neglect)
- Rope (connection/strain)

**Progression Pattern:**
```
Maintained → Active use → Overflowing/fraying → Empty/broken
```

---

## PROGRESSION TEMPLATES

### Rope (Connection Symbol)

| Phase | State | Visual Description |
|-------|-------|-------------------|
| 1 | Tangled | Chaotic pile, knots, disorder |
| 2 | Working | Hands together on rope, purpose |
| 3 | Fraying | Visible fiber separation, strain |
| 4 | Broken | Two severed ends, gap between |

### Cups (Ritual Symbol)

| Phase | State | Visual Description |
|-------|-------|-------------------|
| 1 | Single | One cup alone, isolation |
| 2 | Paired | Two cups, steam merging |
| 3 | Cold | One cup untouched, cold |
| 4 | Remaining | Single cup, mate missing |

### Ashtray (Stress Symbol)

| Phase | State | Visual Description |
|-------|-------|-------------------|
| 1 | Clean | Empty or few butts |
| 2 | Used | Moderate, shared moment |
| 3 | Overflowing | Piling up, neglected |
| 4 | Frozen | Last cigarette, untouched |

### Clothing (Presence Symbol)

| Phase | State | Visual Description |
|-------|-------|-------------------|
| 1 | Own clothes | Character's original wardrobe |
| 2 | Shared/borrowed | Wearing other's items |
| 3 | Mixed | Integration of wardrobes |
| 4 | Single items | Remaining pieces, ghost presence |

---

## PROMPT INTEGRATION

When generating scene prompts, include prop state:

```
...[scene description], with {prop} in {phase_state} visible in {position}...
```

**Example:**
```
...on the boat deck, with fraying hemp rope coiled near the mast,
fibers visibly separating under tension...
```

---

## TRACKING FORMAT

For each key prop, maintain:

```yaml
prop_id: "rope_main"
prop_name: "Hemp Rope"
symbolic_meaning: "Connection between characters"
scenes_appearing: [1, 4, 7, 11]
phase_mapping:
  phase_1: "tangled, chaotic"
  phase_2: "hands working together"
  phase_3: "fraying, stressed"
  phase_4: "broken, separated"
current_phase: 2
last_appearance: "Scene 4 - teaching moment"
```

---

## QUALITY CHECKLIST

For prop consistency:

- [ ] Prop state matches story phase
- [ ] Visual description consistent with established look
- [ ] Progression feels natural (not jarring jumps)
- [ ] Symbolic meaning reinforced
- [ ] Position in frame consistent or deliberately changed

---

*Load this reference when tracking props across scene prompts.*
