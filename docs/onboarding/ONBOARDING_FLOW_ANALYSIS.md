# Soteria Health Onboarding Flow Analysis
**Date:** December 21, 2025
**Objective:** Evaluate narrative onboarding pacing, engagement, and effectiveness

---

## Executive Summary

**Total Onboarding Screens:** 15 screens
**Estimated Completion Time:** 6-8 minutes (based on typewriter speed + user reading)
**Primary Issues Identified:**
1. Too many passive screens (user watching text type) between interactions
2. Some dialogue beats are redundant or could be consolidated
3. Journey selection appears twice (screens 2 and 3) with different UIs
4. Middle section (screens 4-9) has excellent pacing; opening and closing sections drag

**Strengths:**
- Consistent typewriter mechanic creates rhythm
- Strong voice and characterization of Soteria
- Beautiful progression from mystery → personalization → commitment
- Avatar naming is engaging and establishes emotional connection

---

## Screen-by-Screen Breakdown

### Screen 1: Value Proposition (`index.tsx`)
**Content:** "A pain-free life. Built through mind, body, and soul."
**Interaction:** CTA button "Start Your Journey"
**Timing:** 6.5 seconds before button appears

**Analysis:**
- ✅ **EFFECTIVE:** Strong hook, clear value proposition, immediate emotional appeal
- ✅ **GOOD PACING:** Animation timing creates anticipation without frustration
- ✅ **CLEAR PURPOSE:** Sets expectations for wellness journey
- ⚠️ **MINOR:** Could show subtle avatar preview to hint at what's coming

**Recommendation:** KEEP AS-IS (gold standard opening screen)

---

### Screen 2: Finding Soteria (`finding-soteria.tsx`)
**Content:** Multi-phase mystery intro + name collection + journey selection
**Phases:**
1. **Mystery:** "Well, well..." → "Who do we have here?" (3s)
2. **Name Entry:** First/Last name inputs
3. **Reinforcement:** "[Name]... I sense something very special about you."
4. **Intro:** "I am Soteria. I have guided many..." (4 captions, ~8s)
5. **Journey Choice:** Injury Prevention vs Recovery cards

**Interaction:** Name inputs, journey selection
**Total Timing:** ~15-20 seconds of dialogue + user input time

**Analysis:**
- ⚠️ **TOO MUCH IN ONE SCREEN:** This screen does 3 major things (name, intro, journey)
- ⚠️ **JOURNEY SELECTION REDUNDANCY:** User selects journey here, but there's also a separate journey-focus.tsx screen that's orphaned
- ✅ **STRONG VOICE:** "Well, well..." is perfect mystery hook
- ✅ **NAME REINFORCEMENT WORKS:** Personalized acknowledgment creates early emotional investment
- ❌ **SKIP BUTTON DURING INTRO:** Allows users to bypass Soteria's introduction entirely

**Recommendation:** SIMPLIFY - Split into two screens or remove redundant journey selection

---

### Screen 3: Journey Focus (`journey-focus.tsx`)
**Content:** "What are you seeking?" + two choice cards
**Interaction:** Injury Prevention or Recovery selection
**Status:** ORPHANED - This screen is not in the current flow

**Analysis:**
- ❌ **REDUNDANT:** Journey selection already happens in Screen 2
- ❌ **UNREACHABLE CODE:** Router never navigates here

**Recommendation:** DELETE this screen (journey selection consolidated in Screen 2)

---

### Screen 4: Journey Response (`journey-response.tsx`)
**Content:** Soteria responds to journey choice with personalized dialogue
- **Prevention:** 6 captions (~12s) - "Prevention. You're not waiting to break..."
- **Recovery:** 7 captions (~14s) - "Recovery. Something happened..."

**Interaction:** Tap anywhere to continue (after all captions)
**Status:** ORPHANED - Router goes from Screen 2 → world-intro, skipping this

**Analysis:**
- ❌ **UNREACHABLE CODE:** journey-response.tsx is never called in current flow
- ⚠️ **GOOD CONTENT BUT TOO LONG:** 6-7 captions of passive listening
- ✅ **STRONG PERSONALIZATION:** Different responses for Prevention vs Recovery show care
- ⚠️ **NO SKIP BUTTON:** User must wait through entire sequence

**Recommendation:** INTEGRATE condensed version into Screen 2's welcome phase (currently 3 captions, could add 1-2 more)

---

### Screen 5: World Intro (`world-intro.tsx`)
**Content:** 9 captions introducing the community/world (~16-18s)
- "Let me show you this place..."
- "A space where humans learn to care for themselves"
- Community beats (accumulating text): "Others walk these paths..." (4 captions)
- "Ready to see what you carry?"

