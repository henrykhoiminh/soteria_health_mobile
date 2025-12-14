Claude Code Prompt: Soteria Health Onboarding Infrastructure
Context
I'm building a React Native/Expo app called Soteria Health. I need to implement the narrative onboarding flow. I have the script written but no visual assets yet — I need the infrastructure built with placeholders so I can drop in assets later.
Onboarding Flow Overview
There are two flows:
New User Flow (after signup, before first app use)
Reset User Flow (when existing user resets their journey)
The onboarding is narrative-driven — the user "finds" a goddess named Soteria who guides them through setting up their journey and extracting three avatar companions (Mind, Body, Soul).

NEW USER FLOW (14 screens)
Screen 1: Value Prop
Display: Dark background, centered text, single button
Text: "A pain-free life. Built through mind, body, and soul."
Button: "Start Your Journey"
Action: Navigate to Screen 2
Screen 2: Finding Soteria
Display: Warm glow animation/placeholder, text appears
Text:
 Oh. You found me.That's not easy to do, you know.I'm Soteria.Goddess of safety and protection.But before we go any further —Why are you here?


Action: Tap to continue → Screen 3
Screen 3: Journey Focus
Display: Soteria presence (placeholder), two choice buttons
Text: "What are you seeking?"
Options:
"Injury Prevention" → saves journey_focus: 'prevention'
"Recovery" → saves journey_focus: 'recovery'
Action: Navigate to Screen 3a or 3b based on selection
Screen 3a: Prevention Response
Display: Soteria presence
Text:
 Prevention.You're not waiting to break.You're building strength before you need it.Smart.I built this place for people like you.Welcome.


Action: Tap to continue → Screen 4
Screen 3b: Recovery Response
Display: Soteria presence
Text:
 Recovery.Something happened. And instead of giving up,you're here looking for a way forward.That takes strength.I built this place for people like you.Welcome.


Action: Tap to continue → Screen 4
Screen 4: The World
Display: Environment expands, particles/lights suggesting other travelers
Text:
 Let me tell you about this place.I built it as a sanctuary.A world where travelers come to care for themselves —their minds, their bodies, their souls.You're not alone here.Other travelers walk these paths.They share routines. Form Circles.Support each other.I curate the practices.Guide the journeys.But the community? That's everyone.Including, now, you.


Action: Tap to continue → Screen 5
Screen 5: The Three Lights
Display: Three orbs emerge (blue, amber, violet) — placeholder animations
Text:
 Now. Let me show you what you're working with.Inside you are three lights.Your Mind — thoughts, focus, clarity.Your Body — strength, movement, energy.Your Soul — joy, peace, connection.Together, they are your Light.Every traveler here has them.And every traveler here learns to care for them.When they're nurtured, they glow.When they're ignored, they dim.Simple as that.


Action: Tap to continue → Screen 6
Screen 6: The Offer
Display: Soteria with three orbs
Text:
 Here's what I can do.I can pull these three outand give them form.Little companions.Visible pieces of yourself.You'll care for them.Complete routines to keep them thriving.And when you neglect them?Well. They'll let you know.Ready to meet them?


Button: "Show me"
Action: Navigate to Screen 7
Screen 7: Mind Extraction
Display: Mind orb separates and floats forward (blue/silver glow), placeholder animation
Text:
 This is your Mind.Your thoughts. Your focus.The voice that's always running.Every traveler's Mind is different.Yours has been working hard to get you here.It needs a name.Something just between you two.What would you like to call it?


Input: Text field for Mind avatar name
Suggestions: Tappable chips — "Luna", "Sage", "Echo", "Nimbus", "Clarity"
Validation: Required, max 12 characters
Action: Save mind_name, navigate to Screen 8
Screen 8: Body Extraction
Display: Body orb floats forward (amber glow), placeholder animation
Text (base):
 This is your Body.Your strength. Your movement. Your rest.The one that carries you through everything.


