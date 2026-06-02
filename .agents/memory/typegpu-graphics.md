---
name: TypeGPU graphics skill
description: Reminder that the typegpu-graphics skill exists and when to load it for Castle Royale work.
---

## Rule
When the user asks for any animation, shader, particle system, or visual effect in the mobile app, load `.local/skills/typegpu-graphics/SKILL.md` before planning or implementing.

**Why:** The user explicitly provided this skill and expects it to be used for all graphics/animation work. Missing it means defaulting to lower-performance JS-thread approaches when GPU-first solutions are available.

**How to apply:** Any time the words "animation", "effect", "shader", "particles", "glow", "wave", "morphing", "holographic", "fire", or "visual" appear in a request for the mobile app — load the skill first.

## Castle Royale candidates already identified
- Fire burst on card burns
- Parallax scene backgrounds
- Card reveal shaders
- Holographic card skins
- Arena-specific particle effects
- Victory screen confetti / dust particles