**Interaction:** Skip button, then Continue
**Timing:** ~18 seconds of passive listening

**Analysis:**
- ⚠️ **TOO LONG:** 9 captions is a lot of passive content
- ✅ **SKIP BUTTON AVAILABLE:** Users can escape if impatient
- ⚠️ **COMMUNITY FOCUS TOO EARLY:** Users haven't used the app yet, hard to care about circles/community
- ✅ **ACCUMULATING TEXT MECHANIC:** Clever way to build momentum
- ❌ **"READY TO SEE WHAT YOU CARRY?"** Unclear what this means (weak bridge to next screen)

**Recommendation:** CUT to 5-6 captions; reduce community focus; strengthen bridge to avatars

---

### Screen 6: Three Lights (`three-lights.tsx`)
**Content:** 12 captions introducing Mind/Body/Soul concept (~20-24s)
- "Within you are three lights..."
- Individual avatar highlights: "Your Mind — focus, clarity, thought"
- "When nurtured, it glows. When neglected, it fades."

**Interaction:** Skip button, then Continue
**Timing:** ~24 seconds of passive listening
**Visual:** Three orbs that highlight as mentioned

**Analysis:**
- ❌ **TOO LONG:** 12 captions is excessive
- ✅ **STRONG VISUAL FEEDBACK:** Orb highlighting creates engagement
- ⚠️ **COULD BE MORE CONCISE:** "Your Mind — focus, clarity, thought" could just be "Your Mind. Focus and clarity."
- ✅ **CORE CONCEPT EXPLAINED WELL:** Users understand the three-part system
- ✅ **SKIP BUTTON AVAILABLE:** Escape hatch for impatient users

**Recommendation:** CUT to 8 captions; tighten individual avatar descriptions

---

### Screen 7: The Offer (`the-offer.tsx`)
**Content:** 10 captions explaining avatar care mechanic (~18-20s)
- "I can pull these three from within you, and give them shape."
- "You will care for them. Complete routines, they thrive. Ignore them? They fade."

**Interaction:** Skip button, then "Show me"
**Timing:** ~20 seconds of passive listening

**Analysis:**
- ⚠️ **MODERATELY LONG:** 10 captions is borderline too much
- ✅ **CRITICAL INFORMATION:** This explains the core game loop
- ✅ **STRONG STAKES:** "Ignore them? They fade..." creates emotional investment
- ⚠️ **"SHOW ME" BUTTON:** Good CTA but could be more urgent ("Let's meet them")
- ✅ **SKIP BUTTON AVAILABLE:** Users can escape

**Recommendation:** CUT to 7 captions; emphasize emotional bond over mechanics

---

### Screen 8: Mind Extraction (`mind-extraction.tsx`)
**Content:** 4 captions + name selection (~6s + selection time)
- "This is your Mind. Your thoughts. Your focus."
- "What shall you call it?"

**Interaction:** Select name from list
**Timing:** ~8 seconds dialogue + name selection

**Analysis:**
- ✅ **PERFECT PACING:** Short, focused, clear purpose
- ✅ **EMOTIONAL INVESTMENT:** Naming creates ownership
- ✅ **VISUAL FEEDBACK:** Orb displays chosen name immediately
- ✅ **INTERACTION BALANCED:** User acts, doesn't just watch

**Recommendation:** KEEP AS-IS (gold standard interaction screen)

---

### Screen 9: Body Extraction (`body-extraction.tsx`)
**Content:** 2 captions + name selection (~3s + selection time)
- "Your Body. Strength and movement."
- "What shall you call it?"

**Interaction:** Select name from list
**Timing:** ~5 seconds dialogue + name selection

**Analysis:**
- ✅ **EXCELLENT PACING:** Even faster than Mind screen
- ✅ **STREAMLINED:** User knows the pattern, doesn't need explanation
- ✅ **RESET FLOW VARIATION:** Different dialogue for returning users

**Recommendation:** KEEP AS-IS (perfect execution)

---

### Screen 10: Soul Extraction (`soul-extraction.tsx`)
**Content:** 2 captions + name selection (~3s + selection time)
- "Your Soul. Peace and connection."
- "What shall you call it?"

**Interaction:** Select name from list
**Timing:** ~5 seconds dialogue + name selection

**Analysis:**
- ✅ **EXCELLENT PACING:** Consistent with Body screen
- ✅ **PATTERN COMPLETION:** User feels progress with third avatar
- ✅ **RESET FLOW VARIATION:** "Patient as ever" - nice character touch

