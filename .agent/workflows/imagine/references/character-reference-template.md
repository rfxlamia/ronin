# Character Reference Template

Framework for generating consistent character references across all scenes.

---

## CHARACTER REFERENCE SYSTEM

For each main character, generate a complete reference set ensuring visual consistency.

### Reference Shot Types

| Shot Type | Purpose | Count |
|-----------|---------|-------|
| Portrait Front | Primary face reference | 1 |
| Portrait 3/4 | Angle variation | 1 |
| Portrait Profile | Side view | 1 |
| Full Body | Proportions/posture | 1 |
| Hands Detail | Texture/character | 1 |
| Lighting Variants | Daylight + Tungsten | 2 |

**Minimum per character:** 6 reference prompts

---

## CHARACTER DESCRIPTION FRAMEWORK

### Physical Attributes

```yaml
age_range: "{decade}s"
ethnicity: "{specific ethnic background}"
skin_tone: "{descriptive term, culturally appropriate}"
height: "{cm estimate}"
build: "{body type}"
```

### Face Details

```yaml
face_shape: "{oval/square/heart/etc}"
eyes: "{shape, color, distinctive features}"
nose: "{shape, size}"
jawline: "{strong/soft/angular}"
distinctive_features: "{scars, wrinkles, marks}"
```

### Hair

```yaml
style: "{cut, length, styling}"
color: "{natural color, highlights, graying}"
texture: "{straight/wavy/curly/coily}"
weathering: "{sun-bleached, salt-affected, etc}"
```

### Wardrobe (Per Phase)

```yaml
phase_1:
  clothing: "{specific items}"
  condition: "{new/worn/weathered}"
  colors: "{palette}"
phase_2:
  # progression...
```

---

## ETHNICITY-SPECIFIC GUIDELINES

### Indonesian Malay Example

```
- Skin: Deep tan/sawo matang from sun exposure
- Face: High cheekbones, strong jawline
- Eyes: Squint lines from sea glare, dark brown
- Hair: Black with sun-bleached reddish tips
- Hands: Calloused, rope-burned, weathered
```

### Sundanese-Chinese Example

```
- Skin: Fair/kuning langsat
- Face: Soft features, few sharp angles
- Eyes: Medium (not too round, not too narrow)
- Hair: Low taper fade middle part, black
- Build: Smaller frame, delicate hands
```

---

## PROGRESSIVE TRANSFORMATION

### Phase System (4 Phases)

| Phase | Name | Physical State | Wardrobe |
|-------|------|---------------|----------|
| 1 | Arrival | Clean, healthy, out of place | Own clothes |
| 2 | Integration | Minor changes, adapting | Borrowed items |
| 3 | Decline | Visible deterioration | Mixed clothing |
| 4 | Final | Maximum change state | Symbolic items |

### Transformation Tracking

For characters that change, generate prompts for each phase:
- Phase 1: 4 prompts (before transformation)
- Phase 2: 4 prompts (early change)
- Phase 3: 3 prompts (advanced change)
- Phase 4: 3 prompts (final state)

**Total for transforming character:** 14 prompts

---

## HEIGHT/PHYSICAL RELATIONSHIP

When multiple characters appear together:

```yaml
character_a:
  height: 175cm
  reference: "taller figure"

character_b:
  height: 162cm
  reference: "reaches character_a's ear level"

two_shot_guidance:
  - "B's head reaches A's ear in standing shots"
  - "Sitting equalizes height difference"
  - "Camera angle can emphasize or minimize difference"
```

---

## PROMPT TEMPLATE

### Character Reference Prompt

```
[Art Style], [character name/role]. [Age] [ethnicity description].
[Skin tone and texture], [face details with distinctive features].
[Eye description with expression tendency], [hair style and color with weathering].
[Clothing description for current phase], [condition and wear patterns].
[Posture and body language], [hands description if visible].
[Lighting: daylight/tungsten], [camera: portrait lens 85mm],
[background: neutral/contextual], [quality modifiers].
```

### Example: PELAUT Reference

```
Cinematic 35mm analog film, Kodak Vision3 250D. Indonesian fisherman
in his late 40s, ethnic Malay. Deep tan sawo matang skin weathered by
decades of sun and salt, high cheekbones with strong angular jawline.
Dark brown eyes with permanent squint lines from sea glare, crow's feet
expressing years of hard labor and quiet wisdom. Black hair with
sun-bleached reddish tips, unkempt from sea wind. Wearing faded blue
work shirt with salt stains, sleeves rolled to reveal rope-scarred
forearms. Standing posture with weight on one leg, shoulders carrying
invisible burden. Shot on 85mm lens, soft natural daylight, neutral
gray background, high detail on skin texture, organic film grain.
```

---

## CONSISTENCY RULES

1. **Same descriptors across all prompts** for physical features
2. **Same color palette** for skin/hair/eyes
3. **Same art style vocabulary** throughout
4. **Phase-appropriate wardrobe** changes only
5. **Consistent weathering/aging** details

---

*Load this reference when generating character consistency prompts in step-02.*
