# Simple Database Reset - Clear All Routines

Quick guide to clear all routines and start fresh from the app UI.

## 🎯 Why This Approach?

- ✅ Simpler than complex seeding scripts
- ✅ Tests your app's routine builder thoroughly
- ✅ Reveals any missing features or bugs
- ✅ Gives you full control over routine creation
- ✅ No service role keys or complex setup needed

---

## 📋 Steps

### 1. Clear the Database

In **Supabase SQL Editor**, run:

```sql
\i sql/clear_all_routines.sql
```

This will:
- Delete all routines
- Delete all routine completions
- Delete all saved routine references
- Delete all circle routine references
- Show before/after counts

### 2. Verify It Worked

You should see output like:

```
BEFORE DELETE - Current counts
total_routines: 15
total_completions: 42
total_saved: 8

AFTER DELETE - Verification
total_routines: 0
total_completions: 0
total_saved: 0

✓ All routines cleared successfully!
Database is ready for fresh routines from app UI
```

### 3. Create Routines from App

Now open your app and use the **routine builder** to create:

1. **Morning Mobility Flow** (Body, Beginner)
2. **Stress Relief Meditation** (Mind, Beginner)
3. **Evening Gratitude Practice** (Soul, Beginner)
4. **Neck & Shoulder Relief** (Body, Intermediate)
5. **Core Stability & Lower Back Care** (Body, Intermediate)

---

## 💡 Benefits of This Approach

### Will Reveal Issues Like:

- Missing fields in the routine builder
- Validation bugs
- UI/UX improvements needed
- Missing benefits input
- Missing tag/body part inputs
- Journey focus selection issues
- Official routine marking

### Gives You Practice:

- Creating different routine types
- Testing the builder thoroughly
- Understanding the full routine creation flow
- Identifying pain points for users

---

## 🔄 If You Want to Reset Again

Just run the SQL script again:

```sql
\i sql/clear_all_routines.sql
```

Safe to run multiple times!

---

## 📝 Routine Templates to Create

Use these as guides when creating in the app:

### 1. Morning Mobility Flow (Body, Beginner, 11 min)
- 10 exercises
- Benefits: Flexibility, reduces stiffness, increases energy, prepares body
- Tags: Morning, Stretching, Mobility, Full Body, Gentle
- Body Parts: Neck, Shoulders, Upper Back, Lower Back, Hips

### 2. Stress Relief Meditation (Mind, Beginner, 15 min)
- 9 exercises
- Benefits: Reduces stress, improves clarity, promotes relaxation, enhances well-being
- Tags: Meditation, Mindfulness, Stress Relief, Breathing, Mental Health

### 3. Evening Gratitude Practice (Soul, Beginner, 11 min)
- 8 exercises
- Benefits: Cultivates gratitude, reduces anxiety, improves sleep, enhances happiness
- Tags: Evening, Gratitude, Reflection, Mindfulness, Sleep Prep

### 4. Neck & Shoulder Relief (Body, Intermediate, 15 min)
- 10 exercises
- Benefits: Relieves pain, improves posture, increases flexibility, reduces headaches
- Tags: Desk Work, Upper Body, Stretching, Strength, Pain Relief
- Body Parts: Neck, Shoulders, Upper Back

### 5. Core Stability & Lower Back Care (Body, Intermediate, 23 min)
- 12 exercises
- Benefits: Strengthens core, reduces back pain, improves posture, prevents injuries
- Tags: Core Work, Strength, Lower Back, Stability, Pain Relief
- Body Parts: Core, Lower Back, Hips

---

## ✅ Checklist When Creating Each Routine

- [ ] Set correct category (Mind/Body/Soul)
- [ ] Set correct difficulty (Beginner/Intermediate/Advanced)
- [ ] Add journey focus (Injury Prevention/Recovery/Both)
- [ ] Add 3-4 benefits
- [ ] Add relevant tags
- [ ] Add targeted body parts (for Body routines)
- [ ] Add all exercises with proper durations
- [ ] Mark as official routine (if you have that feature)
- [ ] Test executing the routine

---

## 🐛 Features You Might Discover Are Missing

Based on the seeding system requirements, check if your builder has:

- [ ] Benefits input (max 8)
- [ ] Tags input (max 10)
- [ ] Body parts input (max 10)
- [ ] Journey focus selection (both options)
- [ ] Official routine toggle
- [ ] Official author field
- [ ] Duration auto-calculation from exercises
- [ ] Validation for all fields

---

**This approach is cleaner, tests your app, and gives you real-world practice with the routine builder!** 🚀