**Recommendation:** KEEP AS-IS (perfect execution)

---

### Screen 11: Introduce Yourself (`introduce-yourself.tsx`)
**Content:** 4 captions acknowledging avatars by name (~7s)
- "[Mind], [Body], and [Soul]. They're yours now."
- "They already know your name, [FirstName]."

**Interaction:** Continue button
**Timing:** ~9 seconds of passive listening

**Analysis:**
- ⚠️ **REDUNDANT:** User just named them, doesn't need recap
- ⚠️ **PASSIVE:** No interaction, just watching text
- ✅ **PERSONALIZATION:** Uses both avatar names and user's name
- ❌ **WEAK BRIDGE:** "Together, you'll build something extraordinary" is vague

**Recommendation:** REMOVE or MERGE with next screen (Screen 12: Traveler Name)

---

### Screen 12: Traveler Name (`traveler-name.tsx`)
**Content:** 2 captions + username input (~3s + input time)
- "One last thing. What should other travelers call you?"

**Interaction:** Username input with availability check
**Timing:** ~5 seconds dialogue + username creation

**Analysis:**
- ✅ **GOOD PACING:** Short dialogue, clear purpose
- ✅ **SOCIAL FEATURE SETUP:** Prepares users for community aspects
- ⚠️ **VALIDATION FRICTION:** Username availability check could cause frustration
- ⚠️ **TIMING:** Could happen earlier (Screen 2?) to avoid feeling like afterthought

**Recommendation:** KEEP but consider moving earlier or making optional

---

### Screen 13: The Bond (`the-bond.tsx`)
**Content:** 7 captions about avatar interconnection (~12s)
- "[Mind], [Body], and [Soul]. Now bonded to [FirstName]."
- "When one thrives, the others feel it. When one struggles, they all notice."

**Interaction:** Skip button, then Continue
**Timing:** ~14 seconds of passive listening

**Analysis:**
- ⚠️ **MODERATELY LONG:** 7 captions of passive content
- ✅ **IMPORTANT CONCEPT:** Explains interconnection mechanic
- ⚠️ **COULD BE MORE CONCISE:** "They're connected. When one thrives, all feel it. When one struggles, they notice."
- ✅ **PERSONALIZATION:** Uses avatar and user names
- ✅ **SKIP BUTTON AVAILABLE:** Escape hatch

**Recommendation:** CUT to 4-5 captions; focus on core interconnection message

---

### Screen 14: The Pact (`the-pact.tsx`)
**Content:** 10-12 captions (varies by new/reset user) (~20-24s)
- "Here's the deal. I've built this world... but I can't do your work."
- "A few minutes a day. Show up for [avatars]."
- "Can you commit to that?"

**Interaction:** Skip button, then "I'm in" / "Let's go"
**Timing:** ~24 seconds of passive listening

**Analysis:**
- ❌ **TOO LONG:** 10-12 captions is excessive at this stage
- ✅ **STRONG VOICE:** "Here's the deal" feels authentic and direct
- ⚠️ **REPETITIVE:** "A few minutes a day" mentioned multiple times across flow
- ✅ **CLEAR COMMITMENT:** Users know what they're signing up for
- ⚠️ **COULD BE PUNCHIER:** "I guide. You show up. Few minutes a day. Deal?" (3 captions)
- ✅ **SKIP BUTTON AVAILABLE:** Escape hatch

**Recommendation:** CUT to 5-6 captions; make it punchy and direct like a handshake deal

---

### Screen 15: The Beginning (`the-beginning.tsx`)
**Content:** 5 captions + auto-save + navigation (~10s)
- "Then it begins. Your world awaits."
- "[Avatars] are ready. So am I."
- Auto-saves profile data, navigates to app

**Interaction:** None (automated)
**Timing:** ~12 seconds total (dialogue + save)

**Analysis:**
- ✅ **GOOD CLOSURE:** Creates sense of beginning
- ✅ **AUTOMATED TRANSITION:** No extra button needed
- ⚠️ **SAVE INDICATOR:** "Preparing your world..." is nice but adds time
- ✅ **RESET FLOW VARIATION:** "We begin again" for returning users

**Recommendation:** KEEP AS-IS (good finale)

---

## Overall Flow Issues

### Issue 1: Too Many Passive Screens in a Row
**Problem:** Screens 11-14 are all passive (just watching text) with minimal interaction
- Screen 11: Introduce Yourself (watch text)
- Screen 12: Traveler Name (input username - ONLY interaction)
- Screen 13: The Bond (watch text)
- Screen 14: The Pact (watch text)

