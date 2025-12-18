# Keyframe Pair System

Framework for generating first-frame and last-frame pairs for Veo 3 interpolation.

---

## DUAL KEYFRAME CONCEPT

Veo 3 supports **Start Image + End Image** video generation:
- **First Frame:** Opening composition (generated via Imagen)
- **Last Frame:** Closing composition (generated via Imagen)
- **Interpolation:** Veo generates 8s video transitioning between both

**Result:** Maximum control over video composition by defining both endpoints.

---

## WHEN TO USE DUAL KEYFRAMES

| Scene Type | Keyframe Strategy | Rationale |
|------------|-------------------|-----------|
| Static dialogue | Single keyframe | Minimal movement needed |
| Character movement | Dual keyframes | Track position change |
| Emotional transformation | Dual keyframes | Capture before/after state |
| Time passage | Dual keyframes | Show beginning and end |
| Camera movement | Dual keyframes | Define start and end framing |
| Action sequence | Dual keyframes | Book-end the action |

**Default recommendation:** Offer dual keyframes for all non-static scenes.

---

## KEYFRAME PAIR STRUCTURE

### First Frame (Opening)
```yaml
purpose: "Establish starting composition"
focus:
  - Character initial position
  - Environment initial state
  - Emotional starting point
  - Camera starting position
timing: "Frame 0 of video"
```

### Last Frame (Closing)
```yaml
purpose: "Define ending composition"
focus:
  - Character final position
  - Environment final state
  - Emotional end point
  - Camera end position
timing: "Frame at 8 seconds"
```

---

## COMPOSITION GUIDELINES

### Character Movement Scenes

**First Frame:**
- Character at starting position
- Initial posture/gesture
- Pre-action state

**Last Frame:**
- Character at ending position
- Completed posture/gesture
- Post-action state

**Example: "Character walks to window"**
```
First: Character standing at table, looking down
Last: Character at window, silhouette against light
```

### Emotional Transformation Scenes

**First Frame:**
- Facial expression showing initial emotion
- Body language supporting initial state
- Environmental elements neutral

**Last Frame:**
- Facial expression showing final emotion
- Body language supporting transformation
- Environmental elements may shift

**Example: "Character realizes loss"**
```
First: Hopeful expression, upright posture
Last: Grief visible, shoulders collapsed
```

### Camera Movement Scenes

**First Frame:**
- Wide/establishing shot
- Full context visible
- Subject in initial position within frame

**Last Frame:**
- Close-up/intimate shot
- Focus narrowed to subject
- Subject fills more of frame

**Example: "Dolly in to character's face"**
```
First: Medium wide shot, character in environment
Last: ECU on eyes, environment blurred
```

---

## PROMPT TEMPLATE FOR PAIRS

### First Frame Prompt

```
FIRST KEYFRAME: Scene {N}a - {description}
==========================================
Art Style: {selected}
Aspect Ratio: {ratio}
Purpose: Opening composition - {specific purpose}

PROMPT:
"{Full prompt describing starting state}"

Composition Notes:
- Subject position: {where in frame}
- Camera: {framing and angle}
- Key element for transition: {what will change}
```

### Last Frame Prompt

```
LAST KEYFRAME: Scene {N}b - {description}
==========================================
Art Style: {selected}
Aspect Ratio: {ratio}
Purpose: Closing composition - {specific purpose}

PROMPT:
"{Full prompt describing ending state}"

Composition Notes:
- Subject position: {where in frame}
- Camera: {framing and angle}
- Transition completed: {what changed}
```

---

## CONTINUITY RULES

### Visual Consistency Between Pairs

1. **Same lighting setup** (or deliberate time passage)
2. **Same art style** vocabulary
3. **Same character appearance** (unless transformation is the point)
4. **Same aspect ratio** for both frames
5. **Logical spatial relationship** between positions

### Transition Intent Specification

Include notes for arch-v workflow on intended motion:

```yaml
transition_intent:
  movement_type: "{walk/turn/reach/collapse}"
  speed: "{slow/medium/fast}"
  emotional_arc: "{calm→tense/sad→peaceful}"
  camera_motion: "{static/dolly/pan/tilt}"
```

---

## INTEGRATION WITH ARCH-V

Dual keyframes feed into arch-v workflow as:

```yaml
scene_package:
  scene_id: "{N}"
  first_frame:
    imagen_prompt: "{full prompt}"
    aspect_ratio: "{ratio}"
  last_frame:
    imagen_prompt: "{full prompt}"
    aspect_ratio: "{ratio}"
  transition_intent:
    motion_type: "{type}"
    veo_prompt_guidance: "{what motion to generate}"
```

Arch-v then generates Veo 3 prompts that:
1. Reference first frame as start image
2. Reference last frame as end image
3. Describe motion/transition between them

---

## QUALITY CHECKLIST

For each keyframe pair:

- [ ] Both frames share same art style
- [ ] Logical spatial relationship between positions
- [ ] Lighting consistent (or time change explicit)
- [ ] Character appearance identical (unless transform scene)
- [ ] Transition intent clearly specified
- [ ] Both prompts under 480 tokens

---

*Load this reference when generating dual keyframe prompts in step-02.*
