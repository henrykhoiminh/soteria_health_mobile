# Character Design Guide for Soteria Health Companions

## Overview

This document outlines the design direction for the 4 companion characters in Soteria Health:
- **Soteria** - The main guide/narrator (Greek goddess of safety/preservation)
- **Mind** - Mental wellness companion (Blue #3B82F6)
- **Body** - Physical wellness companion (Red #EF4444)
- **Soul** - Spiritual/emotional wellness companion (Amber #F59E0B)

---

## 1. Visual Style Options

### Option A: Elemental Spirits/Wisps
- **Concept:** Abstract, ethereal beings made of light and energy
- **Why it works:** Aligns with existing "glow states," fits mystical narrative, scales well at small sizes
- **Visual elements:** Flowing particles, soft glow effects, gentle animation loops

### Option B: Minimalist Creatures/Familiars
- **Concept:** Simple, iconic animals/creatures
- **Examples:**
  - Soteria: Owl (wisdom, protection)
  - Mind: Butterfly or bird (lightness, mental flight)
  - Body: Bear or tiger (strength, physicality)
  - Soul: Phoenix or firefly (inner light, transformation)

### Option C: Abstract Geometric Characters
- **Concept:** Geometric shapes with personality through animation
- **Visual elements:**
  - Soteria: Complex mandala/sacred geometry pattern
  - Mind: Triangle/pyramid (focus, clarity)
  - Body: Circle/sphere (wholeness, strength)
  - Soul: Hexagon/flame shape (transformation, energy)

### Option D: Hybrid Approach (RECOMMENDED)
**Combine elemental wisps with subtle character features**
- Base: Glowing orbs (fits existing glow states)
- Add unique inner cores for personality:
  - **Soteria:** Central eye/consciousness within the glow (all-seeing guide)
  - **Mind:** Floating geometric fragments that orbit (active thought)
  - **Body:** Pulsing heartbeat center with radiating waves (life force)
  - **Soul:** Flickering flame core that dances (spirit/emotion)

---

## 2. Character Personality Traits

### Soteria - The Guide
| Aspect | Description |
|--------|-------------|
| Archetype | Wise mentor, protective but not controlling |
| Personality | Calm, knowing, slightly mysterious, encouraging |
| Voice/Tone | "I see you're struggling. Let's find a way forward together." |
| Animation | Steady, grounded movements; gentle pulses when "speaking" |

**State Variations:**
- Idle: Slow, peaceful rotation
- Active: Brightens and focuses attention on user
- Protective: Expands slightly, creates shield-like aura

### Mind - The Thinker
| Aspect | Description |
|--------|-------------|
| Archetype | Curious scholar, clarity bringer |
| Personality | Inquisitive, focused, helps cut through mental fog |
| Voice/Tone | "Let's bring some clarity to this." |
| Animation | Quick, precise movements; sharp transitions |

**State Variations:**
- Sleepy: Fragments scattered, unfocused
- Awakening: Fragments begin to orbit
- Glowing: Fragments form clear patterns, synchronized movement
- Radiant: Complex geometric dances, laser-sharp focus

### Body - The Warrior
| Aspect | Description |
|--------|-------------|
| Archetype | Steadfast protector, strength coach |
| Personality | Strong but gentle, celebrates physical wins, patient with recovery |
| Voice/Tone | "Your body is capable of amazing things. Let's prove it." |
| Animation | Grounded, rhythmic (like breathing/heartbeat), powerful |

**State Variations:**
- Sleepy: Faint pulse, slow breathing
- Awakening: Pulse strengthens
- Glowing: Strong, steady heartbeat rhythm
- Radiant: Powerful waves radiating outward

### Soul - The Healer
| Aspect | Description |
|--------|-------------|
| Archetype | Emotional warmth, inner peace guide |
| Personality | Compassionate, nurturing, helps process feelings |
| Voice/Tone | "It's okay to feel this way. Let's honor what you're experiencing." |
| Animation | Flowing, organic, unpredictable (like emotions) |

**State Variations:**
- Sleepy: Ember, barely glowing
- Awakening: Small flame catches
- Glowing: Warm fire, dancing gently
- Radiant: Bonfire of positive energy

---

## 3. State-Based Visual Progression

Since companions reflect routine completion status, the visual progression should feel rewarding:

| State | Glow Opacity | Particle Count | Animation Speed | Message |
|-------|-------------|----------------|-----------------|---------|
| Dormant | 0% | 0 | Static | "I'm here, but I need your help to awaken" |
| Sleepy | 20% | 3-5 | 0.5x | Starting to stir |
| Awakening | 40% | 8-10 | 0.75x | "You're bringing me to life!" |
| Glowing | 70% | 12-15 | 1x | "I'm fully present with you now" |
| Radiant | 100% | 18-20 | 1.25x | "We're thriving together!" |

### Special State: Harmony
When all three companions reach Radiant simultaneously:
- Trigger synchronized animation where all three pulse together
- Particles flow between them
- Shared golden glow overlay

---

## 4. Rive Implementation Considerations

### State Machine Structure
```
State Machine: CompanionState
Inputs:
  - lightLevel (Number: 0-4)
  - isInteracting (Boolean)
  - userTapped (Trigger)

States:
  - Dormant (lightLevel 0)
  - Sleepy (lightLevel 1)
  - Awakening (lightLevel 2)
  - Glowing (lightLevel 3)
  - Radiant (lightLevel 4)
  - Celebrating (triggered by interaction)
```

### Animation Complexity Budget (Mobile Performance)
- Idle states: Simple 2-3 second loops
- Particles: Max 15-20 particles per character
- Glow effects: Use Rive's built-in blur/glow (performant)
- Bones: Keep rig under 10 bones per character

### Layering Strategy
```
Character hierarchy:
└─ Background Glow (blur effect, scales with state)
   └─ Particle System (emits from center)
      └─ Core Character
         └─ Inner Details (geometric patterns, eye, etc.)
         └─ Secondary Animation Layer (orbiting elements)
```

### Interactive Feedback (Tap Response)
1. Character scales up 110% (200ms, ease-out)
2. Glow pulses outward (400ms)
3. Particles burst briefly
4. Returns to idle (300ms)

---

## 5. Inspiration Sources

### Visual Design References
- **Journey (game)** - Cloth physics, flowing scarves, ethereal presence
- **Gris (game)** - Watercolor aesthetics, emotional color palettes
- **Sky: Children of the Light** - Spirit/wisp characters, gentle glow effects
- **Monument Valley** - Sacred geometry, minimalist elegance
- **Headspace app** - Simple character animations with personality

### Animation Style References
- **Ori and the Blind Forest** - Spirit/wisp movement, glow effects
- **Duolingo Duo** - Simple character with clear emotional states
- **Tamagotchi** - State-based evolution, user connection through care

### Color/Mood References
- **Breath of the Wild shrines** - Mystical glow, ancient wisdom
- **Studio Ghibli forest spirits** - Magical yet grounded
- **Aurora borealis** - Natural, flowing light phenomena

### Rive Community Search Terms
- "Glow effect character"
- "State machine avatar"
- "Particle systems"
- "Morph animations"

---

## 6. Practical Next Steps

### Phase 1: Concept Exploration (Week 1)
1. Sketch on paper - Draw 3-5 rough variations of each character
2. Pick your style direction - Choose between Options A-D
3. Create a mood board - Collect 10-15 reference images per character
4. Define the "essence" - Write one sentence per character: "This character IS _____"

### Phase 2: Static Design (Week 2)
1. Design in Illustrator/Figma - Create 5 states for ONE character (start with Mind)
2. Test at scale - Ensure it reads clearly at 80x80px (mobile size)
3. Color validation - Check contrast with dark background (#121212)
4. Get feedback - Show to 3-5 people: "What feeling does this give you?"

### Phase 3: Rive Prototype (Week 3)
1. Import static assets to Rive
2. Set up simple state machine - Just 2 states first (Dormant ↔ Glowing)
3. Animate the transition - Make this ONE transition feel perfect
4. Test in app - Integrate with React Native
5. Iterate based on real device testing

### Phase 4: Full Implementation (Week 4+)
1. Expand to all 5 states
2. Add tap interactions
3. Create remaining 3 characters using established patterns
4. Implement Soteria (most complex)
5. Add harmony synchronization effect

---

## 7. Evolution Path

Start simple and iterate:

1. **v1 (Current):** Colored circles with icons
2. **v2 (Quick Win):** Colored circles with Rive-animated glow/pulse
3. **v3 (Add Personality):** Inner core with unique shape per character
4. **v4 (Full Character):** Complete character design with all states

---

## Tools

- **Sketching:** Paper + pencil (start analog)
- **Vector design:** Figma (free) or Illustrator
- **Animation:** Rive
- **Reference management:** Pinterest board or Notion page
- **Testing:** Expo Go on actual device

---

*Last updated: 2026-02-07*
