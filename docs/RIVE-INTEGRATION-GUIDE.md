# Rive Integration Guide

A step-by-step guide for creating, exporting, and testing Rive companion animations in Soteria Health.

---

## Quick Start Checklist

- [ ] Create `.riv` file in Rive Editor
- [ ] Set up state machine named `CompanionState`
- [ ] Export and place in `assets/rive/`
- [ ] Update `metro.config.js` (if needed)
- [ ] Set `useFallback={false}` in component
- [ ] Test on device via `/companion-demo`

---

## 1. Rive Editor Setup

### Create Your Animation

1. Go to [rive.app](https://rive.app) and create a new file
2. Set artboard size: **120x120px** (or square, will scale)
3. Design your companion following the [Character Design Guide](./CHARACTER-DESIGN-GUIDE.md)

### State Machine Requirements

Create a state machine named exactly: **`CompanionState`**

#### Inputs (create these in the Inputs panel)

| Input Name | Type | Description |
|------------|------|-------------|
| `lightLevel` | Number | Values 0-4 representing light states |
| `userTapped` | Trigger | Fired when user taps the companion |

#### States to Create

| State Name | lightLevel Value | Animation |
|------------|------------------|-----------|
| Dormant | 0 | Nearly invisible, very slow pulse (4-5s loop) |
| Sleepy | 1 | Faint glow, slow breathing (3s loop) |
| Awakening | 2 | Visible glow, gentle animation (2.5s loop) |
| Glowing | 3 | Full presence, confident animation (2s loop) |
| Radiant | 4 | Peak intensity, celebratory (1.5s loop) |
| TapResponse | (any) | Quick burst animation, returns to current state |

#### State Machine Logic

```
Transitions:
- Use "lightLevel" conditions to transition between idle states
- lightLevel == 0 → Dormant
- lightLevel == 1 → Sleepy
- lightLevel == 2 → Awakening
- lightLevel == 3 → Glowing
- lightLevel == 4 → Radiant

- "userTapped" trigger → TapResponse → back to current idle
```

### Animation Tips for Mobile

- **Idle loops:** 2-4 seconds, seamless looping
- **Particles:** Max 15-20 per character
- **Bones:** Under 10 for smooth performance
- **Glow effects:** Use Rive's built-in blur (GPU accelerated)
- **File size:** Aim for under 100KB per character

---

## 2. Export from Rive

1. Click **Export** in the top-right of Rive Editor
2. Select **"For runtime (smaller)"**
3. Choose format: **.riv**
4. Name the file according to this convention:

| Companion | Filename |
|-----------|----------|
| Mind | `companion_mind.riv` |
| Body | `companion_body.riv` |
| Soul | `companion_soul.riv` |
| Soteria | `soteria.riv` |

---

## 3. Add to Codebase

### Place Files

Copy your exported `.riv` files to:

```
soteria-health-mobile/
└── assets/
    └── rive/
        ├── companion_mind.riv
        ├── companion_body.riv
        ├── companion_soul.riv
        └── soteria.riv (optional)
```

### Update Metro Config (if not already done)

Ensure `metro.config.js` includes `.riv` as an asset extension:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .riv to asset extensions
config.resolver.assetExts.push('riv');

module.exports = config;
```

### iOS: Run Pod Install

After adding new native assets:

```bash
cd ios && pod install && cd ..
```

---

## 4. Enable Rive in Component

Open `components/CompanionAvatar.tsx` and change the default:

```typescript
// Before (fallback mode)
useFallback = true

// After (Rive mode)
useFallback = false
```

Or pass the prop where you use the component:

```tsx
<CompanionAvatar
  category="Mind"
  lightState="Glowing"
  useFallback={false}  // Enable Rive
  onPress={() => console.log('Tapped!')}
/>
```

---

## 5. Test Your Assets

### Using the Demo Screen

1. Start the app: `npm start`
2. Navigate to `/companion-demo` in the app
3. Test all states by tapping the companions or using the control buttons

### What to Check

| Test | Expected Behavior |
|------|-------------------|
| Initial load | Companion appears at correct state |
| State transitions | Smooth animation between light levels |
| Tap response | Burst animation plays, returns to idle |
| Performance | Smooth 60fps, no jank |
| Scaling | Looks good at 40px, 80px, 120px sizes |

### Debugging

**Rive not loading:**
```typescript
// Check console for errors
// The component will auto-fallback to icons if .riv fails to load
```

**State machine not responding:**
```typescript
// Verify state machine is named exactly "CompanionState"
// Verify inputs are named exactly "lightLevel" and "userTapped"
// Check Rive console in editor for errors
```

**Performance issues:**
- Reduce particle count
- Simplify bone rig
- Check file size (should be <100KB)
- Test on physical device, not simulator

---

## 6. Integration Points

### Dashboard Avatars

The main dashboard uses CompanionAvatar in `app/(tabs)/index.tsx`:

```tsx
// Current implementation uses a different component
// To switch to CompanionAvatar:
import CompanionAvatar from '@/components/CompanionAvatar';

<CompanionAvatar
  category="Mind"
  lightState={avatarStates.find(a => a.category === 'Mind')?.lightState || 'Sleepy'}
  size={80}
  onPress={() => handleAvatarPress('Mind')}
  useFallback={false}
/>
```

### Wellness Check-In Modal

The check-in modal at `components/WellnessCheckInModal.tsx` shows companion dots that can be replaced:

```tsx
// Current: colored dots
<View style={[styles.summaryDot, { backgroundColor: CATEGORY_COLORS.mind }]} />

// Future: animated companions
<CompanionAvatar category="Mind" lightState="Glowing" size={40} useFallback={false} />
```

### Onboarding Screens

Companions appear during character introductions in onboarding.

---

## 7. File Reference

| File | Purpose |
|------|---------|
| `components/CompanionAvatar.tsx` | Main component with Rive + fallback |
| `app/companion-demo.tsx` | Test screen for all states |
| `assets/rive/*.riv` | Your Rive animation files |
| `docs/CHARACTER-DESIGN-GUIDE.md` | Design direction and personality |
| `docs/RIVE-INTEGRATION-GUIDE.md` | This file |

---

## 8. Troubleshooting

### "Cannot find module 'rive-react-native'"

```bash
npm install rive-react-native
cd ios && pod install && cd ..
```

### Rive file not found at runtime

1. Check filename matches exactly (case-sensitive)
2. Ensure file is in `assets/rive/` directory
3. Restart Metro bundler: `npm start -- --clear`

### Animation plays but states don't change

1. Open Rive Editor, verify state machine inputs
2. Check input names are exactly `lightLevel` (Number) and `userTapped` (Trigger)
3. Verify transitions use the correct conditions

### White/blank square instead of animation

1. Check Rive console for export errors
2. Verify artboard has visible content
3. Test the .riv file at [rive.app/preview](https://rive.app)

### Crashes on iOS

```bash
# Clean and rebuild
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm start -- --clear
```

---

## 9. Asset Checklist Per Character

Use this checklist when creating each companion:

### Mind Companion
- [ ] Artboard: 120x120px, blue theme (#3B82F6)
- [ ] 5 idle states (Dormant → Radiant)
- [ ] Tap response animation
- [ ] State machine: `CompanionState`
- [ ] Inputs: `lightLevel`, `userTapped`
- [ ] Exported as `companion_mind.riv`
- [ ] File size < 100KB
- [ ] Tested in app

### Body Companion
- [ ] Artboard: 120x120px, red theme (#EF4444)
- [ ] 5 idle states (Dormant → Radiant)
- [ ] Tap response animation
- [ ] State machine: `CompanionState`
- [ ] Inputs: `lightLevel`, `userTapped`
- [ ] Exported as `companion_body.riv`
- [ ] File size < 100KB
- [ ] Tested in app

### Soul Companion
- [ ] Artboard: 120x120px, amber theme (#F59E0B)
- [ ] 5 idle states (Dormant → Radiant)
- [ ] Tap response animation
- [ ] State machine: `CompanionState`
- [ ] Inputs: `lightLevel`, `userTapped`
- [ ] Exported as `companion_soul.riv`
- [ ] File size < 100KB
- [ ] Tested in app

### Soteria (Optional)
- [ ] Artboard: 120x120px, gold theme (#F7DD6F)
- [ ] Idle animation
- [ ] Speaking animation (if needed)
- [ ] State machine: `SoteriaState`
- [ ] Exported as `soteria.riv`
- [ ] Tested in app

---

*Last updated: 2026-02-07*