Text (conditional on journey_focus):
If Prevention: "You want to keep it strong. Build resilience before you need it. That's why you're here."
If Recovery: "It's been through something. We'll rebuild it — the right way."
Text (continued):
 What's its name?


Input: Text field for Body avatar name
Suggestions: "Terra", "Ember", "Atlas", "Oakley", "Bear"
Validation: Required, max 12 characters
Action: Save body_name, navigate to Screen 9
Screen 9: Soul Extraction
Display: Soul orb floats forward (violet glow), placeholder animation
Text:
 And this is your Soul.Your joy. Your peace.Your ability to feel somethingbeyond just "busy" and "fine."It's the easiest to forget.And the most important to remember.Give it a name.


Input: Text field for Soul avatar name
Suggestions: "Nova", "Aura", "Solace", "Lumen", "Haven"
Validation: Required, max 12 characters
Action: Save soul_name, navigate to Screen 10
Screen 10: Introduce Yourself
Display: All three orbs present, looking at user
Text:
 [Mind Name], [Body Name], and [Soul Name].They're yours now.But they don't know who you are yet.Introduce yourself.


Inputs:
First Name (required)
Last Name (required)
Action: Save first_name, last_name, navigate to Screen 11
Screen 11: Traveler Name
Display: Soteria, orbs, sense of wider world/community
Text:
 Perfect. [First Name] [Last Name].Now — one more thing.You're not alone in this world.Other travelers walk these paths.They share routines. Form Circles.Some might become companions on your journey.What should they call you?


Input: Username field
Helper text: "This is how other travelers will know you"
Validation: Required, unique (check against backend), max 20 characters
Action: Save username, navigate to Screen 12
Screen 12: The Bond
Display: Three named orbs orbit together, names visible beneath each
Text:
 [Mind Name], [Body Name], and [Soul Name].Now bonded to [First Name].They're connected — to each other, and to you.When one thrives, the others feel it.When one struggles, they all notice.That's not a flaw.That's how you're designed.


Action: Tap to continue → Screen 13
Screen 13: The Pact
Display: Soteria's presence, warm but direct
Text:
 Alright, [First Name]. Here's the deal.I've built this world.Curated the routines.Gathered the travelers.But I can't do your work for you.A few minutes a day.Show up for [Mind Name], [Body Name], and [Soul Name].Explore what I've built. Join a Circle. Share what works.Do that, and you'll build a pain-free life.Not overnight. Not perfectly.But steadily.Can you commit to that?


Button: "I'm in"
Action: Mark onboarding complete, navigate to Screen 14
Screen 14: The Beginning
Display: Full brightness, three orbs glowing, world opening up
Text:
 Welcome to the world, [First Name].Or should I say — [Username].[Mind Name], [Body Name], and [Soul Name] are ready.So am I.Your journey starts now.


Action: Transition to Home Screen

RESET USER FLOW (7 screens)
Reset users already have: first_name, last_name, email, username
They need to re-select: journey_focus, mind_name, body_name, soul_name
Reset Screen 1: Welcome Back + Journey Focus
Text:
 [First Name].You're back.A fresh start. Clean slate.I'm not going to ask what happened.What matters is you're here again.So — why this time?What are you seeking?


Options: "Injury Prevention" / "Recovery"
After selection, add:
 Good.Your three are still in there.Let's bring them back out.New names. Fresh start.


Reset Screens 2-4: Avatar Re-Extraction
Same as new user screens 7-9, but with adjusted intro text:
Mind:
Your Mind. Still here.
Let's give it a fresh start.
What do you want to call it this time?

Body:
Your Body. Ready to begin again.
What's its name?

Soul:
Your Soul. Patient as ever.
What will you call it now?

Reset Screen 5: The Bond
Same as new user Screen 12
Reset Screen 6: The Pact (Reset Version)
Text:
 [First Name].Starting over isn't failure.It's a choice.The same deal as before:I guide. You show up.A few minutes a day.Small rituals. Consistent care.You've done this before.You know what's possible.Ready to do it again?


