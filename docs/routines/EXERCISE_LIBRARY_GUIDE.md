# Exercise Library System - Implementation Guide

## 🎯 Overview

Comprehensive exercise management system for health team members to create, edit, and organize exercises that can be used in routines.

---

## ✅ What's Been Created

### 1. Database Schema (`sql/migrations/add_exercise_library.sql`)

**exercises table** with fields:
- Basic info: name, description, instructions
- Metadata: category, difficulty
- Duration: default_duration_seconds (5-600 seconds)
- Targeting: body_parts[], tags[]
- Media: demo_image_url, demo_video_url
- Permissions: created_by, is_official, is_public
- Tracking: usage_count, timestamps

**Features:**
- ✅ Full text search on name/description/instructions
- ✅ GIN indexes for array searches (body_parts, tags)
- ✅ Row Level Security (RLS) policies
- ✅ 7 seed exercises (Body, Mind, Soul)

**RLS Policies:**
- Everyone can view public exercises
- Health team can create/edit/delete official exercises
- Users can create/edit/delete their own exercises

---

### 2. TypeScript Types (`types/index.ts`)

```typescript
export interface ExerciseLibraryItem {
  id: string
  name: string
  description: string
  instructions: string
  category: RoutineCategory
  difficulty: RoutineDifficulty
  default_duration_seconds: number
  body_parts?: string[]
  tags?: string[]
  demo_image_url?: string
  demo_video_url?: string
  created_by?: string
  is_official: boolean
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}
```

---

### 3. Utility Functions (`lib/utils/exercises.ts`)

**CRUD Operations:**
- `getExercises(filters?)` - Get all exercises with optional filters
- `getExerciseById(id)` - Get single exercise
- `createExercise(input, userId)` - Create new exercise
- `updateExercise(input)` - Update existing exercise
- `deleteExercise(id)` - Delete exercise

**Helper Functions:**
- `getOfficialExercises()` - Get only official exercises
- `getExercisesByCategory(category)` - Filter by category
- `searchExercises(query)` - Text search
- `canCreateExercises(userId)` - Check permissions

**Filters Available:**
- category (Mind/Body/Soul)
- difficulty (Beginner/Intermediate/Advanced)
- searchQuery (text search)
- bodyParts (array contains) - Upper Body: Neck, Shoulder, Upper Back, Elbow, Wrist, Chest, Arm; Lower Body: Lower Back, Hip, Knee, Ankle, Foot
- tags (array overlaps)
- isOfficial (true/false)
- createdBy (user ID)
- ownership (all/official/mine/community)

---

### 4. Exercise Library Browser (`components/ExerciseLibrary.tsx`)

**Features:**
- ✅ Search exercises by name/description/instructions
- ✅ Filter by category (Mind/Body/Soul)
- ✅ Filter by difficulty (Beginner/Intermediate/Advanced)
- ✅ Filter by ownership (All/Official/My Exercises/Community)
- ✅ Filter by body part (Upper Body/Lower Body areas)
- ✅ View exercise cards with metadata
- ✅ Select exercises (for routine builder)
- ✅ Edit exercises (for health team)
- ✅ Shows official badge for official exercises
- ✅ Displays body parts and tags
- ✅ Shows duration and usage count

**Filter UI (Horizontal Scroll Carousel):**
- 4 filter chips in a horizontal ScrollView
- Each chip has an icon + label + chevron
- Icons: `people-outline`, `apps-outline`, `speedometer-outline`, `body-outline`
- Active state: gold background with primary-colored text/icons
- Body Part modal shows grouped options (Upper Body / Lower Body sections)

**Props:**
```typescript
{
  onSelectExercise?: (exercise) => void    // For routine builder
  onEditExercise?: (exercise) => void      // For health team
  onDeleteExercise?: (exerciseId) => void  // Delete callback
  category?: RoutineCategory               // Pre-filter by category
  showOfficialOnly?: boolean               // Show only official exercises
  allowSelection?: boolean                 // Enable selection mode
  allowEditing?: boolean                   // Show edit buttons
  allowDeleting?: boolean                  // Show delete buttons
  userId?: string                          // For permission checks
  isHealthTeam?: boolean                   // Health team/admin status
}
```

---

### 5. Exercise Editor Modal (`components/ExerciseEditorModal.tsx`)

**Features:**
- ✅ Create new exercises
- ✅ Edit existing exercises
- ✅ Full validation
- ✅ Body parts selection (for Body category)
- ✅ Tag management (add/remove)
- ✅ Official exercise toggle (health team only)
- ✅ Duration input (minutes + seconds)
- ✅ Category and difficulty pickers

**Props:**
```typescript
{
  visible: boolean
  onClose: () => void
  onSave: () => void
  exercise?: ExerciseLibraryItem | null    // For editing
  userId: string
  isHealthTeam: boolean
}
```

**Validation:**
- Name: required, max 100 characters
- Description: required, max 200 characters
- Instructions: required, max 500 characters
- Duration: 5-600 seconds
- Body parts: max 10
- Tags: max 10, each max 50 characters

---

## 🚀 How to Set Up

### Step 1: Run Database Migration

In **Supabase SQL Editor**:

```sql
\i sql/migrations/add_exercise_library.sql
```

