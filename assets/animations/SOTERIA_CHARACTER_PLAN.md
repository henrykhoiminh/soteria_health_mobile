# Soteria Character Animation Plan

A complete beginner's guide to creating an anime-inspired interactive character for the Soteria Health app.

---

## Quick Start Checklist

- [ ] Create free Rive account: https://rive.app
- [ ] Complete "Rive for Beginners" tutorial (3 hours)
- [ ] Sketch 3 character concepts on paper
- [ ] Choose favorite design and refine

---

## 1. Character Design Direction

### Recommended Character: The Gentle Guide

**Personality:**
- Age appearance: Young adult (early 20s) - relatable but wise
- Gender: Neutral/androgynous design allows all users to connect
- Encouraging (not drill sergeant)
- Patient (not judgmental)
- Wise but approachable

**Visual Design:**

```
A small, ethereal being with:
- Short, floaty hair that lifts slightly at the edges
- Large, kind eyes that close in gentle arcs when happy
- Simple hooded cloak/robe (echoes "guide" archetype)
- Three small orbs floating around them (Mind/Body/Soul)
- Semi-transparent/glowing quality to emphasize "light" theme
```

**Color Integration:**
- Base character: Soft whites/pastels (neutral)
- Accent shifts based on category:
  - Mind = Blue (#3B82F6)
  - Body = Red (#EF4444)
  - Soul = Amber/Gold (#F59E0B)
- Avatar decay states affect glow intensity

**Design Principles:**
1. **Silhouette Clarity** - Recognizable at 50-100px
2. **Simplified Features** - Large eyes, simple nose/mouth
3. **Flowing Elements** - Hair, cloak for natural movement
4. **Minimal Details** - Works on mobile screens

---

## 2. State Machine Design

### Inputs (Controlled from React Native)

```typescript
TRIGGERS:
  - onboard_start      // User begins onboarding
  - routine_start      // Routine execution begins
  - routine_complete   // Routine finished
  - celebrate          // Major milestone
  - go_dormant         // Avatar decay
  - wake_up            // User returns

BOOLEANS:
  - is_active          // User is in a routine

NUMBERS:
  - energy_level       // 0-100, affects animation intensity
  - category_focus     // 0=Mind, 1=Body, 2=Soul
```

### Complete State List

| # | State | Description | Loop | Duration |
|---|-------|-------------|------|----------|
| 1 | Entry | Fade in, gentle float | No | 1s |
| 2 | Idle_Calm | Slow floating, occasional blink | Yes | 4s |
| 3 | Onboarding_Welcome | Wave gesture, warm smile | No | 2s |
| 4 | Routine_Ready | Energetic idle, ready pose | Yes | 2s |
| 5 | Routine_Active | Cheering, orbs circle faster | Yes | 2s |
| 6 | Routine_Complete_Celebration | Jump, sparkles, orbs spin | No | 3s |
| 7 | Major_Celebration | Full spin, burst of light | No | 4s |
| 8 | Dormant_Sleepy | Yawning, eyes drooping | No | 2s |
| 9 | Dormant_Resting | Curled up, eyes closed | Yes | 3s |
| 10 | Wake_Up | Stretch, rub eyes, smile | No | 2.5s |

### Transition Map

```
Entry → Idle_Calm (auto, 1s)
Idle_Calm → Onboarding_Welcome (trigger: onboard_start)
Idle_Calm → Routine_Ready (trigger: routine_start)
Idle_Calm → Dormant_Sleepy (trigger: go_dormant)
Routine_Ready → Routine_Active (is_active = true)
Routine_Active → Routine_Complete_Celebration (trigger: routine_complete)
Routine_Complete_Celebration → Idle_Calm (on finish)
Dormant_Sleepy → Dormant_Resting (on finish)
Dormant_Resting → Wake_Up (trigger: wake_up)
Wake_Up → Idle_Calm (on finish)
Any → Major_Celebration (trigger: celebrate)
Major_Celebration → Idle_Calm (on finish)
```

---

## 3. Implementation Phases

### Phase 1: Learn Rive Basics (Week 1)

**Day 1-2: Tutorials**
1. Go to https://rive.app/community
2. Complete "Rive for Beginners" course (2 hours)
3. Study examples: "Simple Character Idle", "State Machine Basics"

**Day 3-4: First Simple Character**
1. Draw circle (head) + rounded rectangle (body)
2. Add two circles for eyes
3. Create bones: spine, head, left arm, right arm
4. Animate simple idle (3-second loop)

**Day 5-7: Add State Machine**
1. Create two states: "Idle" and "Happy"
2. Add trigger: "celebrate"
3. Test transition: Idle → Happy → Idle

**Deliverable:** `soteria_character_v1.riv`

---

### Phase 2: Build Core Character (Week 2-3)

**Step 1: Character Design (3-4 days)**

Sketch concept with:
- Front view and side view
- Joint positions marked
- 3 floating orbs design

**Step 2: Create Vector Artwork**

**Key Shapes to Create:**
- Head (single shape with gradient)
- Body/cloak (main mass)
- Arms (left, right - separate)
- Hair (separate layer, will float)
- Eyes (states: open, half-closed, closed, happy)
- Mouth (states: neutral, smile, wide smile)
- 3 Orbs (Mind=blue, Body=red, Soul=amber)

**Step 3: Rigging (3-4 days)**

Bone Structure:
```
Root
├─ Spine_Base
│  ├─ Spine_Mid
│  │  └─ Spine_Top
│  │     └─ Neck
│  │        └─ Head
│  ├─ Shoulder_Left
│  │  └─ Elbow_Left
│  │     └─ Hand_Left
│  └─ Shoulder_Right
│     └─ Elbow_Right
│        └─ Hand_Right
├─ Orb_Mind
├─ Orb_Body
└─ Orb_Soul
```

**Deliverable:** `soteria_character_rigged.riv`

---

### Phase 3: Core States (Week 4)

**Priority Animations:**

1. **Idle_Calm** (2 hours)
   - Duration: 4 seconds (loop)
   - Float up/down 8px
   - Eyes blink at 3s

2. **Routine_Complete_Celebration** (4 hours)
   - Duration: 3 seconds
   - Crouch → Jump → Arms raise → Land
   - Add sparkle particles at peak

3. **Dormant_Resting** (2 hours)
   - Duration: 3 seconds (loop)
   - Sitting/curled up, eyes closed
   - Slow breathing, orbs dimmed

4. **Wake_Up** (3 hours)
   - Duration: 2.5 seconds
   - Eyes open → Stretch → Rub eyes → Smile

5. **Routine_Active** (2 hours)
   - Duration: 2 seconds (loop)
   - Bouncing, arms pumping
   - Orbs circle faster

**Deliverable:** `soteria_character_core.riv`

---

### Phase 4: React Native Integration (Week 5)

**Step 1: Install Dependencies**
```bash
npm install rive-react-native
```

**Step 2: Create Component**

See: `components/SoteriaCharacter.tsx` (template below)

**Step 3: Add to App**
- Dashboard (idle state)
- Routine completion (celebration)
- Onboarding (welcome)

---

### Phase 5: Polish & Expansion (Week 6-8)

**Remaining States:**
- Onboarding_Welcome
- Major_Celebration
- Dormant_Sleepy
- Routine_Ready

**Advanced Features:**
- Category color blending (1D Blend State)
- Energy-based animation speed
- Particle effects (sparkles, glow, sleep Z's)
- Facial expression variations

---

## 4. File Structure

```
/assets/
  animations/
    characters/
      soteria_character_core.riv      # Main character file
      soteria_character_variants.riv   # Alternative designs
    lottie/
      routine_complete.json            # Existing (will replace)
    particles/
      sparkles.riv                     # Reusable effects
    SOTERIA_CHARACTER_PLAN.md          # This file
```

**File Size Targets:**
- Core character (10 states): <200KB
- With particle effects: <300KB
- Total budget: <1MB

---

## 5. Code Templates

### SoteriaCharacter Component

```typescript
// components/SoteriaCharacter.tsx
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { RoutineCategory } from '@/types';

interface SoteriaCharacterProps {
  size?: number;
  category?: RoutineCategory;
  isActive?: boolean;
  style?: ViewStyle;
}

export interface SoteriaCharacterHandle {
  triggerCelebration: () => void;
  triggerMajorCelebration: () => void;
  goDormant: () => void;
  wakeUp: () => void;
  startRoutine: () => void;
  endRoutine: () => void;
}

const SoteriaCharacter = forwardRef<SoteriaCharacterHandle, SoteriaCharacterProps>(
  ({ size = 200, category = 'Mind', isActive = false, style }, ref) => {
    const riveRef = useRef<RiveRef>(null);

    const categoryValue = category === 'Mind' ? 0 : category === 'Body' ? 1 : 2;

    useImperativeHandle(ref, () => ({
      triggerCelebration: () => {
        riveRef.current?.fireState('MainCharacter', 'routine_complete');
      },
      triggerMajorCelebration: () => {
        riveRef.current?.fireState('MainCharacter', 'celebrate');
      },
      goDormant: () => {
        riveRef.current?.fireState('MainCharacter', 'go_dormant');
      },
      wakeUp: () => {
        riveRef.current?.fireState('MainCharacter', 'wake_up');
      },
      startRoutine: () => {
        riveRef.current?.fireState('MainCharacter', 'routine_start');
        riveRef.current?.setInputState('MainCharacter', 'is_active', true);
      },
      endRoutine: () => {
        riveRef.current?.setInputState('MainCharacter', 'is_active', false);
      },
    }));

    useEffect(() => {
      riveRef.current?.setInputState('MainCharacter', 'category_focus', categoryValue);
    }, [category]);

    useEffect(() => {
      riveRef.current?.setInputState('MainCharacter', 'is_active', isActive);
    }, [isActive]);

    return (
      <View style={[styles.container, style]}>
        <Rive
          ref={riveRef}
          resourceName="soteria_character_core"
          artboardName="MainCharacter"
          stateMachineName="MainCharacter"
          autoplay={true}
          style={{ width: size, height: size }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SoteriaCharacter;
```

### useSoteriaCharacter Hook

```typescript
// lib/hooks/useSoteriaCharacter.ts
import { useRef, useCallback } from 'react';
import { SoteriaCharacterHandle } from '@/components/SoteriaCharacter';
import { RoutineCategory } from '@/types';

export function useSoteriaCharacter() {
  const characterRef = useRef<SoteriaCharacterHandle>(null);

  const triggerCelebration = useCallback(() => {
    characterRef.current?.triggerCelebration();
  }, []);

  const triggerMajorCelebration = useCallback(() => {
    characterRef.current?.triggerMajorCelebration();
  }, []);

  const goDormant = useCallback(() => {
    characterRef.current?.goDormant();
  }, []);

  const wakeUp = useCallback(() => {
    characterRef.current?.wakeUp();
  }, []);

  const startRoutine = useCallback(() => {
    characterRef.current?.startRoutine();
  }, []);

  const endRoutine = useCallback(() => {
    characterRef.current?.endRoutine();
  }, []);

  return {
    characterRef,
    triggerCelebration,
    triggerMajorCelebration,
    goDormant,
    wakeUp,
    startRoutine,
    endRoutine,
  };
}
```

---

## 6. Integration Points

### Where Character Appears

| Screen | State | Trigger |
|--------|-------|---------|
| Dashboard | Idle_Calm or Dormant | Based on avatar decay |
| Routine Execution | Routine_Active | While timer running |
| Completion Screen | Celebration | On routine complete |
| Harmony Achievement | Major_Celebration | When harmony reached |
| Onboarding | Onboarding_Welcome | First appearance |

### App File Changes Needed

**New Files:**
- `components/SoteriaCharacter.tsx`
- `lib/hooks/useSoteriaCharacter.ts`
- `assets/animations/characters/soteria_character_core.riv`

**Modified Files:**
- `package.json` (add rive-react-native)
- `app/(tabs)/index.tsx` (dashboard character)
- `app/routines/[id]/execute.tsx` (replace Lottie)
- `components/HarmonyModal.tsx` (major celebration)
- `app/onboarding/three-lights.tsx` (welcome)

---

## 7. Learning Resources

### Rive-Specific
1. **Official Rive Learn:** https://rive.app/learn
   - "Rive for Beginners" (3 hours)
   - "State Machines" (2 hours)
   - "Character Rigging" (4 hours)

2. **YouTube Tutorials:**
   - "Rive Tutorial for Beginners" by The Futur (30 min)
   - "Character Design in Rive" by Rive (1 hour)

3. **Community Examples:** https://rive.app/community
   - Search: "character idle"
   - Search: "state machine"

### Animation Principles
- "The 12 Principles of Animation" (Disney)
- Focus on: Squash & Stretch, Anticipation, Follow Through

---

## 8. Beginner Pitfalls to Avoid

| Mistake | Solution |
|---------|----------|
| Too many bones | Start with 10 bones max |
| State machine stuck | Add "Any State → Idle" safety net |
| File too large | Use SVG/vectors only, not PNGs |
| Names don't match | Write down exact names for code |
| Only test in Rive | Export and test in app by Day 3 |

---

## 9. MVP Timeline

### Week 1-2: MVP Character
- Simple character (circles + basic body)
- 3 animations: Idle, Celebrate, Dormant
- Show in dashboard and completion screen

### Week 3-4: Core Character
- Full anime design
- 5 core states
- All integration points

### Week 5-6: Polish
- Remaining states
- Color shifting
- Particle effects

---

## 10. Design Questions to Answer

Before starting, decide:

1. **Character appearance:**
   - [ ] Neutral/androgynous
   - [ ] Male-presenting
   - [ ] Female-presenting
   - [ ] Non-human (creature/spirit)

2. **Character name:**
   - [ ] Users name it
   - [ ] Canonical name (e.g., "Lumis" - relating to light)

3. **Character role:**
   - [ ] Silent (just animations)
   - [ ] Speaks (text bubbles)
   - [ ] Both

4. **MVP scope:**
   - [ ] Just completion screen
   - [ ] Dashboard + completion
   - [ ] Full app integration

---

## Next Steps

**Your first task:**

1. Go to https://rive.app
2. Sign up for free account
3. Complete the "Rive for Beginners" tutorial
4. Come back and create your first idle animation

---

*Last Updated: 2025-12-15*