**Impact:** Users disengage during long passive sequences
**Recommendation:** Cut Screen 11 entirely; merge Screen 13 into Screen 14

---

### Issue 2: Orphaned Screens
**Problem:** Two screens exist in codebase but aren't in the flow:
- `journey-focus.tsx` - Journey selection (redundant with Screen 2)
- `journey-response.tsx` - Response to journey choice (good content, unreachable)

**Impact:** Confusion for developers; missed opportunity for personalization
**Recommendation:** Delete journey-focus.tsx; integrate journey-response content into Screen 2

---

### Issue 3: Dialogue Could Be Tightened
**Examples:**
- "Your thoughts. Your focus." → "Your focus and clarity."
- "And they already know your name, [FirstName]." → "And they know you, [FirstName]."
- "What is it you seek?" → "What brings you here?"

**Impact:** Longer wait times add up across 15 screens
**Recommendation:** Cut 20-30% of words across all captions

---

### Issue 4: Skip Button Inconsistency
**Screens with Skip:**
- Screen 2 (Finding Soteria - Intro phase only)
- Screen 5 (World Intro)
- Screen 6 (Three Lights)
- Screen 7 (The Offer)
- Screen 13 (The Bond)
- Screen 14 (The Pact)

**Screens without Skip:**
- Screen 4 (Journey Response - orphaned)
- Screen 8-10 (Extraction screens - OK, they're short)
- Screen 11 (Introduce Yourself - NO SKIP, should have one)
- Screen 15 (The Beginning - Auto-advances, OK)

**Impact:** Inconsistent user control
**Recommendation:** Add skip to Screen 11 OR remove the screen entirely

---

## Pacing Analysis by Section

### Opening (Screens 1-2): GOOD PACING ✅
- **Time:** ~30-40 seconds
- **Interactions:** 2 (start button, name entry, journey selection)
- **Passive Time:** ~15 seconds
- **Verdict:** Balanced mystery → personalization

### World Building (Screens 4-7): TOO SLOW ⚠️
- **Time:** ~60-75 seconds
- **Interactions:** 0 (all passive watching)
- **Passive Time:** 60-75 seconds
- **Verdict:** Engaging content but too much at once; needs interaction breaks

### Avatar Creation (Screens 8-10): PERFECT PACING ✅
- **Time:** ~30-40 seconds
- **Interactions:** 3 (naming each avatar)
- **Passive Time:** ~15 seconds
- **Verdict:** Great balance, user feels in control

### Closing (Screens 11-15): TOO SLOW ❌
- **Time:** ~60-70 seconds
- **Interactions:** 1 (username entry)
- **Passive Time:** ~50 seconds
- **Verdict:** Too much passive content; user ready to start app

---

## Recommended Optimizations (Priority Order)

### PRIORITY 1: Remove Redundant Screens
**Action:**
1. DELETE `journey-focus.tsx` (orphaned, redundant)
2. DELETE or MERGE `introduce-yourself.tsx` into traveler-name screen
3. INTEGRATE journey-response content (condensed) into finding-soteria welcome phase

**Impact:** Reduces total screens from 15 → 12-13; saves ~15-20 seconds

---

### PRIORITY 2: Tighten Dialogue
**Action:** Reduce caption count by 25-30% across these screens:
- World Intro: 9 → 6 captions
- Three Lights: 12 → 8 captions
- The Offer: 10 → 7 captions
- The Bond: 7 → 4 captions
- The Pact: 10-12 → 5-6 captions

**Impact:** Saves ~30-40 seconds total; maintains voice while improving pacing

---

### PRIORITY 3: Add Tap-to-Skip Mechanic
**Action:** All typewriter screens should allow tap-anywhere to skip to end of current caption
**Current State:** Only some screens have this via `handleTapToSpeed` function
**Impact:** Users feel more in control; reduces frustration

---

### PRIORITY 4: Reorganize Flow
**Current:** Mystery → Name → Journey → World → Avatars → Username → Bond → Pact → Begin
**Proposed:** Mystery → Name → Journey + Response → Avatars → World → Username → Commitment → Begin

**Changes:**
1. Move journey-response content into finding-soteria (condensed)
2. Avatar extraction happens before world-building (emotional investment first)
3. Merge Bond + Pact into single "Commitment" screen
4. Username after avatars (flows better)

**Impact:** More logical progression; front-loads interaction

---

## Voice & Characterization Analysis

### Soteria's Voice: EXCELLENT ✅
**Strengths:**
- Consistent mysterious guide archetype
- Mix of mystical ("Well, well...") and direct ("Here's the deal")
- Shows care without being saccharine
- Uses pauses effectively for dramatic effect

**Examples:**
- "Well, well... Who do we have here?" (Mystery)
- "That takes courage." (Empathy)
- "Here's the deal. I've built this world." (Directness)
- "Not overnight. Not perfectly. But steadily." (Realism)

**Minor Issues:**
- Occasionally verbose ("And instead of giving up, you're here looking for a way forward" → "Yet here you are")
- Some metaphors unclear ("Ready to see what you carry?" - confusing)

**Recommendation:** Maintain voice, just tighten execution

---

## Metrics & Success Criteria

### Current Estimated Metrics
- **Time to First Interaction:** 6.5 seconds ✅
- **Total Onboarding Time:** 6-8 minutes ⚠️ (target: 3-5 minutes)
- **Passive Listening Time:** ~3-4 minutes ❌ (target: <2 minutes)
- **Total Interactions:** 6 (name, journey, 3 avatars, username) ⚠️ (target: 8-10)
- **Screens with Skip Button:** 6/15 (40%) ⚠️ (target: 80%+)

### Target Metrics After Optimization
- **Total Screens:** 12-13 (from 15)
- **Total Time:** 4-5 minutes (from 6-8)
- **Passive Time:** <2 minutes (from 3-4)
- **Interactions:** 8-10 (add micro-interactions)
- **Skip Availability:** 90%+

---

## RPG Design Principles Applied

### What's Working ✅
1. **Character Creation = User Profiling:** Avatar naming is engaging
2. **Progressive Disclosure:** Concepts introduced one at a time
3. **Emotional Investment Before Effort:** Name avatars before explaining work
4. **Clear Stakes:** "Ignore them? They fade..." creates urgency

### What's Missing ⚠️
1. **First Win Too Late:** Users don't DO anything until Screen 8 (avatar naming)
2. **No Preview of Power:** Users haven't seen a routine or felt progress
3. **Minimal Agency:** Most screens are passive watching
4. **No Early "Aha!" Moment:** Understanding comes slowly, not in burst

### Recommendations from RPG Lens
1. **Show, Don't Tell:** Let user try a 30-second breathing exercise in Screen 3-4
2. **Visual Progress Bar:** Show how far through onboarding (exists but subtle)
3. **Choice Matters:** Different journey paths should feel meaningfully different
4. **First 5 Minutes Rule:** Current onboarding IS 5+ minutes - too long

---

## Final Recommendations Summary

### DO NOW (High Impact, Low Effort)
1. Delete `introduce-yourself.tsx` screen
2. Delete orphaned `journey-focus.tsx` screen
3. Add tap-to-skip to all typewriter screens
4. Cut 25% of words from long dialogue screens (5-7, 13-14)

### DO NEXT (High Impact, Medium Effort)
1. Integrate journey-response content into finding-soteria
2. Merge The Bond + The Pact into single Commitment screen
3. Reorder flow: Avatars before World building
4. Add skip button to all passive screens

### CONSIDER (Medium Impact, High Effort)
1. Add interactive demo (breathing exercise) in World Intro
2. Create branching narratives for Prevention vs Recovery
3. A/B test shorter onboarding vs current
4. Add animation/visual feedback during longer dialogue beats

---

## Testing Recommendations

### Before Publishing Changes
1. **Time Each Screen:** Actual user testing with 10+ people
2. **Track Drop-off Points:** Where do users abandon?
3. **Measure Engagement:** Do users skip or read?
4. **Test Voice Comprehension:** Do users understand Soteria's role?

### Success Metrics
- **Completion Rate:** >85% (currently unknown)
- **Time to Complete:** 4-5 minutes (currently 6-8)
- **Skip Usage:** <20% of users skip every screen
- **Day 1 Retention:** >40% (onboarding quality indicator)

---

## Conclusion

The Soteria onboarding has a **strong foundation** with excellent voice, clear value proposition, and emotionally engaging avatar creation. The primary issues are:

1. **Too long** (6-8 minutes when best practice is 3-5)
2. **Too passive** (user watches more than interacts)
3. **Redundant content** (orphaned screens, repeated concepts)

**Priority fixes:**
- Remove 2-3 screens (introduce-yourself, journey-focus)
- Cut dialogue by 25-30%
- Add tap-to-skip everywhere
- Reorganize for emotional investment first

**After optimization, expect:**
- 12-13 screens (from 15)
- 4-5 minutes (from 6-8)
- Higher engagement and completion rates
- Stronger emotional connection to avatars

The narrative onboarding is a **differentiator** for Soteria - it just needs tightening to respect users' time while maintaining its unique voice.