Button: "Let's go"
Reset Screen 7: The Beginning
Text:
 Welcome back, [Username].The world missed you.[Mind Name], [Body Name], and [Soul Name] are ready.Let's make this chapter count.



DATA TO COLLECT & STORE
From Onboarding:
interface OnboardingData {
  journey_focus: 'prevention' | 'recovery';
  mind_name: string;
  body_name: string;
  soul_name: string;
  first_name: string;
  last_name: string;
  username: string;
  onboarding_completed: boolean;
  onboarding_completed_at: Date;
}

On Reset (wipe these):
journey_focus (re-select)
mind_name, body_name, soul_name (re-enter)
streaks
harmony_status
vacation_days
avatar_states
progress/analytics
On Reset (keep these):
first_name
last_name
email
username

COMPONENT STRUCTURE SUGGESTION
/onboarding
  /screens
    ValuePropScreen.tsx
    FindingSoteriaScreen.tsx
    JourneyFocusScreen.tsx
    JourneyResponseScreen.tsx
    WorldIntroScreen.tsx
    ThreeLightsScreen.tsx
    OfferScreen.tsx
    MindExtractionScreen.tsx
    BodyExtractionScreen.tsx
    SoulExtractionScreen.tsx
    IntroduceYourselfScreen.tsx
    TravelerNameScreen.tsx
    BondScreen.tsx
    PactScreen.tsx
    BeginningScreen.tsx
  /components
    SoteriaPresence.tsx       // Placeholder for Soteria visual
    AvatarOrb.tsx             // Placeholder for orb visuals
    NarrativeText.tsx         // Text that appears line by line
    NameInput.tsx             // Input with suggestion chips
    JourneyButton.tsx         // Styled choice buttons
  /hooks
    useOnboarding.ts          // State management for onboarding data
  /context
    OnboardingContext.tsx     // Context for sharing onboarding state
  OnboardingNavigator.tsx     // Stack navigator for onboarding flow


ANIMATION PLACEHOLDERS
For now, create simple placeholder components that can be replaced with real animations later:
SoteriaPresence
Simple glowing circle or gradient
Pulsing animation (scale 1.0 → 1.05 → 1.0)
Placeholder for future character art
AvatarOrb
Colored circle with glow effect
Props: type: 'mind' | 'body' | 'soul', name?: string, state?: 'dormant' | 'sleepy' | 'awakening' | 'glowing' | 'radiant'
Colors: Mind (blue/silver), Body (amber/coral), Soul (violet/white)
Gentle floating animation
NarrativeText
Text that fades in line by line
Props: lines: string[], speed?: number
Auto-advance or tap to reveal all

NAVIGATION LOGIC
// Check if user needs onboarding
const needsOnboarding = !user.onboarding_completed;
const needsResetOnboarding = user.journey_reset_requested;

// Route accordingly
if (needsOnboarding) {
  // New user → full onboarding flow starting at ValuePropScreen
} else if (needsResetOnboarding) {
  // Reset user → reset flow starting at WelcomeBackScreen
} else {
  // Normal user → Home screen
}


REQUIREMENTS
Build all screens with placeholder visuals (no final assets yet)
Text should appear naturally (line-by-line fade or typewriter effect optional)
Collect and persist all required data
Handle both new user and reset user flows
Username validation should check for uniqueness
Allow navigation back on screens where it makes sense
Disable "Continue" buttons until required fields are filled
Store onboarding_completed: true and timestamp when finished
Transition smoothly to Home screen after completion

STYLE NOTES
Dark theme for early screens, gradually brightening
Soft, warm colors — nothing harsh
Minimal UI chrome — focus on narrative
Generous spacing and readable text
Orbs should feel alive (subtle animations even when idle)

Please implement this onboarding infrastructure. Start with the navigation structure and core screens, then we can refine animations and styling.