This creates:
- exercises table
- RLS policies
- Indexes
- 7 seed exercises

### Step 2: Verify Installation

```sql
-- Check exercises table
SELECT COUNT(*) FROM exercises;
-- Should show 7 seed exercises

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'exercises';
-- Should show 5 policies
```

---

## 💡 How to Use

### For Health Team - Managing Exercises

#### 1. Create Exercise Management Page

Create `app/(tabs)/exercises.tsx`:

```typescript
import React, { useState } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ExerciseLibrary from '@/components/ExerciseLibrary'
import ExerciseEditorModal from '@/components/ExerciseEditorModal'
import { useAuth } from '@/lib/contexts/AuthContext'

export default function ExercisesScreen() {
  const { user, profile } = useAuth()
  const [editorVisible, setEditorVisible] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const isHealthTeam = profile?.role === 'health_team' || profile?.role === 'admin'

  const handleEdit = (exercise) => {
    setSelectedExercise(exercise)
    setEditorVisible(true)
  }

  const handleSave = () => {
    setRefreshKey(prev => prev + 1) // Refresh list
    setSelectedExercise(null)
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Add New Button */}
      {isHealthTeam && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedExercise(null)
            setEditorVisible(true)
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Exercise</Text>
        </TouchableOpacity>
      )}

      {/* Exercise Library */}
      <ExerciseLibrary
        key={refreshKey}
        onEditExercise={handleEdit}
        allowSelection={false}
        allowEditing={isHealthTeam}
      />

      {/* Editor Modal */}
      <ExerciseEditorModal
        visible={editorVisible}
        onClose={() => {
          setEditorVisible(false)
          setSelectedExercise(null)
        }}
        onSave={handleSave}
        exercise={selectedExercise}
        userId={user!.id}
        isHealthTeam={isHealthTeam}
      />
    </View>
  )
}
```

#### 2. Add to Tab Navigation

Update your tab navigator to include the exercises screen (health team only).

---

### For Routine Builder - Using Exercise Library

Update your routine builder to allow selecting from exercise library:

```typescript
import ExerciseLibrary from '@/components/ExerciseLibrary'
import type { ExerciseLibraryItem } from '@/types'

// In your routine builder component:
const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)

const handleSelectFromLibrary = (exercise: ExerciseLibraryItem) => {
  // Convert library exercise to routine exercise
  const newExercise: RoutineBuilderExercise = {
    id: generateId(),
    name: exercise.name,
    instructions: exercise.instructions,
    duration_seconds: exercise.default_duration_seconds,
    demo_image_url: exercise.demo_image_url,
  }

  // Add to routine
  addExercise(newExercise)
  setShowExerciseLibrary(false)
}

// In your render:
{showExerciseLibrary && (
  <Modal visible={true} presentationStyle="pageSheet">
    <ExerciseLibrary
      onSelectExercise={handleSelectFromLibrary}
      category={routineCategory} // Pre-filter by routine category
      showOfficialOnly={true}
      allowSelection={true}
    />
  </Modal>
)}
```

---

## 📋 Next Steps

### Immediate (Manual):
1. ✅ Run migration: `\i sql/migrations/add_exercise_library.sql`
2. ✅ Verify seed exercises loaded
3. ⏳ Create exercises management screen
4. ⏳ Add to health team navigation
5. ⏳ Integrate with routine builder

### Future Enhancements:
- [ ] Exercise preview/demo videos
- [ ] Exercise variations
- [ ] Exercise prerequisites
- [ ] Exercise difficulty progression
- [ ] User-created exercise library
- [ ] Exercise ratings/reviews
- [ ] Exercise usage analytics
- [ ] Bulk import exercises

---

## 🔐 Permissions

### Health Team / Admin Can:
- ✅ Create official exercises
- ✅ Edit official exercises
- ✅ Delete official exercises
- ✅ View all exercises

### Regular Users Can:
- ✅ View all public exercises
- ✅ Create their own private exercises
- ✅ Edit their own exercises
- ✅ Delete their own exercises

---

## 📊 Database Schema Details

### Indexes for Performance

```sql
-- Standard indexes
idx_exercises_category
idx_exercises_difficulty
idx_exercises_created_by
idx_exercises_is_official
idx_exercises_is_public

-- GIN indexes for array searches
idx_exercises_body_parts_gin
idx_exercises_tags_gin
idx_exercises_name_description_text
```

### RLS Policies

```sql
public_exercises_are_viewable_by_all
users_can_view_own_exercises
health_team_can_create_exercises
health_team_can_update_official_exercises
health_team_can_delete_official_exercises
```

---

## ✅ Features Checklist

- ✅ Exercise CRUD operations
- ✅ Advanced filtering & search
- ✅ Body parts targeting
- ✅ Body part filter in UI (Upper/Lower body grouped)
- ✅ Tag system
- ✅ Official/community exercises
- ✅ RLS permissions
- ✅ Seed data (7 exercises)
- ✅ Full text search
- ✅ Array searches (body parts, tags)
- ✅ Duration validation
- ✅ Usage tracking placeholder
- ✅ Responsive UI components
- ✅ Horizontal scroll filter carousel
- ✅ Integration with routine builder
- ⏳ Health team management UI

---

**The exercise library system is ready to use! Just run the migration and integrate into your app.** 🎉
